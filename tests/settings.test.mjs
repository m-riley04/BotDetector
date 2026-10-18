import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { afterEach, test } from 'node:test';

const { outputFiles } = await build({
  entryPoints: ['src/common/settings.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
});
const settings = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`
);

function installStorage(initial = {}) {
  const store = { ...initial };
  globalThis.browser = {
    storage: {
      local: {
        get: async (key) => (key in store ? { [key]: store[key] } : {}),
        set: async (values) => Object.assign(store, values),
      },
    },
  };
  return store;
}

afterEach(() => {
  delete globalThis.browser;
});

test('sanitizeSettings falls back to defaults for missing or invalid data', () => {
  for (const value of [undefined, null, 'nope', 42, [], {}]) {
    assert.deepEqual(
      settings.sanitizeSettings(value),
      settings.DEFAULT_SETTINGS
    );
  }

  assert.deepEqual(
    settings.sanitizeSettings({
      enabled: 'yes',
      threshold: 'high',
      onlyShowLikelyBotsBadges: 1,
      hideLikelyBots: 1,
    }),
    settings.DEFAULT_SETTINGS
  );
  assert.equal(
    settings.sanitizeSettings({ threshold: Number.NaN }).threshold,
    settings.DEFAULT_SETTINGS.threshold
  );
});

test('sanitizeSettings keeps valid values and clamps the threshold', () => {
  assert.deepEqual(
    settings.sanitizeSettings({
      enabled: false,
      threshold: 0.4,
      onlyShowLikelyBotsBadges: true,
      hideLikelyBots: true,
    }),
    {
      enabled: false,
      threshold: 0.4,
      onlyShowLikelyBotsBadges: true,
      hideLikelyBots: true,
    }
  );
  assert.equal(settings.sanitizeSettings({ threshold: 0 }).threshold, 0.1);
  assert.equal(settings.sanitizeSettings({ threshold: 5 }).threshold, 1);
});

test('loadSettings returns defaults when nothing is stored', async () => {
  installStorage();
  assert.deepEqual(await settings.loadSettings(), settings.DEFAULT_SETTINGS);
});

test('saveSettings persists sanitized settings that loadSettings reads back', async () => {
  const store = installStorage();
  await settings.saveSettings({
    enabled: false,
    threshold: 7,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });

  assert.deepEqual(store[settings.SETTINGS_KEY], {
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  assert.deepEqual(await settings.loadSettings(), {
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
});
