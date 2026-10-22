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

export type ContentRequest = { type: 'get-stats' } | { type: 'show-hidden' };

export function isContentRequest(value: unknown): value is ContentRequest {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return type === 'get-stats' || type === 'show-hidden';
}
