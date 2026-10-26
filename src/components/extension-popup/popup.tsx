import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { combineLines } from '../../common/helpers';
import type { ContentRequest, PageStats } from '../../common/messages';
import {
  exportSettings,
  parseHandleList,
  parseImportedSettings,
  parseKeywordList,
  sanitizeSettings,
  saveSettings,
  type Settings,
} from '../../common/settings';
import { CHECK_KEYS } from '../../detection/detection';
import { CurrentPageSection } from './CurrentPageSection';
import { EditableCheckRow } from './editable-check-row';
import { SettingsSection } from './SettingsSection';
import { TextList } from './text-list';

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

  const replace = useCallback(
    async (next: Settings, remount = false) => {
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
    },
    [setSettings, setVersion, setSaveError]
  );

  const update = useCallback(
    (patch: Partial<Settings>) =>
      replace(sanitizeSettings({ ...latest.current, ...patch })),
    [replace]
  );

  useEffect(() => {
    void sendToActiveTab({ type: 'get-stats' }).then(setPageStats);
  }, []);

  const copySettings = useCallback(async () => {
    const text = exportSettings(settings);
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      setBackupStatus('Copied to clipboard.');
    } catch {
      backupArea.current?.select();
      setBackupStatus('Press Ctrl+C to copy the selected text.');
    }
  }, [settings]);

  const importSettings = useCallback(() => {
    const imported = parseImportedSettings(backupText);
    if (imported) void replace(imported, true);
    setBackupStatus(
      imported ? 'Settings applied.' : 'That is not valid settings JSON.'
    );
  }, [backupText, setBackupStatus, replace]);

  const off = !settings.enabled;

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
          <span class="track" />
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

      <SettingsSection
        isOff={off}
        settings={settings}
        update={update}
        replace={replace}
      />

      <CurrentPageSection
        pageStats={pageStats}
        onClickedShowHidden={() => {
          void sendToActiveTab({ type: 'show-hidden' }).then(setPageStats);
        }}
      />

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
