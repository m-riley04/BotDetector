import { BOT_ELEMENT } from '../common/constants';
import { toWholePercent } from '../common/helpers';
import { Badge } from '../components/badge';
import {
  mountInShadow,
  ReportModal,
  ReportModalOptions,
} from '../components/report-modal';
import { Post } from '../social-media/models';
import { BotDetectionReport } from './models';
import STYLES from './styles.css';

/**
 * Shows a modal breaking down how each check contributed to the final score.
 */
export function showReportModal(
  report: BotDetectionReport,
  post?: Post,
  options?: ReportModalOptions
): void {
  const host = document.createElement('div');
  document.body.append(host);
  mountInShadow(
    host,
    (onClose) => (
      <ReportModal
        report={report}
        post={post}
        options={options}
        onClose={onClose}
      />
    ),
    STYLES
  );
}

/**
 * Creates the tag element for displaying bot chance.
 * @param report The bot detection report containing the chance value.
 * @returns An HTML element representing the bot chance tag.
 */
export function createBotElement(
  report: BotDetectionReport,
  post: Post,
  options?: ReportModalOptions
): HTMLElement {
  const host = document.createElement(BOT_ELEMENT);
  host.setAttribute(
    'aria-label',
    `Bot detection: ${toWholePercent(report.chance)} chance`
  );
  mountInShadow(host, () => (
    <Badge
      report={report}
      onDetails={() => showReportModal(report, post, options)}
    />
  ));
  return host;
}
