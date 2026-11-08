import { tcoLinkResolver } from '../adapters/twitter/links';
import { ReportCache } from '../detection/cache';
import { DuplicateTextTracker } from '../detection/duplicates';
import { LinkExpander } from '../detection/linkExpander';
import { BotDetectionReport } from '../detection/models';
import { Post } from '../social-media/models';
import { BOT_ELEMENT } from './constants';
import { PageStats } from './messages';
import { Settings } from './settings';

export const HIDDEN_ATTRIBUTE = 'data-botdetector-hidden';
// marks every post flagged as a likely bot, whether it is hidden or badged
export const BOT_ATTRIBUTE = 'data-botdetector-bot';
// a hidden post the user chose to reveal; it stays visible with a badge
export const REVEALED_ATTRIBUTE = 'data-botdetector-revealed';

export abstract class SocialMediaScanner {
  abstract readonly domains: string[];
  protected settings: Settings;
  protected reportCache = new ReportCache();
  protected duplicateTracker = new DuplicateTextTracker();
  protected linkExpander = new LinkExpander(
    (request) => browser.runtime.sendMessage(request),
    tcoLinkResolver
  );

  /**
   * Map between the real DOM element and the report for it
   */
  protected reportByElement = new WeakMap<HTMLElement, BotDetectionReport>();

  /**
   * Map between the real root DOM element and the post data it contained
   */
  protected postDataByElement = new WeakMap<HTMLElement, Post>();

  constructor(settings: Settings) {
    this.settings = settings;
  }

  abstract scan: () => void;

  abstract scanPost: (post: Post, element: HTMLElement) => void;

  abstract rescan: () => void;

  abstract clear: () => void;

  abstract initializeListeners: () => void;

  abstract revealHiddenTweets: () => void;

  setSettings(settings: Settings): void {
    this.settings = settings;
  }

  getStats(): PageStats {
    const count = (selector: string) =>
      document.querySelectorAll(selector).length;
    return {
      hidden: count(`[${HIDDEN_ATTRIBUTE}]`),
      flagged: count(`[${BOT_ATTRIBUTE}]`),
      badges: count(BOT_ELEMENT),
    };
  }
}
