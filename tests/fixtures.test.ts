import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_DETECTION_REPORT_OPTIONS,
  getDetectionReport,
} from '../src/detection/detection';
import { Post } from '../src/social-media/models';

// Raw post objects in the same format as the "Copy post JSON" button.
// To add a real example, paste the copied JSON into tests/fixtures/bot-*.json or human-*.json.
const directory = join(__dirname, 'fixtures');
const files = readdirSync(directory).filter((name) => name.endsWith('.json'));

const fixedNow = Date.parse('2026-10-18T22:00:00.000Z');

interface Fixture {
  post: Post;
  expandedLinks: Record<string, string>;
}

function loadFixture(name: string): Fixture {
  const raw = JSON.parse(
    readFileSync(join(directory, name), 'utf8')
  ) as Post & {
    _expanded_links?: Record<string, string>;
  };
  return { post: raw, expandedLinks: raw._expanded_links ?? {} };
}

function scoreFixture(name: string) {
  const { post, expandedLinks } = loadFixture(name);
  const originalNow = Date.now;
  Date.now = () => fixedNow;
  try {
    const report = getDetectionReport(post, {
      ...DEFAULT_DETECTION_REPORT_OPTIONS,
      expandedLinks,
    });
    if (!report) throw new Error(`no report for ${name}`);
    return report;
  } finally {
    Date.now = originalNow;
  }
}

test('the fixture corpus has both bots and humans', () => {
  expect(files.some((name) => name.startsWith('bot-'))).toBe(true);
  expect(files.some((name) => name.startsWith('human-'))).toBe(true);
  expect(files.every((name) => /^(bot|human)-.+\.json$/.test(name))).toBe(true);
});

describe.each(files)('%s', (name) => {
  const report = scoreFixture(name);
  const expected = loadFixture(name).post as unknown as {
    _expect_checks?: string[];
  };

  if (name.startsWith('bot-')) {
    // Fixtures may list the obvious signals that must fire instead of reaching the threshold.
    if (expected._expect_checks) {
      test.each(expected._expect_checks)('triggers %s', (id) => {
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
