import { toWholePercent } from '../common/helpers';
import { BotDetectionReport } from '../detection/models';
import { getColorFromChance } from './helpers';

/**
 * The badge shown on a post. Without a report it shows a loading state,
 * which the scanner swaps for the real badge once the report is ready.
 */
export function PostBadge({
  report,
  onDetails,
}: {
  report?: BotDetectionReport;
  onDetails?: () => void;
}) {
  if (!report) {
    return (
      <div class="badge loading" aria-busy="true">
        <span class="spinner" aria-hidden="true" />
        <p>Checking…</p>
      </div>
    );
  }

  return (
    <div
      class="badge"
      style={{ borderLeft: `4px solid ${getColorFromChance(report.chance)}` }}
    >
      <p>{`Bot chance ${toWholePercent(report.chance)}`}</p>
      <button
        class="info"
        type="button"
        aria-label="Show detection details"
        title="Show detection details"
        onClick={onDetails}
      >
        ⓘ
      </button>
    </div>
  );
}
