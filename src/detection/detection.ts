import { Post } from '../social-media/models';
import {
  CHECK_DEFINITIONS,
  CHECK_KEYS,
  CheckWeights,
  DEFAULT_WEIGHTS,
  evaluateCheckNode,
} from './checks';
import { BotDetectionReport, CheckContext, CheckResult } from './models';
import {
  DEFAULT_SCAM_KEYWORDS,
  collectProfileLinks,
  getUsernameChanges,
} from './signals';

export interface GetDetectionReportOptions {
  weights: CheckWeights;
  botThreshold: number;
  dayMs: number;

  /**
   * Keywords that flag a bio as scammy. Defaults to DEFAULT_SCAM_KEYWORDS.
   */
  scamKeywords?: readonly string[];

  /**
   * How many posts on the page share this post's text. Defaults to 1 (unique).
   */
  duplicateTextCount?: number;

  /**
   * Destinations of t.co links, keyed by the t.co URL.
   */
  expandedLinks?: Readonly<Record<string, string>>;
}

export const DEFAULT_DETECTION_REPORT_OPTIONS: GetDetectionReportOptions = {
  weights: DEFAULT_WEIGHTS,
  botThreshold: 0.75, // arbitrary for now
  dayMs: 24 * 60 * 60 * 1000, // number of milliseconds in a day
  scamKeywords: DEFAULT_SCAM_KEYWORDS,
  duplicateTextCount: 1,
};

/**
 * Computes the shared inputs every check reads from.
 */
function buildCheckContext(
  post: Post,
  options: GetDetectionReportOptions
): CheckContext {
  const { user } = post;
  const { dayMs } = options;
  const now = Date.now();

  const createdMs = user?.about.createdAt.getTime() ?? 0;
  const ageDays = Number.isNaN(createdMs)
    ? undefined
    : Math.max((now - createdMs) / dayMs, 1);

  return {
    post,
    user,
    now,
    dayMs,
    ageDays,
    statuses: user?.stats.postStats.posts,
    likes: user?.stats.postStats.likesGiven,
    followers: user?.stats.followers,
    following: user?.stats.following,
    profileLinks: collectProfileLinks(user, options.expandedLinks),
    usernameChanges: getUsernameChanges(user),
    scamKeywords: options.scamKeywords ?? [],
    duplicateTextCount: options.duplicateTextCount ?? 1,
  };
}

/**
 *
 * TODO: consider perhaps using a "no-trust" approach? Where everyone starts at 100 and evidence reduces the score?
 * @param post The post to analyze for bot detection.
 * @param options The weights, threshold and extra context to use for the checks.
 * @returns A bot detection report if the post could be analyzed, otherwise undefined.
 */
export function getDetectionReport(
  post: Post | undefined,
  options:
    GetDetectionReportOptions | undefined = DEFAULT_DETECTION_REPORT_OPTIONS
): BotDetectionReport | undefined {
  if (!post) return;

  const { weights, botThreshold: isBotThreshold } = options;
  const ctx = buildCheckContext(post, options);

  const checks: CheckResult[] = CHECK_KEYS.map((key) => {
    const def = CHECK_DEFINITIONS[key];

    // get which type of check entity
    return evaluateCheckNode(def, ctx, weights);
  });

  const chance = Math.min(
    Math.max(
      checks.reduce((sum, c) => sum + c.contribution, 0),
      0
    ),
    1
  );

  return {
    chance,
    checks,
    user: post.user,
    isBot: chance >= isBotThreshold,
    isBotThreshold,
  };
}
