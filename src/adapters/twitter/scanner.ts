import { BOT_ELEMENT } from '../../common/constants';
import { isRecord, isString } from '../../common/helpers';
import { parseReactPropsResponse } from '../../common/parsing';
import {
  BOT_ATTRIBUTE,
  HIDDEN_ATTRIBUTE,
  REVEALED_ATTRIBUTE,
  SocialMediaScanner,
} from '../../common/scanner';
import {
  applyListAction,
  getListStatus,
  ListAction,
  loadSettings,
  saveSettings,
  Settings,
} from '../../common/settings';
import { LOG_PREFIX } from '../../constants';
import { ReportCache } from '../../detection/cache';
import { getDetectionReport } from '../../detection/detection';
import { DuplicateTextTracker } from '../../detection/duplicates';
import { LinkExpander } from '../../detection/linkExpander';
import { BotDetectionReport } from '../../detection/models';
import { buildDetectionOptions } from '../../detection/options';
import { applyListOverride, getTweetAction } from '../../detection/visibility';
import { createBotElement } from '../../detection/visuals';
import {
  loadReactPropsBridge,
  reactBridge,
  requestReactProps,
} from '../../react/bridge';
import {
  REACT_ID_ATTRIBUTE,
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
} from '../../react/constants';
import { ReactPropsResponse } from '../../react/models';
import { Post } from '../../social-media/models';
import { tcoLinkResolver } from '../twitter/links';
import { convertTweetToGenericPost, isTwitterTweet } from './converters';

export class TwitterScanner extends SocialMediaScanner {
  override readonly domains = ['*://x.com/*', '*://*.x.com/*'];

  private reportCache = new ReportCache();
  private duplicateTracker = new DuplicateTextTracker();
  private linkExpander = new LinkExpander(
    (request) => browser.runtime.sendMessage(request),
    tcoLinkResolver
  );
  private reportByElement = new WeakMap<HTMLElement, BotDetectionReport>();

  // The props bridge only answers once per tweet element, so remember each element's data
  private postDataByElement = new WeakMap<HTMLElement, Post>();

  // Temporary storage for the latest tweet data received from the React props bridge
  // TODO: this is bad imo. Fix it.
  // it works today because `dispatchEvent` runs synchronously.
  private temp: Post | undefined;

  constructor(settings: Settings) {
    super(settings);

    this.settings = settings;
  }

  override scan = () => {
    if (!this.settings.enabled) return;

    const tweets = Array.from(
      document.querySelectorAll<HTMLDivElement>(
        'div[data-testid="cellInnerDiv"]'
      )
    );

    tweets.forEach((tweet) => {
      // the response is dispatched synchronously, so `temp` is this tweet's data (if it was requested)
      this.temp = undefined;
      requestReactProps(
        reactBridge,
        tweet,
        REACT_ID_ATTRIBUTE,
        REACT_PROPS_REQUEST
      );
      if (this.temp) this.postDataByElement.set(tweet, this.temp);

      // don't modify an already-modified tweet element
      if (
        tweet.querySelector(BOT_ELEMENT) ||
        tweet.hasAttribute(HIDDEN_ATTRIBUTE)
      )
        return;

      const postData = this.postDataByElement.get(tweet);
      if (!postData) {
        if (this.settings.debug)
          console.warn(
            `${LOG_PREFIX} No detection report cached for tweet: skipping.`
          );
        return;
      }

      let rawReport = this.reportCache.get(postData);
      if (!rawReport) {
        rawReport = getDetectionReport(
          postData,
          buildDetectionOptions(
            this.settings,
            this.duplicateTracker.record(postData),
            this.linkExpander.links
          )
        );
        if (rawReport) this.reportCache.set(postData, rawReport);
      }
      if (!rawReport) {
        if (this.settings.debug)
          console.warn(
            `${LOG_PREFIX} No detection report available for tweet: skipping.`
          );
        return;
      }

      const listStatus = getListStatus(postData.user?.username, this.settings);
      const report = applyListOverride(rawReport, listStatus);
      const sortedReport: BotDetectionReport = { ...report };

      sortedReport.checks.sort((a, b) => {
        // sort by trigger first-and-foremost
        if (a.triggered !== b.triggered) {
          return a.triggered ? -1 : 1;
        }

        // then within triggered checks, sort by weight
        if (a.weight !== b.weight) return a.weight > b.weight ? -1 : 1;
        return 0;
      });
      this.reportByElement.set(tweet, sortedReport);

      const action = getTweetAction(sortedReport, this.settings, listStatus);
      if (action !== 'none' && sortedReport.isBot) {
        tweet.setAttribute(BOT_ATTRIBUTE, 'true');
      }
      if (action === 'hide') this.hideTweet(tweet);
      else if (action === 'badge')
        this.modifyTweet(tweet, postData, sortedReport);
    });

    this.expandProfileLinks();
  };

  /**
   * Throws away every cached report and scans the page from scratch.
   * Triggered by the "rescan" keyboard command (see manifest.json `commands`), relayed by the background script.
   */
  override rescan = () => {
    if (this.settings.debug)
      console.log(`${LOG_PREFIX} Manual scan triggered.`);
    this.reportCache.clear();
    this.duplicateTracker.clear();
    this.clear();
    this.temp = undefined;
    this.scan();
  };

  override clear = () => {
    const botElements = Array.from(document.querySelectorAll(BOT_ELEMENT));
    botElements.forEach((el) => el.remove());
    this.showHiddenTweets();
    document
      .querySelectorAll(`[${BOT_ATTRIBUTE}], [${REVEALED_ATTRIBUTE}]`)
      .forEach((el) => {
        el.removeAttribute(BOT_ATTRIBUTE);
        el.removeAttribute(REVEALED_ATTRIBUTE);
      });

    this.temp = undefined;

    reactBridge.clearAddedTags();

    if (this.settings.debug)
      console.log(`${LOG_PREFIX} Cleared all bot elements.`);
  };

  override initializeListeners = () => {
    // init bridge
    loadReactPropsBridge(reactBridge, this.scan);

    // Listener for the react props responses from the injected script
    window.addEventListener(REACT_PROPS_RESPONSE, this.onReactPropsResponse);
  };

  private onReactPropsResponse = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (!isString(detail)) return;

    try {
      const response = parseReactPropsResponse(JSON.parse(detail) as unknown);
      if (!response) {
        // TODO: make a dedicated logger
        if (this.settings.debug)
          console.error(
            `${LOG_PREFIX} Received an invalid React props response.`
          );
        return;
      }

      const tweetProps = this.getPostDataFromReactResponse(response);
      if (!tweetProps) {
        if (this.settings.debug)
          console.warn(`${LOG_PREFIX} No tweet props found for ${response.id}`);
        return;
      }

      if (this.settings.debug)
        console.log(
          `${LOG_PREFIX} Received tweet props for ${response.id}:`,
          tweetProps
        );
      this.temp = tweetProps;
    } catch (error) {
      if (this.settings.debug)
        console.error(
          `${LOG_PREFIX} Could not read React props from a tweet.`,
          error
        );
    }
  };

  private expandProfileLinks(): void {
    const urls = Array.from(
      document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')
    )
      .map((tweet) => this.postDataByElement.get(tweet)?.user?.url)
      .filter((url) => this.linkExpander.needs(url));
    if (urls.length === 0) return;

    void this.linkExpander.expand(urls).then((learned) => {
      if (!learned) return;
      this.reportCache.clear();
      this.clear();
      this.scan();
    });
  }

  private getPostDataFromReactResponse(
    reactProps: ReactPropsResponse,
    targetComponentName: string = 'Tweet' // fallback; the name is unstable, so prefer matching on the 'tweet' prop
  ): Post | undefined {
    const components = reactProps.props.components ?? [];
    const componentProps = (
      components.find(
        (component) =>
          isRecord(component.props) && isRecord(component.props.tweet)
      ) ??
      components.find((component) => component.name === targetComponentName)
    )?.props;

    const tweetProps = isRecord(componentProps)
      ? componentProps.tweet
      : undefined;
    if (!isTwitterTweet(tweetProps)) {
      if (this.settings.debug)
        console.warn(`${LOG_PREFIX} No tweet props found for ${reactProps.id}`);
      return;
    }

    if (this.settings.debug)
      console.debug(`${LOG_PREFIX} Tweet props: `, tweetProps);

    return convertTweetToGenericPost(tweetProps);
  }

  private modifyTweet(
    tweetElement: HTMLElement,
    postData: Post,
    report: BotDetectionReport
  ): void {
    const handle = postData.user?.username;

    tweetElement.insertBefore(
      createBotElement(report, postData, {
        listStatus: getListStatus(handle, this.settings),
        onListAction: (action) => this.updateList(handle, action),
      }),
      tweetElement.firstChild
    );
  }

  // storage.onChanged then re-scans with the new lists
  private async updateList(
    handle: string | undefined,
    action: ListAction
  ): Promise<void> {
    if (!handle) return;
    try {
      const current = await loadSettings();
      await saveSettings(applyListAction(current, handle, action));
    } catch (error) {
      if (this.settings.debug)
        console.error(`${LOG_PREFIX} Could not update the lists.`, error);
    }
  }

  // hidden with CSS rather than removed, because React owns these elements
  private hideTweet(tweetElement: HTMLElement): void {
    tweetElement.style.display = 'none';
    tweetElement.setAttribute(HIDDEN_ATTRIBUTE, 'true');
  }

  private showHiddenTweets(): void {
    document
      .querySelectorAll<HTMLElement>(`[${HIDDEN_ATTRIBUTE}]`)
      .forEach((tweet) => {
        tweet.style.removeProperty('display');
        tweet.removeAttribute(HIDDEN_ATTRIBUTE);
      });
  }

  // shows every hidden post again, with a badge so it's clear why it was hidden
  revealHiddenTweets = () => {
    document
      .querySelectorAll<HTMLElement>(`[${HIDDEN_ATTRIBUTE}]`)
      .forEach((tweet) => {
        tweet.style.removeProperty('display');
        tweet.removeAttribute(HIDDEN_ATTRIBUTE);
        tweet.setAttribute(REVEALED_ATTRIBUTE, 'true');

        const postData = this.postDataByElement.get(tweet);
        const report = this.reportByElement.get(tweet);
        if (postData && report && !tweet.querySelector(BOT_ELEMENT)) {
          this.modifyTweet(tweet, postData, report);
        }
      });
  };
}
