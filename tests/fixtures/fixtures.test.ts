import { files, loadFixture, scoreFixture } from './fixtures-helpers';

test('the fixture corpus has both bots and humans', () => {
  expect(files.some((name) => name.startsWith('bot-'))).toBe(true);
  expect(files.some((name) => name.startsWith('human-'))).toBe(true);
  expect(files.every((name) => /^(bot|human)-.+\.json$/.test(name))).toBe(true);
});

describe.each(files)('%s', (name) => {
  const { expectedChecks } = loadFixture(name);
  // scored in beforeAll rather than at collection time, so a scoring error fails a test instead of the whole file
  let report: ReturnType<typeof scoreFixture>;
  beforeAll(() => {
    report = scoreFixture(name);
  });

  if (name.startsWith('bot-')) {
    // Fixtures may list the obvious signals that must fire instead of reaching the threshold.
    if (expectedChecks) {
      test.each(expectedChecks)('triggers %s', (id) => {
        expect(report.checks.find((c) => c.id === id)?.triggered).toBe(true);
      });
    } else {
      test('is flagged as a bot', () => {
        expect(report.isBot).toBe(true);
      });
    }
  } else {
    test('is not flagged as a bot', () => {
      expect(report.isBot).toBe(false);
    });
  }
});
