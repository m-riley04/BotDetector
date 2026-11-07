import { toPercent } from '../../common/helpers';
import { Settings } from '../../common/settings';
import { DEFAULT_WEIGHTS } from '../../detection/checks';
import type { CheckNode } from '../../detection/models';
import { useSlider } from './useSlider';

interface EditableCheckRowProps {
  node: CheckNode;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  /** Nesting level, for indentation. */
  depth?: number;
  /** True when a parent group is switched off, which switches this row off too. */
  parentOff?: boolean;
}

/**
 * Not to be confused with the non-editable CheckRow component that is displayed in the modal.
 * Groups only get a toggle: their contribution comes from their children, so they have no weight slider.
 * @param props The check node, current settings, and a change handler.
 * @returns The JSX element representing the check row.
 */
export function EditableCheckRow({
  node,
  settings,
  onChange,
  depth = 0,
  parentOff = false,
}: EditableCheckRowProps) {
  const { id, label } = node;
  const isOwnToggleOn = !settings.disabledChecks.includes(id);
  const isOn = isOwnToggleOn && !parentOff;
  const defaultWeight = DEFAULT_WEIGHTS[id] ?? node.defaultWeight;

  const slider = useSlider(
    toPercent(settings.checkWeights[id] ?? defaultWeight),
    (value) => {
      const { [id]: _old, ...rest } = settings.checkWeights;
      const weight = value / 100;
      const isDefault = Math.abs(weight - defaultWeight) <= 0.0001;
      onChange({ checkWeights: isDefault ? rest : { ...rest, [id]: weight } });
    }
  );

  return (
    <div
      class={`check-row${isOn ? '' : ' off'}${node.kind === 'group' ? ' group' : ''}`}
      style={depth > 0 ? { marginLeft: `${depth * 16}px` } : undefined}
    >
      <input
        type="checkbox"
        id={`check-${id}`}
        aria-label={`Enable ${label}`}
        checked={isOwnToggleOn}
        disabled={parentOff}
        onChange={(e) =>
          onChange({
            disabledChecks: [
              ...settings.disabledChecks.filter((k) => k !== id),
              ...(e.currentTarget.checked ? [] : [id]),
            ],
          })
        }
      />
      <label for={`check-${id}`}>{label}</label>
      {node.kind === 'check' && (
        <>
          <output>{`${slider.shown}%`}</output>
          <input
            type="range"
            min={toPercent(-1)}
            max={toPercent(1)}
            step={1}
            style={{ gridColumn: '2 / 4' }}
            aria-label={`${label} weight`}
            disabled={!isOn}
            {...slider.props}
          />
        </>
      )}
    </div>
  );
}
