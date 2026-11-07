import { RedditComment } from './models';

export function getRedditComments(): RedditComment[] {
  return [...document.querySelectorAll('shreddit-comment')].map((c) => ({
    id: c.getAttribute('thingid') ?? '',
    author: c.getAttribute('author') ?? '',
    authorId:
      c.querySelector('shreddit-overflow-menu')?.getAttribute('author-id') ??
      '',
    parent: c.getAttribute('parentid') ?? '',
    depth: +(c.getAttribute('depth') ?? 0),
    score: +(c.getAttribute('score') ?? 0),
    created: c.getAttribute('created') ?? '',
    body: c
      .querySelector(`#${c.getAttribute('thingid')}-comment-rtjson-content`)
      ?.textContent.trim(),
  }));
}
