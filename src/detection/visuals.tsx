import { BOT_ELEMENT } from '../common/constants';
import { toWholePercent } from '../common/helpers';
import { PostBadge } from '../components/PostBadge';
import {
  mountInShadow,
  ReportModal,
  ReportModalOptions,
} from '../components/ReportModal';
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
  mountInShadow(
    host,
    () => (
      <PostBadge
        report={report}
        onDetails={() => showReportModal(report, post, options)}
      />
    ),
    STYLES
  );
  return host;
}

/**
 * Creates a placeholder badge shown while a post's data is still loading.
 * It uses the same tag as the real badge, so a post with a placeholder counts as already handled.
 * @returns An HTML element to replace with createBotElement once the report is ready.
 */
export function createLoadingBotElement(): HTMLElement {
  const host = document.createElement(BOT_ELEMENT);
  host.setAttribute('aria-label', 'Bot detection: checking');
  mountInShadow(host, () => <PostBadge />, STYLES);
  return host;
}
