import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  isTwitterTweet,
  convertTweetToGenericPost,
} from '../../src/adapters/twitter/converters';
import { isRecord } from '../../src/common/helpers';
import {
  getDetectionReport,
  DEFAULT_DETECTION_REPORT_OPTIONS,
} from '../../src/detection/detection';
import { Post } from '../../src/social-media/models';

export interface Fixture {
  post: Post;
  expandedLinks: Record<string, string>;
  expectedChecks?: string[];
}

// Raw post objects in the same format as the "Copy post JSON" button.
// To add a real example, paste the copied JSON into tests/fixtures/twitter/bot-*.json or human-*.json.
export const directory = join(__dirname, 'twitter'); // TODO: make this dynamic
export const files = readdirSync(directory).filter((name) =>
  name.endsWith('.json')
);

const fixedNow = Date.parse('2026-10-18T22:00:00.000Z');

export function loadFixture(name: string): Fixture {
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

export function scoreFixture(name: string) {
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
