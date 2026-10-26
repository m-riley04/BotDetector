import { isContentRequest } from '../src/common/messages';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/common/settings';
import { ReportCache } from '../src/detection/cache';
import * as detection from '../src/detection/detection';
import {
  DuplicateTextTracker,
  normalizePostText,
} from '../src/detection/duplicates';
import type { BotDetectionReport } from '../src/detection/models';
import { buildDetectionOptions } from '../src/detection/options';
import type { Post } from '../src/social-media/models';

const post = (id: string, text = '', userId = 'u1'): Post =>
  ({
    id,
    content: {
      text,
    },
    user: { id: userId },
  }) as unknown as Post;

const report = (chance: number) => ({ chance }) as BotDetectionReport;

describe('buildDetectionOptions', () => {
  test('uses default weights and the user threshold', () => {
    const options = buildDetectionOptions({
      ...DEFAULT_SETTINGS,
      threshold: 0.5,
    });
    expect(options.weights).toStrictEqual(detection.DEFAULT_WEIGHTS);
    expect(options.isBotThreshold).toBe(0.5);
    expect(options.duplicateTextCount).toBe(1);
  });

  test('applies disabled checks and weight overrides', () => {
    const options = buildDetectionOptions(
      sanitizeSettings({
        disabledChecks: ['blueCheck'],
        checkWeights: { noBanner: 0.5, blueCheck: 0.9 },
      }),
      3
    );
    expect(options.weights.blueCheck).toBe(0);
    expect(options.weights.noBanner).toBe(0.5);
    expect(options.weights.noDescription).toBe(
      detection.DEFAULT_WEIGHTS.noDescription
    );
    expect(options.duplicateTextCount).toBe(3);
  });

  test('merges custom scam keywords with the defaults', () => {
    const options = buildDetectionOptions(
      sanitizeSettings({ scamKeywords: ['my custom word'] })
    );
    expect(options.scamKeywords).toContain('airdrop');
    expect(options.scamKeywords).toContain('my custom word');
  });

  test('does not mutate the shared default weights', () => {
    buildDetectionOptions(sanitizeSettings({ disabledChecks: ['blueCheck'] }));
    expect(detection.DEFAULT_WEIGHTS.blueCheck).toBe(0.4);
  });
});

describe('DuplicateTextTracker', () => {
  const text = 'Check out this amazing opportunity today!';

  test('counts distinct posts sharing the same text', () => {
    const tracker = new DuplicateTextTracker();
    expect(tracker.record(post('1', text))).toBe(1);
    expect(tracker.record(post('2', text.toUpperCase()))).toBe(2);
    expect(tracker.record(post('3', `@a ${text} https://t.co/x`))).toBe(3);
  });

  test('recording the same post again does not inflate the count', () => {
    const tracker = new DuplicateTextTracker();
    tracker.record(post('1', text));
    expect(tracker.record(post('1', text))).toBe(1);
  });

  test('short text is never a duplicate', () => {
    const tracker = new DuplicateTextTracker();
    tracker.record(post('1', 'nice'));
    expect(tracker.record(post('2', 'nice'))).toBe(1);
  });

  test('posts without an id are ignored and clear resets', () => {
    const tracker = new DuplicateTextTracker();
    expect(
      tracker.record({ content: { text }, user: {} } as unknown as Post)
    ).toBe(1);
    tracker.record(post('1', text));
    tracker.clear();
    expect(tracker.record(post('2', text))).toBe(1);
  });

  test('normalizePostText strips links, leading mentions and spacing', () => {
    expect(normalizePostText('@a @b  Hello   WORLD https://t.co/x')).toBe(
      'hello world'
    );
  });

  test('normalizePostText ignores digits so daily dated posts match', () => {
    expect(normalizePostText('Today is 10/16/2026 and x')).toBe(
      normalizePostText('Today is 10/17/2026 and x')
    );
  });
});

describe('ReportCache', () => {
  test('stores reports per author and post', () => {
    const cache = new ReportCache();
    cache.set(post('1', '', 'u1'), report(0.1));
    expect(cache.get(post('1', '', 'u1'))?.chance).toBe(0.1);
    expect(cache.get(post('1', '', 'u2'))).toBe(undefined);
    expect(cache.get(post('2', '', 'u1'))).toBe(undefined);
  });

  test('ignores posts without ids', () => {
    const cache = new ReportCache();
    const noIds = { user: {} } as unknown as Post;
    cache.set(noIds, report(1));
    expect(cache.size).toBe(0);
    expect(cache.get(noIds)).toBe(undefined);
  });

  test('evicts the oldest entry past its limit and can be cleared', () => {
    const cache = new ReportCache(2);
    cache.set(post('1'), report(1));
    cache.set(post('2'), report(2));
    cache.set(post('3'), report(3));
    expect(cache.size).toBe(2);
    expect(cache.get(post('1'))).toBe(undefined);
    expect(cache.get(post('3'))?.chance).toBe(3);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});

test('isContentRequest accepts only known messages', () => {
  expect(isContentRequest({ type: 'get-stats' })).toBe(true);
  expect(isContentRequest({ type: 'show-hidden' })).toBe(true);
  for (const bad of [null, undefined, 'get-stats', {}, { type: 'other' }]) {
    expect(isContentRequest(bad)).toBe(false);
  }
});
