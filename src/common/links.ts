import { isNonNullObject, isString } from './helpers';

/**
 * Request sent from the content script to the background script.
 */
export interface ExpandLinksRequest {
  type: 'expand-links';
  urls: string[];
}

/**
 * Maps each t.co link to its destination. Links that couldn't be expanded are left out.
 */
export type ExpandedLinks = Record<string, string>;

export const MAX_LINKS_PER_REQUEST = 20;

const TCO_PATTERN = /^https:\/\/t\.co\/[A-Za-z0-9]{6,20}$/;

// TODO: abstract this out to not be twitter-specific
export function isTcoUrl(value: unknown): value is string {
  return isString(value) && TCO_PATTERN.test(value);
}

export function isExpandLinksRequest(
  value: unknown
): value is ExpandLinksRequest {
  if (!isNonNullObject(value)) return false;
  const { type, urls } = value as { type?: unknown; urls?: unknown };
  return type === 'expand-links' && Array.isArray(urls);
}

function toWebUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.hostname === 't.co') return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/**
 * Reads the destination out of the page t.co serves to browsers, which names it in a
 * meta refresh, a <title> and a script. Nothing at the destination is ever contacted.
 */
export function parseTcoPage(html: string): string | undefined {
  const metaRefresh = /http-equiv=["']?refresh["']?[^>]*?url=([^"'>\s]+)/i.exec(
    html
  )?.[1];
  const replaced = /location\.replace\(["']([^"']+)["']\)/i
    .exec(html)?.[1]
    ?.replace(/\\\//g, '/');
  const title = /<title>([^<]+)<\/title>/i.exec(html)?.[1];

  for (const candidate of [metaRefresh, replaced, title]) {
    const url = toWebUrl(candidate?.replace(/&amp;/g, '&'));
    if (url) return url;
  }
  return undefined;
}

type FetchLike = (
  url: string,
  init: {
    redirect: 'manual';
    credentials: 'omit';
    signal?: AbortSignal;
  }
) => Promise<{ ok: boolean; text(): Promise<string> }>;

/**
 * Looks up one t.co link. Cookies are not sent and redirects are not followed,
 * so only t.co itself is contacted.
 */
export async function expandTcoUrl(
  url: string,
  fetchFn: FetchLike,
  timeoutMs = 5000
): Promise<string | undefined> {
  if (!isTcoUrl(url)) return undefined;
  try {
    const response = await fetchFn(url, {
      redirect: 'manual',
      credentials: 'omit',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return undefined;
    return parseTcoPage(await response.text());
  } catch {
    return undefined;
  }
}

/**
 * Expands several links at once, ignoring anything that isn't a t.co link.
 */
export async function expandTcoUrls(
  urls: unknown[],
  fetchFn: FetchLike
): Promise<ExpandedLinks> {
  const unique = [...new Set(urls.filter(isTcoUrl))].slice(
    0,
    MAX_LINKS_PER_REQUEST
  );
  const result: ExpandedLinks = {};
  await Promise.all(
    unique.map(async (url) => {
      const destination = await expandTcoUrl(url, fetchFn);
      if (destination) result[url] = destination;
    })
  );
  return result;
}
