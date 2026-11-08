import { toSignedWholePercent, toWholePercent } from '../common/helpers';
import type { BotDetectionReport, CheckResult } from '../detection/models';

interface CheckRowOptions {
  check: CheckResult;
  currentRunningTotal: number;
  level?: number;
  hideUntriggeredChecks: boolean;
  /** False when a FIRST/MAX parent ignored this triggered check. */
  counted?: boolean;
}

/**
 * The triggered children that actually feed a group's contribution.
 * FIRST keeps only the first hit and MAX only the strongest; other modes count every hit.
 */
function getCountedChildren(check: CheckResult): Set<CheckResult> {
  const hits = (check.children ?? []).filter((c) => c.triggered);
  if (check.node.kind !== 'group') return new Set(hits);
  switch (check.node.mode) {
    case 'FIRST':
      return new Set(hits.slice(0, 1));
    case 'MAX': {
      const best = hits.find((c) => c.contribution === check.contribution);
      return new Set(best ? [best] : []);
    }
    default:
      return new Set(hits);
  }
}

function CheckRow({
  check,
  currentRunningTotal,
  level = 0,
  hideUntriggeredChecks,
  counted = true,
}: CheckRowOptions) {
  const active = check.triggered && counted;
  const tone = !active
    ? 'off'
    : check.contribution < 0
      ? level <= 0
        ? 'trust'
        : 'secondary-trust'
      : level <= 0
        ? 'risk'
        : 'secondary-risk';
  const countedChildren = getCountedChildren(check);

  return (
    <>
      <tr class={tone}>
        <td style={`padding-left: ${8 + level * 20}px;`}>
          {`${check.triggered ? '✔' : '✘'} ${check.node.label}`}
        </td>
        <td>{toWholePercent(check.weight)}</td>
        {check.node.reasoning ? (
          <td>
            <button
              style="background: none; border: none; font-size: 1.2em;padding:0;"
              title={check.node.reasoning}
            >
              ⓘ
            </button>
          </td>
        ) : (
          <td />
        )}
        <td>{active ? toSignedWholePercent(check.contribution) : '-'}</td>
        <td>{toWholePercent(currentRunningTotal)}</td>
      </tr>
      {check.children
        ?.filter(
          (child) => !hideUntriggeredChecks || countedChildren.has(child)
        )
        .map((child) => (
          <CheckRow
            key={child.node.id}
            check={child}
            currentRunningTotal={currentRunningTotal}
            level={level + 1}
            hideUntriggeredChecks={hideUntriggeredChecks}
            counted={countedChildren.has(child)}
          />
        ))}
    </>
  );
}

function CheckRows({
  report,
  hideUntriggeredChecks,
}: {
  report: BotDetectionReport;
  hideUntriggeredChecks: boolean;
}) {
  let running = 0;
  return (
    <>
      {report.checks
        .filter((check) => !hideUntriggeredChecks || check.triggered)
        .map((check) => {
          running = Math.min(Math.max(running + check.contribution, 0), 1);
          return (
            <CheckRow
              key={check.node.id}
              check={check}
              currentRunningTotal={running}
              hideUntriggeredChecks={hideUntriggeredChecks}
            />
          );
        })}
    </>
  );
}

export function ChecksTable({
  report,
  hideUntriggeredChecks,
}: {
  report: BotDetectionReport;
  hideUntriggeredChecks: boolean;
}) {
  return (
    <table>
      <thead>
        <tr class="head">
          <th scope="col">Check</th>
          <th scope="col">Weight</th>
          <th scope="col" />
          <th scope="col">Added</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        <CheckRows
          report={report}
          hideUntriggeredChecks={hideUntriggeredChecks}
        />
        <tr class="final">
          <td>Final (kept between 0% and 100%)</td>
          <td />
          <td />
          <td />
          <td>{toWholePercent(report.chance)}</td>
        </tr>
      </tbody>
    </table>
  );
}
