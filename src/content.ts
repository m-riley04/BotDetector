import { isRecord } from './common/helpers';
import { parseReactPropsResponse } from './common/parsing';
import { BOT_DETECTOR_CLOSE_OVERLAY } from './detection/constants';
import type { Tweet } from './twitter/models';
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
import {
  DEFAULT_DETECTION_REPORT_OPTIONS,
  getDetectionReport,
} from './detection/detection';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  sanitizeSettings,
  type Settings,
} from './common/settings';
import { ReactPropsResponse } from './react/models';
import { getTweetAction } from './detection/visibility';

const HIDDEN_ATTRIBUTE = 'data-botdetector-hidden';

// Temporary storage for the latest tweet data received from the React props bridge
// TODO: this is bad imo. Fix it.
let temp: Tweet | undefined;

// The props bridge only answers once per tweet element, so remember each element's data
const tweetDataByElement = new WeakMap<HTMLElement, Tweet>();

// User settings from the popup; kept in sync via storage change events
let settings: Settings = DEFAULT_SETTINGS;

function getTweetDataFromReactResponse(
  reactProps: ReactPropsResponse,
  targetComponentName: string = 'b' // the 'b' component seems to contain the tweet props
): Tweet | undefined {
  const componentProps = reactProps.props.components?.find(
    (component) => component.name === targetComponentName
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
  console.log(`[BotDetector] Modifying tweet with report:`, report);

  tweetElement.insertBefore(
    createBotElement(report, tweetData),
    tweetElement.firstChild
  );
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

/**
 * Scans all tweets on the page and applies bot detection modifications.
 * basically a "step" event
 */
function scanTweets(): void {
  if (!settings.enabled) return;

  const tweets = Array.from(document.querySelectorAll('article')).filter(
    (tweet) => tweet.getAttribute('data-testid') === 'tweet'
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
    const report: BotDetectionReport | undefined = getDetectionReport(
      tweetData,
      {
        ...DEFAULT_DETECTION_REPORT_OPTIONS,
        isBotThreshold: settings.threshold,
      }
    );
    if (!tweetData || !report) {
      console.warn(
        `[BotDetector] No detection report available for tweet: skipping.`
      );
      return;
    }

    const action = getTweetAction(report, settings);
    if (action === 'hide') hideTweet(tweet);
    else if (action === 'badge') modifyTweet(tweet, tweetData, report);
  });
}

function clearTweets(): void {
  const botElements = Array.from(document.querySelectorAll(BOT_ELEMENT));
  botElements.forEach((el) => el.remove());
  showHiddenTweets();

  temp = undefined;

  reactBridge.clearAddedTags();

  console.log('[BotDetector] Cleared all bot elements.');
}

// re-apply the badges whenever the popup changes a setting
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(SETTINGS_KEY in changes)) return;

  settings = sanitizeSettings(changes[SETTINGS_KEY].newValue);
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
