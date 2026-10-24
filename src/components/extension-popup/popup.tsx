import { useEffect, useRef, useState } from 'preact/hooks';
import {
  DEFAULT_SETTINGS,
  exportSettings,
  parseHandleList,
  parseImportedSettings,
  parseKeywordList,
  sanitizeSettings,
  saveSettings,
  type Settings,
} from '../../common/settings';
import { CHECK_KEYS } from '../../detection/detection';
import type { ContentRequest, PageStats } from '../../common/messages';
import { combineLines, toPercent } from '../../common/helpers';
import { useSlider } from './useSlider';
import { TextList } from './text-list';
import { EditableCheckRow } from './editable-check-row';

/**
 * Sends a content request to the active tab and returns the page statistics if available.
 * @param request The content request to send to the active tab.
 * @returns The page statistics if available, otherwise undefined.
 */
async function sendToActiveTab(
  request: ContentRequest
): Promise<PageStats | undefined> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (tab?.id === undefined) return undefined;
  try {
    return (await browser.tabs.sendMessage(tab.id, request)) as
      PageStats | undefined;
  } catch {
    // no content script on this tab
    return undefined;
  }
}

interface ExtensionPopupProps {
  initial: Settings;
}

/**
 * The window/popup that opens when the extension icon is clicked.
 */
export function ExtensionPopup({ initial }: ExtensionPopupProps) {
  const [settings, setSettings] = useState(initial);

  // Bumped when settings are replaced wholesale, so the text areas pick up the new values.
  const [version, setVersion] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [pageStats, setPageStats] = useState<PageStats>();
  const [backupText, setBackupText] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const backupArea = useRef<HTMLTextAreaElement>(null);

  // Debounced text saves can fire after a re-render, so always build on the latest settings.
  const latest = useRef(settings);

  // TODO: make this more performant (i.e. `useCallback` and `useMemo`)

  const replace = async (next: Settings, remount = false) => {
    latest.current = next;
    setSettings(next);
    if (remount) setVersion((v) => v + 1);
    try {
      await saveSettings(next);
      setSaveError(false);
    } catch (error) {
      console.error('[BotDetector] Could not save settings.', error);
      setSaveError(true);
    }
  };
  const update = (patch: Partial<Settings>) =>
    replace(sanitizeSettings({ ...latest.current, ...patch }));

  useEffect(() => {
    void sendToActiveTab({ type: 'get-stats' }).then(setPageStats);
  }, []);

  const copySettings = async () => {
    const text = exportSettings(settings);
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      setBackupStatus('Copied to clipboard.');
    } catch {
      backupArea.current?.select();
      setBackupStatus('Press Ctrl+C to copy the selected text.');
    }
  };

  const importSettings = () => {
    const imported = parseImportedSettings(backupText);
    if (imported) void replace(imported, true);
    setBackupStatus(
      imported ? 'Settings applied.' : 'That is not valid settings JSON.'
    );
  };

  const off = !settings.enabled;
  const threshold = useSlider(toPercent(settings.threshold), (value) =>
    update({ threshold: value / 100 })
  );

  // TODO: split this huge layout up

  return (
    <main>
      <header>
        <h1>BotDetector</h1>
        <label class="switch" title="Enable or disable BotDetector">
          <input
            id="enabled"
            type="checkbox"
            role="switch"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.currentTarget.checked })}
          />
          <span class="track"></span>
          <span class="visually-hidden">Enable BotDetector</span>
        </label>
      </header>
      <p class="subtitle">
        Detect troll and astroturfing accounts on Twitter (or 'X')
      </p>
      <p
        id="status"
        class={`status${off || saveError ? ' off' : ''}`}
        role="status"
      >
        {saveError
          ? 'Could not save settings.'
          : off
            ? 'Paused. No badges will be shown.'
            : 'Active on x.com'}
      </p>

      <section
        id="settings"
        class={off ? 'disabled' : undefined}
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title">Settings</h2>

        <div class="field">
          <div class="field-header">
            <label for="threshold">Bot threshold</label>
            <output id="threshold-value" for="threshold">
              {`${threshold.shown}%`}
            </output>
          </div>
          <input
            id="threshold"
            type="range"
            min="10"
            max="100"
            step="5"
            aria-describedby="threshold-help"
            disabled={off}
            {...threshold.props}
          />
          <p id="threshold-help" class="help">
            Accounts scoring at or above this are marked as likely bots.
          </p>
        </div>

        <label class="check">
          <input
            id="only-likely-bots"
            type="checkbox"
            checked={settings.onlyShowLikelyBotsBadges}
            disabled={off}
            onChange={(e) =>
              update({ onlyShowLikelyBotsBadges: e.currentTarget.checked })
            }
          />
          <span>
            Only show likely bots' badges
            <small>Hide the badge on accounts below the threshold.</small>
          </span>
        </label>

        <label class="check">
          <input
            id="hide-likely-bots"
            type="checkbox"
            checked={settings.hideLikelyBots}
            disabled={off}
            onChange={(e) =>
              update({ hideLikelyBots: e.currentTarget.checked })
            }
          />
          <span>
            Hide likely bots
            <small>
              Hide the entire post for accounts at or above the threshold.
            </small>
          </span>
        </label>

        <button
          id="reset"
          type="button"
          class="secondary"
          onClick={() =>
            // Resetting keeps the allow/block lists, since those are the user's own data.
            replace({
              ...DEFAULT_SETTINGS,
              allowlist: settings.allowlist,
              blocklist: settings.blocklist,
            })
          }
        >
          Reset to defaults
        </button>
      </section>

      <section id="page" aria-labelledby="page-title">
        <h2 id="page-title">This page</h2>
        <p id="stats" class="help">
          {pageStats
            ? `${pageStats.flagged} likely bot${
                pageStats.flagged === 1 ? '' : 's'
              } found, ${pageStats.hidden} hidden, ${pageStats.badges} badged.`
            : 'Open x.com to see results.'}
        </p>
        <button
          id="show-hidden"
          type="button"
          class="secondary"
          disabled={!pageStats?.hidden}
          onClick={() =>
            void sendToActiveTab({ type: 'show-hidden' }).then(setPageStats)
          }
        >
          Show hidden posts
        </button>
      </section>

      <section id="lists" aria-labelledby="lists-title">
        <h2 id="lists-title">Lists</h2>
        <div class="field">
          <label for="allowlist">Always treat as human</label>
          <TextList
            key={version}
            id="allowlist"
            value={combineLines(settings.allowlist)}
            onCommit={(text) => update({ allowlist: parseHandleList(text) })}
          />
        </div>
        <div class="field">
          <label for="blocklist">Always hide</label>
          <TextList
            key={version}
            id="blocklist"
            value={combineLines(settings.blocklist)}
            onCommit={(text) => update({ blocklist: parseHandleList(text) })}
          />
          <p class="help">One @handle per line.</p>
        </div>
      </section>

      <details id="checks-section">
        <summary>Detection checks</summary>
        <p class="help">
          Turn checks off or change how much each adds. Negative weights lower
          the score.
        </p>
        <div id="checks">
          {CHECK_KEYS.map((key) => (
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
            onCommit={(text) =>
              update({ scamKeywords: parseKeywordList(text) })
            }
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

      <details id="backup-section">
        <summary>Backup</summary>
        <div class="field">
          <label for="backup">Settings JSON</label>
          <textarea
            id="backup"
            ref={backupArea}
            rows={5}
            spellcheck={false}
            value={backupText}
            onInput={(e) => setBackupText(e.currentTarget.value)}
          />
        </div>
        <div class="row">
          <button
            id="copy-settings"
            type="button"
            class="secondary"
            onClick={copySettings}
          >
            Copy
          </button>
          <button
            id="import-settings"
            type="button"
            class="secondary"
            onClick={importSettings}
          >
            Apply pasted JSON
          </button>
        </div>
        <p id="backup-status" class="help" role="status">
          {backupStatus}
        </p>
      </details>
    </main>
  );
}
