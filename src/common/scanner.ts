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

  constructor(settings: Settings) {
    this.settings = settings;
  }

  abstract scan: () => void;

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
