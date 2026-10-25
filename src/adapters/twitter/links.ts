import { isString } from '../../common/helpers';
import { LinkResolver, toWebUrl } from '../../common/links';

const TCO_PATTERN = /^https:\/\/t\.co\/[A-Za-z0-9]{6,20}$/;

export function isTcoUrl(value: unknown): value is string {
  return isString(value) && TCO_PATTERN.test(value);
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
    const url = toWebUrl(candidate?.replace(/&amp;/g, '&'), 't.co');
    if (url) return url;
  }
  return undefined;
}

/**
 * Expands Twitter/X t.co links.
 */
export class TcoLinkResolver extends LinkResolver {
  matches(value: unknown): value is string {
    return isTcoUrl(value);
  }

  parse(html: string): string | undefined {
    return parseTcoPage(html);
  }
}

export const tcoLinkResolver = new TcoLinkResolver();
