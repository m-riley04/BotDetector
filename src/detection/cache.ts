import type { Tweet } from '../adapters/twitter/models';
import type { BotDetectionReport } from './models';

const DEFAULT_MAX_ENTRIES = 2000;

/**
 * Remembers reports so a post that stays on screen isn't re-scored on every scan.
 * Entries are keyed by author and post, because some checks look at the post itself.
 * Clear it whenever anything that affects scoring (settings) changes.
 */
export class ReportCache {
  private readonly reports = new Map<string, BotDetectionReport>();

  constructor(private readonly maxEntries = DEFAULT_MAX_ENTRIES) {}

  private static key(tweet: Tweet): string | undefined {
    const userId = tweet.user?.id_str;
    const tweetId = tweet.id_str;
    if (typeof userId !== 'string' || typeof tweetId !== 'string') {
      return undefined;
    }
    return `${userId}:${tweetId}`;
  }

  get(tweet: Tweet): BotDetectionReport | undefined {
    const key = ReportCache.key(tweet);
    return key === undefined ? undefined : this.reports.get(key);
  }

  set(tweet: Tweet, report: BotDetectionReport): void {
    const key = ReportCache.key(tweet);
    if (key === undefined) return;

    this.reports.delete(key);
    this.reports.set(key, report);
    if (this.reports.size > this.maxEntries) {
      const oldest = this.reports.keys().next().value;
      if (oldest !== undefined) this.reports.delete(oldest);
    }
  }

  get size(): number {
    return this.reports.size;
  }

  clear(): void {
    this.reports.clear();
  }
}
