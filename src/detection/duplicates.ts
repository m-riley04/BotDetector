import type { Tweet } from '../twitter/models';
import { getTweetText } from './signals';

const MIN_LENGTH = 20;
const MAX_TRACKED_TEXTS = 5000;

/** Lowercases and strips links, leading reply mentions and extra whitespace. */
export function normalizeTweetText(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^(?:\s*@\w+)+/, '')
    .replace(/\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remembers the text of every post seen so copy-pasted spam can be recognised.
 */
export class DuplicateTextTracker {
  private readonly idsByText = new Map<string, Set<string>>();

  /**
   * Records a post and returns how many distinct posts share its text.
   * Recording the same post again doesn't change the count. Short texts are never duplicates.
   */
  record(tweet: Tweet): number {
    const text = normalizeTweetText(getTweetText(tweet));
    if (text.length < MIN_LENGTH) return 1;

    const id = typeof tweet.id_str === 'string' ? tweet.id_str : undefined;
    if (id === undefined) return 1;

    if (this.idsByText.size >= MAX_TRACKED_TEXTS && !this.idsByText.has(text)) {
      this.idsByText.clear();
    }

    let ids = this.idsByText.get(text);
    if (!ids) {
      ids = new Set();
      this.idsByText.set(text, ids);
    }
    ids.add(id);
    return ids.size;
  }

  clear(): void {
    this.idsByText.clear();
  }
}
