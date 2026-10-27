import { toWholePercent } from '../common/helpers';
import { BotDetectionReport } from '../detection/models';
import { getColorFromChance } from './helpers';

export function PostBadge({
  report,
  onDetails,
}: {
  report: BotDetectionReport;
  onDetails: () => void;
}) {
  return (
    <div
      class="badge"
      style={{ borderLeft: `4px solid ${getColorFromChance(report.chance)}` }}
    >
      <p>{`Bot chance ${toWholePercent(report.chance)}`}</p>
      <button
        className="info"
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
