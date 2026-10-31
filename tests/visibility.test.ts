import type { Settings } from '../src/common/settings';
import type { BotDetectionReport } from '../src/detection/models';
import { applyListOverride, getTweetAction } from '../src/detection/visibility';

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  enabled: true,
  threshold: 0.75,
  onlyShowLikelyBotsBadges: false,
  hideLikelyBots: false,
  allowlist: [],
  blocklist: [],
  disabledChecks: [],
  checkWeights: {},
  scamKeywords: [],
  debug: false,
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

test('blocked accounts are always hidden, even without hideLikelyBots', () => {
  expect(getTweetAction(human, settings(), 'blocked')).toBe('hide');
  expect(getTweetAction(human, settings({ enabled: false }), 'blocked')).toBe(
    'none'
  );
});

test('applyListOverride leaves reports alone without a list match', () => {
  const report = { isBot: false, chance: 0.3, checks: [] } as never;
  expect(applyListOverride(report, 'none')).toBe(report);
});

test('applyListOverride adds an explanatory manual check', () => {
  const base = {
    isBot: true,
    chance: 0.9,
    checks: [],
  } as unknown as BotDetectionReport;

  const allowed = applyListOverride(base, 'allowed');
  expect(allowed.isBot).toBe(false);
  expect(allowed.chance).toBe(0);
  expect(allowed.checks.at(-1)?.id).toBe('manual-allowlist');
  expect(allowed.checks.at(-1)?.contribution).toBe(-1);

  const blocked = applyListOverride(
    { ...base, isBot: false, chance: 0 },
    'blocked'
  );
  expect(blocked.isBot).toBe(true);
  expect(blocked.chance).toBe(1);
  expect(blocked.checks.at(-1)?.id).toBe('manual-blocklist');
  expect(base.checks).toHaveLength(0);
});
