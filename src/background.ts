import { isString } from './common/helpers';
import { tcoLinkResolver } from './adapters/twitter/links';
import {
  isExpandLinksRequest,
  type ExpandedLinks,
  type LinkResolver,
} from './common/links';

// Add resolvers for other shorteners here.
const resolvers: LinkResolver[] = [tcoLinkResolver];

// The background page is the only place that can read the shorteners (see host_permissions).
const cache = new Map<string, string | null>();

interface RememberOptions {
  maxCacheEntries?: number;
}

function remember(
  url: string,
  destination: string | null,
  options: RememberOptions = {
    maxCacheEntries: 1000,
  }
): void {
  if (cache.size >= (options?.maxCacheEntries ?? 0)) cache.clear();
  cache.set(url, destination);
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isExpandLinksRequest(message)) return undefined;

  return (async (): Promise<ExpandedLinks> => {
    const wanted = [
      ...new Set(
        message.urls.filter((url): url is string =>
          resolvers.some((resolver) => resolver.matches(url))
        )
      ),
    ];
    const result: ExpandedLinks = {};
    const missing: string[] = [];

    for (const url of wanted) {
      const cached = cache.get(url);
      if (isString(cached)) result[url] = cached;
      else if (cached === undefined) missing.push(url);
    }

    const fetched: ExpandedLinks = {};
    for (const resolver of resolvers) {
      Object.assign(
        fetched,
        await resolver.expandAll(missing, (url, init) => fetch(url, init))
      );
    }
    for (const url of missing) remember(url, fetched[url] ?? null);
    return { ...result, ...fetched };
  })();
});
