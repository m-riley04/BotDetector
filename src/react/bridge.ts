import { REACT_ID_ATTRIBUTE, REACT_PROPS_REQUEST } from './constants';

// region state variables
export let reactBridgeReady = false;
export let nextReactId = 0;
const requestedReactProps = new WeakSet<HTMLElement>();

/**
 * Loads the React props bridge by injecting a script into the document.
 * This function injects a script into the document to enable communication with React components and retrieve their props.
 * @param onLoadCallback The callback function to be executed once the React props bridge is loaded.
 */
export function loadReactPropsBridge(onLoadCallback?: () => void): void {
  const script = document.createElement('script');
  script.src = browser.runtime.getURL('src/inject.js');
  script.onload = () => {
    script.remove();
    reactBridgeReady = true;
    if (onLoadCallback) onLoadCallback();
  };
  script.onerror = () => {
    script.remove();
    console.error('Could not load the React props bridge.');
  };
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Requests the React props for a given tweet element.
 * @param tweetElement The tweet element for which to request React props.
 * @returns Nothing. This sends the (synchronous) dispatch event.
 */
export function requestReactProps(tweetElement: HTMLElement): void {
  if (!reactBridgeReady || requestedReactProps.has(tweetElement)) return;

  const id = String(++nextReactId);
  tweetElement.setAttribute(REACT_ID_ATTRIBUTE, id);
  requestedReactProps.add(tweetElement);

  window.dispatchEvent(new CustomEvent(REACT_PROPS_REQUEST, { detail: id }));
}
