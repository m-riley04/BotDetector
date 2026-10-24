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
    ...settings.DEFAULT_SETTINGS,
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
    ...settings.DEFAULT_SETTINGS,
    enabled: false,
    threshold: 7,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });

  expect(store[settings.SETTINGS_KEY]).toStrictEqual({
    ...settings.DEFAULT_SETTINGS,
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
  expect(await settings.loadSettings()).toStrictEqual({
    ...settings.DEFAULT_SETTINGS,
    enabled: false,
    threshold: 1,
    onlyShowLikelyBotsBadges: true,
    hideLikelyBots: true,
  });
});

test('normalizeHandle accepts valid handles and rejects the rest', () => {
  expect(settings.normalizeUserHandle('@Some_User')).toBe('some_user');
  expect(settings.normalizeUserHandle('  abc123 ')).toBe('abc123');
  for (const bad of ['', '@', 'has space', 'toolonghandle_123456', 'a-b', 5]) {
    expect(settings.normalizeUserHandle(bad)).toBe(undefined);
  }
});

test('lists are normalized, deduplicated and exclusive', () => {
  const result = settings.sanitizeSettings({
    allowlist: ['@Alice', 'alice', 'bob', 'nope!', 7],
    blocklist: ['bob', 'carol'],
  });
  expect(result.allowlist).toStrictEqual(['alice']);
  expect(result.blocklist).toStrictEqual(['bob', 'carol']);
});

test('check overrides are sanitized and weights are clamped', () => {
  const result = settings.sanitizeSettings({
    disabledChecks: ['blueCheck', 'blueCheck', 'bad key!', 3],
    checkWeights: { blueCheck: 5, noBanner: -9, newAccount: 'x', 'bad key': 1 },
    scamKeywords: [' Free Money ', '', 'x'.repeat(80), 'free money'],
  });
  expect(result.disabledChecks).toStrictEqual(['blueCheck']);
  expect(result.checkWeights).toStrictEqual({ blueCheck: 1, noBanner: -1 });
  expect(result.scamKeywords).toStrictEqual(['free money']);
});

test('parseHandleList and parseKeywordList split typed text', () => {
  expect(settings.parseHandleList('@a, b\nc  @A bad!')).toStrictEqual([
    'a',
    'b',
    'c',
  ]);
  expect(
    settings.parseKeywordList('Free Money\nclick here, DM me')
  ).toStrictEqual(['free money', 'click here', 'dm me']);
});

test('getListStatus and applyListAction move handles between lists', () => {
  let s = settings.DEFAULT_SETTINGS;
  expect(settings.getListStatus('Alice', s)).toBe('none');
  expect(settings.getListStatus(undefined, s)).toBe('none');

  s = settings.applyListAction(s, '@Alice', 'allow');
  expect(settings.getListStatus('Alice', s)).toBe('allowed');

  s = settings.applyListAction(s, 'alice', 'block');
  expect(settings.getListStatus('alice', s)).toBe('blocked');
  expect(s.allowlist).toStrictEqual([]);

  s = settings.applyListAction(s, 'alice', 'clear');
  expect(settings.getListStatus('alice', s)).toBe('none');

  expect(settings.applyListAction(s, 'not valid!', 'block')).toBe(s);
});

test('exportSettings and parseImportedSettings round-trip', () => {
  const original = settings.sanitizeSettings({
    threshold: 0.5,
    allowlist: ['a'],
    disabledChecks: ['noBanner'],
  });
  expect(
    settings.parseImportedSettings(settings.exportSettings(original))
  ).toStrictEqual(original);

  for (const bad of ['', 'nope', '[]', 'null', '5']) {
    expect(settings.parseImportedSettings(bad)).toBe(undefined);
  }
  expect(settings.parseImportedSettings('{"threshold":9}')?.threshold).toBe(1);
});
