import { toPercent } from '../../common/helpers';
import { Settings } from '../../common/settings';
import {
  CHECK_DEFINITIONS,
  CheckKey,
  DEFAULT_WEIGHTS,
} from '../../detection/detection';
import { useSlider } from './useSlider';

interface CheckRowProps {
  checkKey: CheckKey;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

/**
 * Not to be confused with the non-editable CheckRow component that is displayed in the modal.
 * TODO: maybe make this more clear;
 * @param props The properties for the check row component, including the check key, current settings, and a change handler.
 * @returns The JSX element representing the check row.
 */
export function EditableCheckRow({
  checkKey: key,
  settings,
  onChange,
}: CheckRowProps) {
  const label = CHECK_DEFINITIONS[key].label;
  const isOn = !settings.disabledChecks.includes(key);

  const slider = useSlider(
    toPercent(settings.checkWeights[key] ?? DEFAULT_WEIGHTS[key]),
    (value) => {
      const { [key]: _old, ...rest } = settings.checkWeights;
      const weight = value / 100;
      const isDefault = Math.abs(weight - DEFAULT_WEIGHTS[key]) <= 0.0001;
      onChange({ checkWeights: isDefault ? rest : { ...rest, [key]: weight } });
    }
  );

  return (
    <div class={`check-row${isOn ? '' : ' off'}`}>
      <input
        type="checkbox"
        id={`check-${key}`}
        aria-label={`Enable ${label}`}
        checked={isOn}
        onChange={(e) =>
          onChange({
            disabledChecks: [
              ...settings.disabledChecks.filter((k) => k !== key),
              ...(e.currentTarget.checked ? [] : [key]),
            ],
          })
        }
      />
      <label for={`check-${key}`}>{label}</label>
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
    </div>
  );
}
