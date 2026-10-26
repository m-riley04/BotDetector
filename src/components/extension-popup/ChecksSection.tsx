import { combineLines } from '../../common/helpers';
import { parseKeywordList, Settings } from '../../common/settings';
import { CHECK_KEYS } from '../../detection/detection';
import { EditableCheckRow } from './EditableCheckRow';
import { TextList } from './TextList';

interface ChecksSectionProps {
  settings: Settings;
  version: number;
  checkKeys: typeof CHECK_KEYS;
  update: (patch: Partial<Settings>) => void;
  replace: (next: Settings, remount?: boolean) => Promise<void>;
}

export function ChecksSection({
  settings,
  version,
  checkKeys,
  update,
  replace,
}: ChecksSectionProps) {
  return (
    <details id="checks-section">
      <summary>Detection checks</summary>
      <p class="help">
        Turn checks off or change how much each adds. Negative weights lower the
        score.
      </p>
      <div id="checks">
        {checkKeys.map((key) => (
          <EditableCheckRow
            key={key}
            checkKey={key}
            settings={settings}
            onChange={update}
          />
        ))}
      </div>
      <div class="field">
        <label for="scam-keywords">Extra scam keywords</label>
        <TextList
          key={version}
          id="scam-keywords"
          value={combineLines(settings.scamKeywords)}
          onCommit={(text) => update({ scamKeywords: parseKeywordList(text) })}
        />
        <p class="help">One word or phrase per line.</p>
      </div>
      <button
        id="reset-checks"
        type="button"
        class="secondary"
        onClick={() =>
          replace(
            {
              ...settings,
              disabledChecks: [],
              checkWeights: {},
              scamKeywords: [],
            },
            true
          )
        }
      >
        Reset checks
      </button>
    </details>
  );
}
