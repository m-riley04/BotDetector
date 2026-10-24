import {
  CHECK_KEYS,
  DEFAULT_DETECTION_REPORT_OPTIONS,
  DEFAULT_WEIGHTS,
  type CheckWeights,
  type GetDetectionReportOptions,
} from './detection';
import { DEFAULT_SCAM_KEYWORDS } from './signals';
import type { Settings } from '../common/settings';

/**
 * Applies the user's threshold, per-check toggles/weights and extra keywords on top of the defaults.
 * @param duplicateTextCount How many posts on the page share this post's text.
 */
export function buildDetectionOptions(
  settings: Settings,
  duplicateTextCount = 1,
  expandedLinks: Readonly<Record<string, string>> = {},
  weights: CheckWeights = DEFAULT_WEIGHTS
): GetDetectionReportOptions {
  const copyWeights = { ...weights } as CheckWeights;
  for (const key of CHECK_KEYS) {
    if (settings.disabledChecks.includes(key)) {
      copyWeights[key] = 0;
    } else if (key in settings.checkWeights) {
      copyWeights[key] = settings.checkWeights[key];
    }
  }

  return {
    ...DEFAULT_DETECTION_REPORT_OPTIONS,
    weights: copyWeights,
    isBotThreshold: settings.threshold,
    scamKeywords: [...DEFAULT_SCAM_KEYWORDS, ...settings.scamKeywords],
    duplicateTextCount,
    expandedLinks,
  };
}
