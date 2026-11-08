import { BOT_ELEMENT } from '../../common/constants';
import { isRecord } from '../../common/helpers';
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
import { getDetectionReport } from '../../detection/detection';
import { BotDetectionReport } from '../../detection/models';
import { buildDetectionOptions } from '../../detection/options';
import { applyListOverride, getTweetAction } from '../../detection/visibility';
import { createBotElement } from '../../detection/visuals';
import {
  loadReactPropsBridge,
  reactBridge,
  requestReactProps,
} from '../../react/bridge';
import { ReactPropsResponse } from '../../react/models';
import { Post } from '../../social-media/models';
import { convertTweetToGenericPost, isTwitterTweet } from './converters';

// one timeline cell per tweet; post data and reports are keyed by this element
const TWEET_CELL_SELECTOR = 'div[data-testid="cellInnerDiv"]';

export class TwitterScanner extends SocialMediaScanner {
  override readonly domains = ['*://x.com/*', '*://*.x.com/*'];

  constructor(settings: Settings) {
    super(settings);

    this.settings = settings;
  }

  override scanPost = (post: Post, element: HTMLElement) => {
    let rawReport = this.reportCache.get(post);
    if (!rawReport) {
      rawReport = getDetectionReport(
        post,
        buildDetectionOptions(
          this.settings,
          this.duplicateTracker.record(post),
          this.linkExpander.links
        )
      );
      if (rawReport) this.reportCache.set(post, rawReport);
    }
    if (!rawReport) {
      if (this.settings.debug)
        console.warn(
          `${LOG_PREFIX} No detection report available for tweet: skipping.`
        );
      return;
    }

    const listStatus = getListStatus(post.user?.username, this.settings);
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
    this.reportByElement.set(element, sortedReport);

    const action = getTweetAction(sortedReport, this.settings, listStatus);
    if (action !== 'none' && sortedReport.isBot) {
      element.setAttribute(BOT_ATTRIBUTE, 'true');
    }
    if (action === 'hide') this.hideTweet(element);
    else if (action === 'badge') this.modifyTweet(element, post, sortedReport);
  };

  override scan = () => {
    if (!this.settings.enabled) return;

    const tweets = Array.from(
      document.querySelectorAll<HTMLDivElement>(TWEET_CELL_SELECTOR)
    );

    const loads: Promise<unknown>[] = [];
    for (const tweet of tweets) {
      if (this.isModified(tweet)) continue;

      const known = this.postDataByElement.get(tweet);
      if (known) {
        this.scanPost(known, tweet);
        continue;
      }

      // data arrives later (possibly out of order), and is handled for exactly this element
      loads.push(
        this.loadPost(tweet).then((post) => {
          // settings or the page may have changed while waiting
          if (post && this.settings.enabled && !this.isModified(tweet)) {
            this.scanPost(post, tweet);
          }
        })
      );
    }

    // profile links come from post data, so wait until it has arrived
    void Promise.all(loads).then(() => this.expandProfileLinks());
  };

  /**
   * Fetches and converts a tweet element's data, remembering it for later scans.
   * @returns The post, or undefined if none is available yet; a later scan will ask again.
   */
  private async loadPost(tweet: HTMLElement): Promise<Post | undefined> {
    const response = await requestReactProps(reactBridge, tweet);
    if (!response) {
      if (this.settings.debug)
        console.warn(`${LOG_PREFIX} No React props response for a tweet.`);
      return undefined;
    }

    const post = this.getPostDataFromReactResponse(response);
    if (!post) return undefined; // e.g. a "Show more" cell, or not rendered yet

    if (this.settings.debug)
      console.log(`${LOG_PREFIX} Received post data for ${response.id}:`, post);
    this.postDataByElement.set(tweet, post);
    return post;
  }

  /**
   * True when the element already has a badge or is hidden, so it shouldn't be modified again.
   */
  private isModified(tweet: HTMLElement): boolean {
    return (
      tweet.querySelector(BOT_ELEMENT) !== null ||
      tweet.hasAttribute(HIDDEN_ATTRIBUTE)
    );
  }

  /**
   * Throws away every cached report and post, and scans the page from scratch.
   * Triggered by the "rescan" keyboard command (see manifest.json `commands`), relayed by the background script.
   */
  override rescan = () => {
    if (this.settings.debug)
      console.log(`${LOG_PREFIX} Manual scan triggered.`);
    this.reportCache.clear();
    this.duplicateTracker.clear();
    this.postDataByElement = new WeakMap();
    this.clear();
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

    if (this.settings.debug)
      console.log(`${LOG_PREFIX} Cleared all bot elements.`);
  };

  override initializeListeners = () => {
    // injects the page script, listens for its responses, and scans once it's ready
    loadReactPropsBridge(reactBridge, this.scan);
  };

  private expandProfileLinks(): void {
    const urls = Array.from(
      document.querySelectorAll<HTMLElement>(TWEET_CELL_SELECTOR)
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
