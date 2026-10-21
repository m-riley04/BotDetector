import { isRecord } from './common/helpers';
import { parseReactPropsResponse } from './common/parsing';
import { BOT_DETECTOR_CLOSE_OVERLAY } from './detection/constants';
import type { Tweet } from './adapters/twitter/models';
import {
  requestReactProps,
  loadReactPropsBridge,
  reactBridge,
} from './react/bridge';
import {
  REACT_ID_ATTRIBUTE,
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
} from './react/constants';
import { BOT_ELEMENT } from './common/constants';
import { createBotElement } from './detection/visuals';
import type { BotDetectionReport } from './detection/models';
import { getDetectionReport } from './detection/detection';
import { buildDetectionOptions } from './detection/options';
import { ReportCache } from './detection/cache';
import { DuplicateTextTracker } from './detection/duplicates';
import { LinkExpander } from './detection/linkExpander';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  applyListAction,
  getListStatus,
  loadSettings,
  sanitizeSettings,
  saveSettings,
  type ListAction,
  type Settings,
} from './common/settings';
import { isContentRequest, type PageStats } from './common/messages';
import { ReactPropsResponse } from './react/models';
import { applyListOverride, getTweetAction } from './detection/visibility';

const HIDDEN_ATTRIBUTE = 'data-botdetector-hidden';
// marks every post flagged as a likely bot, whether it is hidden or badged
const BOT_ATTRIBUTE = 'data-botdetector-bot';
// a hidden post the user chose to reveal; it stays visible with a badge
const REVEALED_ATTRIBUTE = 'data-botdetector-revealed';

const reportCache = new ReportCache();
const duplicateTracker = new DuplicateTextTracker();
const linkExpander = new LinkExpander((request) =>
  browser.runtime.sendMessage(request)
);
const reportByElement = new WeakMap<HTMLElement, BotDetectionReport>();

// Temporary storage for the latest tweet data received from the React props bridge
// TODO: this is bad imo. Fix it.
let temp: Tweet | undefined;

// The props bridge only answers once per tweet element, so remember each element's data
const tweetDataByElement = new WeakMap<HTMLElement, Tweet>();

// User settings from the popup; kept in sync via storage change events
let settings: Settings = DEFAULT_SETTINGS;

function getTweetDataFromReactResponse(
  reactProps: ReactPropsResponse,
  targetComponentName: string = 'Tweet' // fallback; the name is unstable, so prefer matching on the 'tweet' prop
): Tweet | undefined {
  const components = reactProps.props.components ?? [];
  const componentProps = (
    components.find(
      (component) =>
        isRecord(component.props) && isRecord(component.props.tweet)
    ) ?? components.find((component) => component.name === targetComponentName)
  )?.props;

  const tweetProps: Tweet | undefined = isRecord(componentProps)
    ? (componentProps.tweet as Tweet) // TODO: make this safer
    : undefined;
  if (!tweetProps) {
    console.warn(`[BotDetector] No tweet props found for ${reactProps.id}`);
    return;
  }

  return tweetProps;
}

// keyboard presses for manual/quick actions
window.addEventListener('keyup', (e: KeyboardEvent) => {
  // having trouble with this, so just to be safe
  const isEscape = e.key === 'Escape' || e.key === 'Esc';

  if (isEscape) {
    window.dispatchEvent(new CustomEvent(BOT_DETECTOR_CLOSE_OVERLAY));
  }

  if (e.key === 'r') {
    console.log('[BotDetector] Manual scan triggered.');
    reportCache.clear();
    duplicateTracker.clear();
    clearTweets();
    temp = undefined;
    scanTweets();
  }
});

// Listener for the react props responses from the injected script
window.addEventListener(REACT_PROPS_RESPONSE, (event: Event) => {
  const detail = (event as CustomEvent<string>).detail;
  if (typeof detail !== 'string') return;

  try {
    const response = parseReactPropsResponse(JSON.parse(detail) as unknown);
    if (!response) {
      // TODO: make a dedicated logger
      console.error('[BotDetector] Received an invalid React props response.');
      return;
    }

    const tweetProps = getTweetDataFromReactResponse(response);
    if (!tweetProps) {
      console.warn(`[BotDetector] No tweet props found for ${response.id}`);
      return;
    }

    console.log(
      `[BotDetector] Received tweet props for ${response.id}:`,
      tweetProps
    );
    temp = tweetProps;
  } catch (error) {
    console.error(
      '[BotDetector] Could not read React props from a tweet.',
      error
    );
  }
});

function modifyTweet(
  tweetElement: HTMLElement,
  tweetData: Tweet,
  report: BotDetectionReport
): void {
  const handle = tweetData.user?.screen_name;

  tweetElement.insertBefore(
    createBotElement(report, tweetData, {
      listStatus: getListStatus(handle, settings),
      onListAction: (action) => updateList(handle, action),
    }),
    tweetElement.firstChild
  );
}

// storage.onChanged then re-scans with the new lists
async function updateList(
  handle: string | undefined,
  action: ListAction
): Promise<void> {
  if (!handle) return;
  try {
    const current = await loadSettings();
    await saveSettings(applyListAction(current, handle, action));
  } catch (error) {
    console.error('[BotDetector] Could not update the lists.', error);
  }
}

// hidden with CSS rather than removed, because React owns these elements
function hideTweet(tweetElement: HTMLElement): void {
  tweetElement.style.display = 'none';
  tweetElement.setAttribute(HIDDEN_ATTRIBUTE, 'true');
}

function showHiddenTweets(): void {
  document
    .querySelectorAll<HTMLElement>(`[${HIDDEN_ATTRIBUTE}]`)
    .forEach((tweet) => {
      tweet.style.removeProperty('display');
      tweet.removeAttribute(HIDDEN_ATTRIBUTE);
    });
}

// shows every hidden post again, with a badge so it's clear why it was hidden
function revealHiddenTweets(): void {
  document
    .querySelectorAll<HTMLElement>(`[${HIDDEN_ATTRIBUTE}]`)
    .forEach((tweet) => {
      tweet.style.removeProperty('display');
      tweet.removeAttribute(HIDDEN_ATTRIBUTE);
      tweet.setAttribute(REVEALED_ATTRIBUTE, 'true');

      const tweetData = tweetDataByElement.get(tweet);
      const report = reportByElement.get(tweet);
      if (tweetData && report && !tweet.querySelector(BOT_ELEMENT)) {
        modifyTweet(tweet, tweetData, report);
      }
    });
}

function getStats(): PageStats {
  const count = (selector: string) =>
    document.querySelectorAll(selector).length;
  return {
    hidden: count(`[${HIDDEN_ATTRIBUTE}]`),
    flagged: count(`[${BOT_ATTRIBUTE}]`),
    badges: count(BOT_ELEMENT),
  };
}

// answers the popup's requests
browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isContentRequest(message)) return undefined;
  if (message.type === 'show-hidden') revealHiddenTweets();
  return Promise.resolve(getStats());
});

/**
 * Scans all tweets on the page and applies bot detection modifications.
 * basically a "step" event
 */
function scanTweets(): void {
  if (!settings.enabled) return;

  const tweets = Array.from(document.querySelectorAll('div')).filter(
    (tweet) => tweet.getAttribute('data-testid') === 'cellInnerDiv'
  );

  tweets.forEach((tweet) => {
    // the response is dispatched synchronously, so `temp` is this tweet's data (if it was requested)
    temp = undefined;
    requestReactProps(
      reactBridge,
      tweet,
      REACT_ID_ATTRIBUTE,
      REACT_PROPS_REQUEST
    );
    if (temp) tweetDataByElement.set(tweet, temp);

    // don't modify an already-modified tweet element
    if (
      tweet.querySelector(BOT_ELEMENT) ||
      tweet.hasAttribute(HIDDEN_ATTRIBUTE)
    )
      return;

    const tweetData = tweetDataByElement.get(tweet);
    if (!tweetData) {
      console.warn(
        `[BotDetector] No detection report cached for tweet: skipping.`
      );
      return;
    }

    let rawReport = reportCache.get(tweetData);
    if (!rawReport) {
      rawReport = getDetectionReport(
        tweetData,
        buildDetectionOptions(
          settings,
          duplicateTracker.record(tweetData),
          linkExpander.links
        )
      );
      if (rawReport) reportCache.set(tweetData, rawReport);
    }
    if (!rawReport) {
      console.warn(
        `[BotDetector] No detection report available for tweet: skipping.`
      );
      return;
    }

    const listStatus = getListStatus(tweetData.user?.screen_name, settings);
    const report = applyListOverride(rawReport, listStatus);
    reportByElement.set(tweet, report);

    const action = getTweetAction(report, settings, listStatus);
    if (action !== 'none' && report.isBot) {
      tweet.setAttribute(BOT_ATTRIBUTE, 'true');
    }
    if (action === 'hide') hideTweet(tweet);
    else if (action === 'badge') modifyTweet(tweet, tweetData, report);
  });

  expandProfileLinks();
}

/** Resolves t.co profile links in the background, then rescans so the new destinations count. */
function expandProfileLinks(): void {
  const urls = Array.from(
    document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
  )
    .map((tweet) => tweetDataByElement.get(tweet)?.user?.url)
    .filter((url) => linkExpander.needs(url));
  if (urls.length === 0) return;

  void linkExpander.expand(urls).then((learned) => {
    if (!learned) return;
    reportCache.clear();
    clearTweets();
    scanTweets();
  });
}

function clearTweets(): void {
  const botElements = Array.from(document.querySelectorAll(BOT_ELEMENT));
  botElements.forEach((el) => el.remove());
  showHiddenTweets();
  document
    .querySelectorAll(`[${BOT_ATTRIBUTE}], [${REVEALED_ATTRIBUTE}]`)
    .forEach((el) => {
      el.removeAttribute(BOT_ATTRIBUTE);
      el.removeAttribute(REVEALED_ATTRIBUTE);
    });

  temp = undefined;

  reactBridge.clearAddedTags();

  console.log('[BotDetector] Cleared all bot elements.');
}

// re-apply the badges whenever the popup changes a setting
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(SETTINGS_KEY in changes)) return;

  settings = sanitizeSettings(changes[SETTINGS_KEY].newValue);
  reportCache.clear();
  clearTweets();
  scanTweets();
});

// load the react bridge and start scanning tweets once it's ready
// basically the main runtime loop
loadSettings()
  .then((loaded) => {
    settings = loaded;
  })
  .catch((error) => {
    console.error('[BotDetector] Could not load settings.', error);
  })
  .finally(() => loadReactPropsBridge(reactBridge, scanTweets));
document.addEventListener('scrollend', scanTweets);

export {};
