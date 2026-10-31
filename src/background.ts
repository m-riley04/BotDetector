import { tcoLinkResolver } from './adapters/twitter/links';
import { isString } from './common/helpers';
import {
  isExpandLinksRequest,
  type ExpandedLinks,
  type LinkResolver,
} from './common/links';
import type { ContentRequest } from './common/messages';

// Add resolvers for other shorteners here.
// TODO: add more resolvers
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

// Keyboard shortcuts from manifest.json `commands`. Users can rebind them in about:addons → ⚙ → Manage Extension Shortcuts.
browser.commands.onCommand.addListener((command) => {
  if (command !== 'rescan') return;

  void (async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id === undefined) return;

    const request: ContentRequest = { type: 'rescan' };
    try {
      await browser.tabs.sendMessage(tab.id, request);
    } catch {
      // no content script in this tab (e.g. not on x.com), so there's nothing to rescan
    }
  })();
});
