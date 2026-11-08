import { isString } from './common/helpers';
import {
  REACT_ID_ATTRIBUTE,
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
} from './react/constants';
import { getReactData } from './react/react-serlializer';

// injects a listener into the context of the site to gather React props for tweets
// they contain a LOT of the data that I would otherwise need to get from scraping manually. Thanks Twitter for your React site <3
window.addEventListener(REACT_PROPS_REQUEST, (event: Event) => {
  const id = (event as CustomEvent<unknown>).detail;
  if (!isString(id) || !/^\d+$/.test(id)) return;

  const respond = (props: unknown) =>
    window.dispatchEvent(
      new CustomEvent(REACT_PROPS_RESPONSE, {
        detail: JSON.stringify({ id, props }),
      })
    );

  const tagged = document.querySelector<HTMLElement>(
    `[${REACT_ID_ATTRIBUTE}="${id}"]`
  );

  // the tagged element is the timeline cell; the tweet fiber chain starts at the article inside it
  // TODO: abstract this out to posts, not just tweets
  const tweet =
    tagged?.tagName === 'ARTICLE'
      ? tagged
      : tagged?.querySelector<HTMLElement>('article');

  // always answer, even with nothing, so the content script doesn't wait for its timeout.
  // (e.g. the cell's article hasn't rendered yet; the next scan will ask again)
  respond(tweet ? getReactData(tweet, 'tweet') : {});
});

export {};
