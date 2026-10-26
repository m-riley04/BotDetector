import { render } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { toWholePercent } from '../common/helpers';
import type { ListAction, ListStatus } from '../common/settings';
import { BOT_DETECTOR_CLOSE_OVERLAY } from '../detection/constants';
import type { BotDetectionReport } from '../detection/models';
import { Post } from '../social-media/models';
import { ChecksTable } from './checks-table';

/**
 * Lets the modal change the user's allowlist/blocklist for the post's author.
 */
export interface ReportModalOptions {
  listStatus: ListStatus;
  onListAction: (action: ListAction) => void | Promise<void>;
}

interface CopyStatus {
  text: string;
  error: boolean;
}

interface ReportModalProps {
  report: BotDetectionReport;
  post?: Post;
  options?: ReportModalOptions;
  onClose: () => void;
}

export function ReportModal({
  report,
  post,
  options,
  onClose,
}: ReportModalProps) {
  const [status, setStatus] = useState<CopyStatus | null>(null);
  const [hideUntriggeredChecks, setHideUntriggeredChecks] = useState(true);

  useEffect(() => {
    window.addEventListener(BOT_DETECTOR_CLOSE_OVERLAY, onClose);
    return () =>
      window.removeEventListener(BOT_DETECTOR_CLOSE_OVERLAY, onClose);
  }, [onClose]);

  const copy = useCallback(
    (label: string, data: unknown) => async () => {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error('Clipboard access is unavailable in this page.');
        }
        await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setStatus({ text: `${label} JSON copied to clipboard.`, error: false });
      } catch (error) {
        setStatus({
          text: `Could not copy ${label.toLowerCase()} JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error: true,
        });
      }
    },
    []
  );

  const listButtons: [string, ListAction, boolean][] = options
    ? [
        ['Mark as human', 'allow', options.listStatus !== 'allowed'],
        ['Always hide', 'block', options.listStatus !== 'blocked'],
        ['Remove from lists', 'clear', options.listStatus !== 'none'],
      ]
    : [];

  return (
    <div
      class="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="panel" role="dialog" aria-modal="true">
        <h3>
          {`Bot Chance: ${toWholePercent(report.chance)} | ${
            report.isBot ? 'Likely a bot' : 'Probably not a bot'
          }`}
        </h3>

        <button
          type="button"
          onClick={() => setHideUntriggeredChecks((prev) => !prev)}
        >
          {hideUntriggeredChecks
            ? 'Show all checks'
            : 'Hide untriggered checks'}
        </button>

        <ChecksTable
          report={report}
          hideUntriggeredChecks={hideUntriggeredChecks}
        />

        <p class="note">
          {`Marked as a bot at ${toWholePercent(report.isBotThreshold)} or higher.`}
        </p>
        <div class="actions">
          {post && (
            <>
              <button type="button" onClick={copy('Post', post)}>
                Copy post JSON
              </button>
              <button type="button" onClick={copy('Report', report)}>
                Copy report JSON
              </button>
            </>
          )}
          {listButtons
            .filter(([, , show]) => show)
            .map(([label, action]) => (
              <button
                key={action}
                type="button"
                onClick={async () => {
                  try {
                    await options?.onListAction(action);
                  } finally {
                    onClose();
                  }
                }}
              >
                {label}
              </button>
            ))}
          <button type="button" class="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        {status && (
          <p
            class={status.error ? 'status error' : 'status'}
            role="status"
            aria-live="polite"
          >
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Renders a component into a new element's shadow root, isolated from the page's CSS.
 */
export function mountInShadow(
  host: HTMLElement,
  ui: (unmount: () => void) => preact.VNode,
  styles?: string
): () => void {
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles ?? null;
  const container = document.createElement('div');
  root.append(style, container);

  const unmount = () => {
    render(null, container);
    host.remove();
  };
  render(ui(unmount), container);
  return unmount;
}
