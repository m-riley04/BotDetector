import type { Settings } from '../common/settings';
import { DEFAULT_WEIGHTS, ROOT_CHECK_NODES, type CheckWeights } from './checks';
import {
  DEFAULT_DETECTION_REPORT_OPTIONS,
  type GetDetectionReportOptions,
} from './detection';
import type { CheckNode } from './models';
import { DEFAULT_SCAM_KEYWORDS } from './signals';

/**
 * Applies the user's threshold, per-check toggles/weights and extra keywords on top of the defaults.
 * Settings are keyed by check id. Disabling a group zeroes every check inside it.
 * @param duplicateTextCount How many posts on the page share this post's text.
 */
export function buildDetectionOptions(
  settings: Settings,
  duplicateTextCount = 1,
  expandedLinks: Readonly<Record<string, string>> = {},
  weights: CheckWeights = DEFAULT_WEIGHTS
): GetDetectionReportOptions {
  const copyWeights: CheckWeights = { ...weights };
  const disabled = new Set(settings.disabledChecks);

  const apply = (node: CheckNode, parentDisabled: boolean) => {
    const off = parentDisabled || disabled.has(node.id);
    if (node.kind === 'group') {
      for (const child of node.children ?? []) apply(child, off);
    } else if (off) {
      copyWeights[node.id] = 0;
    } else if (node.id in settings.checkWeights) {
      copyWeights[node.id] = settings.checkWeights[node.id];
    }
  };
  for (const node of ROOT_CHECK_NODES) apply(node, false);

  return {
    ...DEFAULT_DETECTION_REPORT_OPTIONS,
    weights: copyWeights,
    botThreshold: settings.threshold,
    scamKeywords: [...DEFAULT_SCAM_KEYWORDS, ...settings.scamKeywords],
    duplicateTextCount,
    expandedLinks,
  };
}
