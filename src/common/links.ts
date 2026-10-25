import { isNonNullObject, isString } from './helpers';

/**
 * Request sent from the content script to the background script.
 */
export interface ExpandLinksRequest {
  type: 'expand-links';
  urls: string[];
}

/**
 * Maps each shortened link to its destination. Links that couldn't be expanded are left out.
 */
export type ExpandedLinks = Record<string, string>;

export function isUrl(value: unknown) {
  // NOTE: i moved this inside to make the function pure and allow for it to be a predicate. TODO: should i move this?
  const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
  return isString(value) && URL_PATTERN.test(value);
}

export function isExpandLinksRequest(
  value: unknown
): value is ExpandLinksRequest {
  if (!isNonNullObject(value)) return false;
  const { type, urls } = value as { type?: unknown; urls?: unknown };
  return type === 'expand-links' && Array.isArray(urls);
}

/**
 * Returns the href of an http(s) URL, or undefined for anything else.
 * @param rejectHost Hostname that is not an acceptable destination (the shortener itself).
 */
export function toWebUrl(
  value: string | undefined,
  rejectHost?: string
): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (rejectHost && url.hostname === rejectHost) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export type FetchLike = (
  url: string,
  init: {
    redirect: 'manual';
    credentials: 'omit';
    signal?: AbortSignal;
  }
) => Promise<{ ok: boolean; text(): Promise<string> }>;

export interface ExpandUrlsOptions {
  maxLinksPerRequest?: number;
}

/**
 * Knows how to recognise and expand the links of one link shortener.
 * Subclasses only say which links they own and how to read the destination from the response.
 */
export abstract class LinkResolver {
  /**
   * True if this resolver owns the link.
   */
  abstract matches(value: unknown): value is string;

  /**
   * Reads the destination out of the page served for a shortened link.
   */
  abstract parse(html: string): string | undefined;

  /**
   * Looks up one link. Cookies are not sent and redirects are not followed,
   * so only the shortener itself is contacted.
   */
  async expand(
    url: string,
    fetchFn: FetchLike,
    timeoutMs = 5000
  ): Promise<string | undefined> {
    if (!this.matches(url)) return undefined;
    try {
      const response = await fetchFn(url, {
        redirect: 'manual',
        credentials: 'omit',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) return undefined;
      return this.parse(await response.text());
    } catch {
      return undefined;
    }
  }

  /**
   * Expands several links at once, ignoring anything this resolver doesn't own.
   */
  async expandAll(
    urls: unknown[],
    fetchFn: FetchLike,
    options: ExpandUrlsOptions = { maxLinksPerRequest: 20 }
  ): Promise<ExpandedLinks> {
    const unique = [...new Set(urls.filter((url) => this.matches(url)))].slice(
      0,
      options.maxLinksPerRequest
    ) as string[];
    const result: ExpandedLinks = {};
    await Promise.all(
      unique.map(async (url) => {
        const destination = await this.expand(url, fetchFn);
        if (destination) result[url] = destination;
      })
    );
    return result;
  }
}
