import type { Settings } from '../src/common/settings';
import type { BotDetectionReport } from '../src/detection/models';
import { getTweetAction } from '../src/detection/visibility';

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  enabled: true,
  threshold: 0.75,
  onlyShowLikelyBotsBadges: false,
  hideLikelyBots: false,
  ...overrides,
});

// getTweetAction only reads isBot
const bot = { isBot: true } as BotDetectionReport;
const human = { isBot: false } as BotDetectionReport;

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
