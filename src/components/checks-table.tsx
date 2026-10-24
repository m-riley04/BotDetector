import type { BotCheck, BotDetectionReport } from '../detection/models';
import { toWholePercent, toSignedWholePercent } from '../common/helpers';
import { useEffect, useMemo, useState } from 'preact/compat';

interface CheckRowOptions {
  check: BotCheck;
  currentRunningTotal: number;
}

function CheckRow({ check, currentRunningTotal }: CheckRowOptions) {
  const tone = !check.triggered
    ? 'off'
    : check.contribution < 0
      ? 'trust'
      : 'risk';
  return (
    <tr key={check.id} class={tone}>
      <td>{`${check.triggered ? '✔' : '✘'} ${check.label}`}</td>
      <td>{toWholePercent(check.weight)}</td>
      <td>
        {check.triggered ? toSignedWholePercent(check.contribution) : '-'}
      </td>
      <td>{toWholePercent(currentRunningTotal)}</td>
    </tr>
  );
}

function CheckRows({ report }: { report: BotDetectionReport }) {
  let running = 0;
  return (
    <>
      {report.checks.map((c) => {
        running = Math.min(Math.max(running + c.contribution, 0), 1);
        return <CheckRow check={c} currentRunningTotal={running} />;
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
  const memoizedChecks = useMemo(() => {
    return report.checks.filter((c) => c.triggered);
  }, [report]);

  const filteredReport = useMemo(() => {
    return {
      ...report,
      checks: hideUntriggeredChecks ? memoizedChecks : report.checks,
    };
  }, [report, hideUntriggeredChecks, memoizedChecks]);

  return (
    <table>
      <tbody>
        <tr class="head">
          <td>Check</td>
          <td>Weight</td>
          <td>Added</td>
          <td>Total</td>
        </tr>
        <CheckRows report={filteredReport} />
        <tr class="final">
          <td>Final (kept between 0% and 100%)</td>
          <td></td>
          <td></td>
          <td>{toWholePercent(filteredReport.chance)}</td>
        </tr>
      </tbody>
    </table>
  );
}
