import * as settings from '../src/common/settings';

function installStorage(initial: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initial };
  const storage = {
    local: {
      get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
      set: async (values: Record<string, unknown>) => {
        Object.assign(store, values);
      },
    },
  };
  (globalThis as unknown as { browser: unknown }).browser = { storage };
  return store;
}

afterEach(() => {
  delete (globalThis as { browser?: unknown }).browser;
});

test('sanitizeSettings falls back to defaults for missing or invalid data', () => {
  for (const value of [undefined, null, 'nope', 42, [], {}]) {
    expect(settings.sanitizeSettings(value)).toStrictEqual(
      settings.DEFAULT_SETTINGS
    );
  }

  expect(
    settings.sanitizeSettings({
      enabled: 'yes',
      threshold: 'high',
      onlyShowLikelyBotsBadges: 1,
      hideLikelyBots: 1,
    })
  ).toStrictEqual(settings.DEFAULT_SETTINGS);
  expect(settings.sanitizeSettings({ threshold: Number.NaN }).threshold).toBe(
    settings.DEFAULT_SETTINGS.threshold
  );
});

test('sanitizeSettings keeps valid values and clamps the threshold', () => {
  expect(
    settings.sanitizeSettings({
      enabled: false,
      threshold: 0.4,
      onlyShowLikelyBotsBadges: true,
      hideLikelyBots: true,
    })
  ).toStrictEqual({
    enabled: false,
    threshold: 0.4,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  expect(settings.sanitizeSettings({ threshold: 0 }).threshold).toBe(0.1);
  expect(settings.sanitizeSettings({ threshold: 5 }).threshold).toBe(1);
});

test('loadSettings returns defaults when nothing is stored', async () => {
  installStorage();
  expect(await settings.loadSettings()).toStrictEqual(
    settings.DEFAULT_SETTINGS
  );
});

test('saveSettings persists sanitized settings that loadSettings reads back', async () => {
  const store = installStorage();
  await settings.saveSettings({
    enabled: false,
    threshold: 7,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });

  expect(store[settings.SETTINGS_KEY]).toStrictEqual({
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  expect(await settings.loadSettings()).toStrictEqual({
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
});
