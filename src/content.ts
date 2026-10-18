import { isRecord } from './common/helpers';
import { parseReactPropsResponse } from './common/parsing';
import type { Tweet } from './twitter/models';
import {
  requestReactProps,
  loadReactPropsBridge,
  reactBridge,
} from './react/bridge';
import {
  REACT_ID_ATTRIBUTE,
  REACT_PROPS_REQUEST,
  REACT_PROPS_RESPONSE,
} from './react/constants';
import { BOT_ELEMENT } from './common/constants';
import { createBotElement } from './detection/visuals';
import type { BotDetectionReport } from './detection/models';
import { getDetectionReport } from './detection/detection';
import { ReactPropsResponse } from './react/models';

// Temporary storage for the latest tweet data received from the React props bridge
// TODO: this is bad imo. Fix it.
let temp: Tweet | undefined;

function getTweetDataFromReactResponse(
  reactProps: ReactPropsResponse
): Tweet | undefined {
  // the 'b' component seems to contain the tweet props
  const componentProps = reactProps.props.components?.find(
    (component) => component.name === 'b'
  )?.props;
  const tweetProps: Tweet | undefined = isRecord(componentProps)
    ? (componentProps.tweet as Tweet) // TODO: make this safer
    : undefined;
  if (!tweetProps) {
    console.warn(`[BotDetector] No tweet props found for ${reactProps.id}`);
    return;
  }

  return tweetProps;
}

// Listener for the react props responses from the injected script
window.addEventListener(REACT_PROPS_RESPONSE, (event: Event) => {
  const detail = (event as CustomEvent<string>).detail;
  if (typeof detail !== 'string') return;

  try {
    const response = parseReactPropsResponse(JSON.parse(detail) as unknown);
    if (!response) {
      // TODO: make a dedicated logger
      console.error('[BotDetector] Received an invalid React props response.');
      return;
    }

    const tweetProps = getTweetDataFromReactResponse(response);
    if (!tweetProps) {
      console.warn(`[BotDetector] No tweet props found for ${response.id}`);
      return;
    }

    console.log(
      `[BotDetector] Received tweet props for ${response.id}:`,
      tweetProps
    );
    temp = tweetProps;
  } catch (error) {
    console.error(
      '[BotDetector] Could not read React props from a tweet.',
      error
    );
  }
});

function modifyTweet(
  tweetElement: HTMLElement,
  tweetData: Tweet | undefined
): void {
  // don't modify an already-modified tweet element
  if (tweetElement.querySelector(BOT_ELEMENT)) return;

  const report: BotDetectionReport | undefined = getDetectionReport(tweetData);
  if (!report) {
    console.warn(
      `[BotDetector] No detection report available for tweet: skipping.`
    );
    return;
  }

  console.log(`[BotDetector] Modifying tweet with report:`, report);

  tweetElement.insertBefore(createBotElement(report), tweetElement.firstChild);
}

/**
 * Scans all tweets on the page and applies bot detection modifications.
 * basically a "step" event
 */
function scanTweets(): void {
  const tweets = Array.from(document.querySelectorAll('article')).filter(
    (tweet) => tweet.getAttribute('data-testid') === 'tweet'
  );

  tweets.forEach((tweet) => {
    // get the tweet data
    requestReactProps(
      reactBridge,
      tweet,
      REACT_ID_ATTRIBUTE,
      REACT_PROPS_REQUEST
    );
    modifyTweet(tweet, temp);
  });
}

// load the react bridge and start scanning tweets once it's ready
// basically the main runtime loop
loadReactPropsBridge(reactBridge, scanTweets);
document.addEventListener('scrollend', scanTweets);

export {};
