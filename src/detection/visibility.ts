import type { Settings } from '../common/settings';
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
  settings: Settings
): TweetAction {
  if (!settings.enabled) return 'none';
  if (report.isBot) return settings.hideLikelyBots ? 'hide' : 'badge';
  return settings.onlyShowLikelyBotsBadges ? 'none' : 'badge';
}
