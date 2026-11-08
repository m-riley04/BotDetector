import { isString } from '../common/helpers';
import { parseReactPropsResponse } from '../common/parsing';
import {
  REACT_ID_ATTRIBUTE,
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
} from './constants';
import type { ReactPropsResponse } from './models';

/**
 * How long to wait for the injected script before giving up on a request.
 * Today it answers synchronously, so this only matters if that changes or the page script misbehaves.
 */
const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Talks to the injected page script (inject.ts), which reads React props the content script can't see.
 *
 * Each request tags the element with a fresh id and waits for the response carrying that same id,
 * so responses can arrive late or out of order and still reach the right element.
 */
class ReactBridge {
  private ready = false;

  /**
   * Never reset, so an id still sitting on an old element can't be mistaken for a new request.
   */
  private nextId = 0;

  /**
   * Requests still waiting for an answer, keyed by id.
   * Every entry is removed when it settles (response or timeout), so this can't leak elements.
   */
  private pending = new Map<
    string,
    (response: ReactPropsResponse | undefined) => void
  >();

  /**
   * At most one request per element at a time: a second scan reuses the first request.
   */
  private inFlight = new WeakMap<
    HTMLElement,
    Promise<ReactPropsResponse | undefined>
  >();

  isReady(): boolean {
    return this.ready;
  }

  markReady(): void {
    this.ready = true;
  }

  /**
   * Asks the page script for an element's React props.
   * @returns The response, or undefined if the bridge isn't loaded, the response was invalid, or it timed out.
   *   Nothing is remembered on failure, so the caller can simply ask again on a later scan.
   */
  request(
    element: HTMLElement,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<ReactPropsResponse | undefined> {
    if (!this.ready) return Promise.resolve(undefined);

    const existing = this.inFlight.get(element);
    if (existing) return existing;

    const id = String(++this.nextId);
    const promise = new Promise<ReactPropsResponse | undefined>((resolve) => {
      const timer = setTimeout(() => settle(undefined), timeoutMs);
      const settle = (response: ReactPropsResponse | undefined) => {
        clearTimeout(timer);
        this.pending.delete(id);
        this.inFlight.delete(element);
        resolve(response);
      };
      this.pending.set(id, settle);
    });
    this.inFlight.set(element, promise);

    // register before dispatching: the page script may answer synchronously, inside dispatchEvent
    element.setAttribute(REACT_ID_ATTRIBUTE, id);
    window.dispatchEvent(new CustomEvent(REACT_PROPS_REQUEST, { detail: id }));
    return promise;
  }

  /**
   * Routes a response event from the page script to the request with the same id.
   * Responses for unknown ids (already timed out) are ignored.
   */
  handleResponse = (event: Event): void => {
    const detail = (event as CustomEvent<unknown>).detail;
    if (!isString(detail)) return;

    let response: ReactPropsResponse | undefined;
    try {
      response = parseReactPropsResponse(JSON.parse(detail) as unknown);
    } catch {
      return; // not valid JSON; the request will time out
    }
    if (response) this.pending.get(response.id)?.(response);
  };
}

/**
 * The singleton instance of the ReactBridge class used for managing communication with React components and their props.
 */
export const reactBridge = new ReactBridge();

/**
 * Injects the page script and starts listening for its responses.
 * @param onLoadCallback Runs once the page script is ready to answer requests.
 */
export function loadReactPropsBridge(
  bridge: ReactBridge,
  onLoadCallback?: () => void
): void {
  window.addEventListener(REACT_PROPS_RESPONSE, bridge.handleResponse);

  const script = document.createElement('script');
  script.src = browser.runtime.getURL('src/inject.js');
  script.onload = () => {
    script.remove();
    bridge.markReady();
    if (onLoadCallback) onLoadCallback();
  };
  script.onerror = () => {
    script.remove();
    console.error('Could not load the React props bridge.');
  };
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Requests the React props for a given post element.
 * @returns The response, or undefined if none arrived (see ReactBridge.request).
 */
export function requestReactProps(
  bridge: ReactBridge,
  postElement: HTMLElement
): Promise<ReactPropsResponse | undefined> {
  return bridge.request(postElement);
}
