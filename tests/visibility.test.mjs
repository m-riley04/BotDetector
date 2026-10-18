import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { test } from 'node:test';

const { outputFiles } = await build({
  entryPoints: ['src/detection/visibility.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const { getTweetAction } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);

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
  assert.equal(getTweetAction(bot, settings()), 'badge');
  assert.equal(getTweetAction(human, settings()), 'badge');
});

test('hideLikelyBots hides likely bots and never hides other tweets', () => {
  const s = settings({ hideLikelyBots: true });
  assert.equal(getTweetAction(bot, s), 'hide');
  assert.equal(getTweetAction(human, s), 'badge');
});

test('onlyShowLikelyBotsBadges skips non-bots but keeps them visible', () => {
  const s = settings({ onlyShowLikelyBotsBadges: true });
  assert.equal(getTweetAction(bot, s), 'badge');
  assert.equal(getTweetAction(human, s), 'none');
});

test('combining both options hides bots and leaves everything else untouched', () => {
  const s = settings({ onlyShowLikelyBotsBadges: true, hideLikelyBots: true });
  assert.equal(getTweetAction(bot, s), 'hide');
  assert.equal(getTweetAction(human, s), 'none');
});

test('a disabled extension never changes a tweet', () => {
  const s = settings({
    enabled: false,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  assert.equal(getTweetAction(bot, s), 'none');
  assert.equal(getTweetAction(human, s), 'none');
});
