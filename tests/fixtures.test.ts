import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord } from '../src/common/helpers';
import {
  DEFAULT_DETECTION_REPORT_OPTIONS,
  getDetectionReport,
} from '../src/detection/detection';
import {
  convertTweetToGenericPost,
  isTwitterTweet,
} from '../src/adapters/twitter/converters';
import { Post } from '../src/social-media/models';

// Raw post objects in the same format as the "Copy post JSON" button.
// To add a real example, paste the copied JSON into tests/fixtures/bot-*.json or human-*.json.
const directory = join(__dirname, 'fixtures');
const files = readdirSync(directory).filter((name) => name.endsWith('.json'));

const fixedNow = Date.parse('2026-10-18T22:00:00.000Z');

interface Fixture {
  post: Post;
  expandedLinks: Record<string, string>;
  expectedChecks?: string[];
}

function loadFixture(name: string): Fixture {
  const raw: unknown = JSON.parse(readFileSync(join(directory, name), 'utf8'));
  if (!isTwitterTweet(raw)) {
    throw new Error(`invalid Twitter post fixture: ${name}`);
  }

  const post = convertTweetToGenericPost(raw);
  if (!post) throw new Error(`could not convert Twitter post fixture: ${name}`);

  return {
    post,
    expandedLinks: isRecord(raw._expanded_links)
      ? Object.fromEntries(
          Object.entries(raw._expanded_links).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        )
      : {},
    expectedChecks: Array.isArray(raw._expect_checks)
      ? raw._expect_checks.filter(
          (check): check is string => typeof check === 'string'
        )
      : undefined,
  };
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
  const { expectedChecks } = loadFixture(name);

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
