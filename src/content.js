const BOT_ELEMENT = 'div-botdetector';

function getColorFromChance(chance) {
  if (chance >= 0.9) {
    return 'red';
  } else if (chance >= 0.5) {
    return 'yellow';
  }

  return 'green';
}

/**
 * @param {number} chance The chance of a bot as a number from 0-1
 * @returns {HTMLDivElement}
 */
function createBotElement(chance) {
  const bg = document.createElement(BOT_ELEMENT);
  const t = document.createElement('p');

  t.textContent = `Bot Chance: ${chance * 100}%`;
  t.style.mixBlendMode = 'difference';
  t.style.lineHeight = '0';

  bg.append(t);

  bg.style.backgroundColor = getColorFromChance(chance);
  bg.style.color = 'white';
  bg.style.position = 'fixed';
  bg.style.top = '0';
  bg.style.right = '0';
  bg.style.padding = '5px';
  bg.style.zIndex = '1000';

  return bg;
}

/**
 * Determines the percentage chance that a Tweet was written by a bot.
 * Right now, it's mainly based on the content of the Tweet itself rather than background checking.
 * @param {HTMLElement} tweet
 * @returns Value between 0-1
 */
function determineBotPercentageChance(tweet) {
  let score = 0.0;

  // blue checks aren't worth anything anymore
  const checkmark = tweet.querySelector('[data-testid="icon-verified"]');
  if (checkmark) score += 0.5;

  // TODO: consider making this reverse (assume all people are bots and have score decrease with lack of evidence)
  return score;
}

/**
 *
 * @param {HTMLElement} tweetElement
 * @returns {void}
 */
function modifyTweet(tweetElement) {
  if (tweetElement.querySelector(BOT_ELEMENT)) return;

  const chance = determineBotPercentageChance(tweetElement);

  //tweetElement.style.border = '2px solid red';
  tweetElement.insertBefore(createBotElement(chance), tweetElement.firstChild);
}

/**
 * Basically a "step" event.
 * @returns {void}
 */
function scanTweets() {
  // find all tweet elements
  const tweets = [...document.querySelectorAll('article')].filter((tweet) => {
    const testid = tweet.getAttribute('data-testid');
    return testid === 'tweet';
  });

  // check/apply each tweet
  tweets.forEach((tweet) => modifyTweet(tweet));
}

// Main "runtime" loop.
// I know this mean it loads a lot. Whatever.
// TODO: maybe find a better way to detect when tweets load.
document.addEventListener('scrollend', () => {
  scanTweets();
});
