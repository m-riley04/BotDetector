import type { ListStatus, Settings } from '../common/settings';
import type { BotDetectionReport } from './models';

/**
 * What to do with a tweet once it has been analyzed.
 * - `hide`: hide the whole post
 * - `badge`: show the bot chance badge
 * - `none`: leave the post untouched
 */
export type TweetAction = 'hide' | 'badge' | 'none';

/**
 * Decides how a tweet should be presented based on its report and the user's settings.
 * The report's `isBot` is expected to already use the user's threshold.
 */
export function getTweetAction(
  report: BotDetectionReport,
  settings: Settings,
  listStatus: ListStatus = 'none'
): TweetAction {
  if (!settings.enabled) return 'none';
  if (listStatus === 'blocked') return 'hide';
  if (report.isBot) return settings.hideLikelyBots ? 'hide' : 'badge';
  return settings.onlyShowLikelyBotsBadges ? 'none' : 'badge';
}

/**
 * Applies the user's allowlist/blocklist on top of a computed report by adding a
 * manual check, so the badge and modal explain why the result was overridden.
 */
export function applyListOverride(
  report: BotDetectionReport,
  status: ListStatus
): BotDetectionReport {
  if (status === 'none') return report;
  const blocked = status === 'blocked';
  return {
    ...report,
    chance: blocked ? 1 : 0,
    isBot: blocked,
    checks: [
      ...report.checks,
      {
        id: blocked ? 'manual-blocklist' : 'manual-allowlist',
        label: blocked ? 'On your blocklist' : 'On your allowlist',
        weight: blocked ? 1 : -1,
        triggered: true,
        contribution: blocked ? 1 : -1,
      },
    ],
  };
}
