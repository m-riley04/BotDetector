import type {
  BotDetectionReport,
  CheckLeaf,
  CheckResult,
} from '../src/detection/models';

/**
 * Depth-first list of every result in the tree: groups first, then their children.
 */
export function flattenChecks(checks: readonly CheckResult[]): CheckResult[] {
  return checks.flatMap((c) => [c, ...flattenChecks(c.children ?? [])]);
}

/**
 * Finds a check or group anywhere in the report's tree by its id.
 */
export function findCheck(
  report: BotDetectionReport,
  id: string
): CheckResult | undefined {
  return flattenChecks(report.checks).find((c) => c.node.id === id);
}

/**
 * Builds a leaf CheckResult for UI tests that only care about the rendered fields.
 */
export function leafResult(
  id: string,
  label: string,
  weight: number,
  triggered: boolean
): CheckResult {
  const node: CheckLeaf = {
    kind: 'check',
    id,
    label,
    defaultWeight: weight,
    test: () => triggered,
  };
  return { node, weight, triggered, contribution: triggered ? weight : 0 };
}
