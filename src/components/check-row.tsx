import { toSignedWholePercent, toWholePercent } from '../common/helpers';
import { BotCheck } from '../detection/models';

interface CheckRowOptions {
  check: BotCheck;
  currentRunningTotal: number;
}

export function CheckRow({ check, currentRunningTotal }: CheckRowOptions) {
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
