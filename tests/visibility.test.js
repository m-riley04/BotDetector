import { getTweetAction } from '../src/detection/visibility';

const settings = (overrides = {}) => ({
  enabled: true,
  threshold: 0.75,
  onlyShowLikelyBotsBadges: false,
  hideLikelyBots: false,
  ...overrides,
});

const bot = { isBot: true };
const human = { isBot: false };

test('by default every analyzed tweet gets a badge', () => {
  expect(getTweetAction(bot, settings())).toBe('badge');
  expect(getTweetAction(human, settings())).toBe('badge');
});

test('hideLikelyBots hides likely bots and never hides other tweets', () => {
  const s = settings({ hideLikelyBots: true });
  expect(getTweetAction(bot, s)).toBe('hide');
  expect(getTweetAction(human, s)).toBe('badge');
});

test('onlyShowLikelyBotsBadges skips non-bots but keeps them visible', () => {
  const s = settings({ onlyShowLikelyBotsBadges: true });
  expect(getTweetAction(bot, s)).toBe('badge');
  expect(getTweetAction(human, s)).toBe('none');
});

test('combining both options hides bots and leaves everything else untouched', () => {
  const s = settings({ onlyShowLikelyBotsBadges: true, hideLikelyBots: true });
  expect(getTweetAction(bot, s)).toBe('hide');
  expect(getTweetAction(human, s)).toBe('none');
});

test('a disabled extension never changes a tweet', () => {
  const s = settings({
    enabled: false,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  expect(getTweetAction(bot, s)).toBe('none');
  expect(getTweetAction(human, s)).toBe('none');
});
