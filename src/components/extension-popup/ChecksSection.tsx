import { Fragment } from 'preact';
import { combineLines } from '../../common/helpers';
import { parseKeywordList, Settings } from '../../common/settings';
import { ROOT_CHECK_NODES } from '../../detection/checks';
import type { CheckNode } from '../../detection/models';
import { EditableCheckRow } from './EditableCheckRow';
import type { ReplaceSettings, UpdateSettings } from './ExtensionPopup';
import { TextList } from './TextList';

interface ChecksSectionProps {
  settings: Settings;
  version: number;
  update: UpdateSettings;
  replace: ReplaceSettings;
}

/**
 * One row per check, with each group's children nested under it.
 */
function CheckRows({
  nodes,
  settings,
  update,
  depth = 0,
  parentOff = false,
}: {
  nodes: readonly CheckNode[];
  settings: Settings;
  update: UpdateSettings;
  depth?: number;
  parentOff?: boolean;
}) {
  return (
    <>
      {nodes.map((node) => (
        <Fragment key={node.id}>
          <EditableCheckRow
            node={node}
            depth={depth}
            parentOff={parentOff}
            settings={settings}
            onChange={update}
          />
          {node.kind === 'group' && (
            <CheckRows
              nodes={node.children ?? []}
              settings={settings}
              update={update}
              depth={depth + 1}
              parentOff={parentOff || settings.disabledChecks.includes(node.id)}
            />
          )}
        </Fragment>
      ))}
    </>
  );
}

export function ChecksSection({
  settings,
  version,
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
        <CheckRows
          nodes={ROOT_CHECK_NODES}
          settings={settings}
          update={update}
        />
      </div>
      <div class="field">
        <label for="scam-keywords">Extra scam keywords</label>
        <TextList
          key={version}
          id="scam-keywords"
          separator=","
          value={combineLines(settings.scamKeywords)}
          onCommit={(text) => update({ scamKeywords: parseKeywordList(text) })}
        />
        <p class="help">Press Enter or comma after each word or phrase.</p>
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
