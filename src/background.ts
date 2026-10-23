import { isString } from './common/helpers';
import {
  expandTcoUrls,
  isExpandLinksRequest,
  isTcoUrl,
  type ExpandedLinks,
} from './common/links';

// The background page is the only place that can read t.co (see host_permissions).
const MAX_CACHED = 1000;
const cache = new Map<string, string | null>();

function remember(url: string, destination: string | null): void {
  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(url, destination);
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isExpandLinksRequest(message)) return undefined;

  return (async (): Promise<ExpandedLinks> => {
    const wanted = [...new Set(message.urls.filter(isTcoUrl))];
    const result: ExpandedLinks = {};
    const missing: string[] = [];

    for (const url of wanted) {
      const cached = cache.get(url);
      if (isString(cached)) result[url] = cached;
      else if (cached === undefined) missing.push(url);
    }

    const fetched = await expandTcoUrls(missing, (url, init) =>
      fetch(url, init)
    );
    for (const url of missing) remember(url, fetched[url] ?? null);
    return { ...result, ...fetched };
  })();
});
