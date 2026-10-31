import { isNonNullObject } from './helpers';

/**
 * Counts shown in the popup for the page the user is looking at.
 */
export interface PageStats {
  /**
   * Posts currently hidden.
   */
  hidden: number;

  /**
   * Posts marked as likely bots, whether hidden or badged.
   */
  flagged: number;

  /**
   * Posts currently showing a badge.
   */
  badges: number;
}

/**
 * Messages the content script answers. Every one replies with the current {@link PageStats}.
 */
export type ContentRequest =
  { type: 'get-stats' } | { type: 'show-hidden' } | { type: 'rescan' };

const CONTENT_REQUEST_TYPES: ReadonlySet<unknown> = new Set<
  ContentRequest['type']
>(['get-stats', 'show-hidden', 'rescan']);

export function isContentRequest(value: unknown): value is ContentRequest {
  if (!isNonNullObject(value)) return false;
  return CONTENT_REQUEST_TYPES.has((value as { type?: unknown }).type);
}
