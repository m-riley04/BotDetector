import { isString } from '../common/helpers';
import type { Post } from '../social-media/models';

interface RecordPostOptions {
  minLength: number;
  maxTrackedChecks: number;
}

const DEFAULT_RECORD_POST_OPTIONS: RecordPostOptions = {
  minLength: 20,
  maxTrackedChecks: 5000,
};

/**
 * Lowercases and strips links, leading reply mentions and extra whitespace.
 */
export function normalizePostText(text: string | undefined): string {
  return (text ?? '')
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
  record(
    post: Post,
    options: RecordPostOptions = DEFAULT_RECORD_POST_OPTIONS
  ): number {
    const text = normalizePostText(post.content.text);
    if (text.length < options.minLength) return 1;

    const id = isString(post.id) ? post.id : undefined;
    if (id === undefined) return 1;

    if (
      this.idsByText.size >= options.maxTrackedChecks &&
      !this.idsByText.has(text)
    ) {
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
