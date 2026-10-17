import { getReactData } from './react/serialization';
import {
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
  REACT_ID_ATTRIBUTE,
} from './react/constants';

// injects a listener into the context of the site to gather React props for tweets
// they contain a LOT of the data that I would otherwise need to get from scraping manually. Thanks Twitter for your React site <3
window.addEventListener(REACT_PROPS_REQUEST, (event: Event) => {
  const id = (event as CustomEvent<unknown>).detail;
  if (typeof id !== 'string' || !/^\d+$/.test(id)) return;

  const tweet = document.querySelector<HTMLElement>(
    `article[${REACT_ID_ATTRIBUTE}="${id}"]`
  );
  if (!tweet) return;

  const props = getReactData(tweet);
  window.dispatchEvent(
    new CustomEvent(REACT_PROPS_RESPONSE, {
      detail: JSON.stringify({ id, props }),
    })
  );
});

export {};
