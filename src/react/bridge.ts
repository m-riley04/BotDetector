/**
 * ReactBridge class for managing communication with React components and their props.
 */
class ReactBridge {
  private reactBridgeReady = false;
  private nextReactId = 0;
  private requestedReactProps = new WeakSet<HTMLElement>();

  public isReady(): boolean {
    return this.reactBridgeReady;
  }

  public markReady(): void {
    this.reactBridgeReady = true;
  }

  public getNextReactId(): string {
    return String(++this.nextReactId);
  }

  public hasRequestedProps(postElement: HTMLElement): boolean {
    return this.requestedReactProps.has(postElement);
  }

  public markRequested(postElement: HTMLElement): void {
    this.requestedReactProps.add(postElement);
  }

  public clearAddedTags(): void {
    this.requestedReactProps = new WeakSet<HTMLElement>();
    this.nextReactId = 0;
  }
}

/**
 * The singleton instance of the ReactBridge class used for managing communication with React components and their props.
 */
export const reactBridge = new ReactBridge();

/**
 * Loads the React props bridge by injecting a script into the document.
 * This function injects a script into the document to enable communication with React components and retrieve their props.
 * @param onLoadCallback The callback function to be executed once the React props bridge is loaded.
 */
export function loadReactPropsBridge(
  bridge: ReactBridge,
  onLoadCallback?: () => void
): void {
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
 * @param postElement The post element for which to request React props.
 * @returns Nothing. This sends the (synchronous) dispatch event.
 */
export function requestReactProps(
  bridge: ReactBridge,
  postElement: HTMLElement,
  reactIdAttribute: string,
  reactPropsRequestId: string
): void {
  if (!bridge.isReady() || bridge.hasRequestedProps(postElement)) return;

  const id = bridge.getNextReactId();
  postElement.setAttribute(reactIdAttribute, id);
  bridge.markRequested(postElement);

  window.dispatchEvent(new CustomEvent(reactPropsRequestId, { detail: id }));
}
