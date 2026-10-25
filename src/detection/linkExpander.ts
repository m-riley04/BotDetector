import { isNonNullObject, isString } from '../common/helpers';
import {
  type ExpandLinksRequest,
  type ExpandedLinks,
  type LinkResolver,
} from '../common/links';

type Send = (request: ExpandLinksRequest) => Promise<unknown>;

/**
 * Content-script side of the shortened-link expander. Each link is only requested once, and
 * `links` keeps growing as answers arrive so the detector can read it directly.
 */
export class LinkExpander {
  readonly links: ExpandedLinks = {};
  private readonly attempted = new Set<string>();

  constructor(
    private readonly send: Send,
    private readonly resolver: LinkResolver
  ) {}

  /**
   * True if the link still needs to be requested.
   */
  needs(url: unknown): url is string {
    return this.resolver.matches(url) && !this.attempted.has(url);
  }

  /**
   * Requests the links that haven't been tried yet.
   * @returns True if at least one new destination was learned.
   */
  async expand(urls: unknown[]): Promise<boolean> {
    const pending = [...new Set(urls.filter((url) => this.needs(url)))];
    if (pending.length === 0) return false;
    for (const url of pending) this.attempted.add(url as string);

    let answer: unknown;
    try {
      answer = await this.send({
        type: 'expand-links',
        urls: pending as string[],
      });
    } catch {
      return false;
    }
    if (!isNonNullObject(answer)) return false;

    let learned = false;
    for (const [url, destination] of Object.entries(answer)) {
      if (
        pending.includes(url) &&
        isString(destination) &&
        destination.length > 0
      ) {
        this.links[url] = destination;
        learned = true;
      }
    }
    return learned;
  }
}
