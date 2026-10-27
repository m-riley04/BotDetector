import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { ContentRequest, PageStats } from '../../common/messages';
import {
  sanitizeSettings,
  saveSettings,
  type Settings,
} from '../../common/settings';
import { BackupSection } from './BackupSection';
import { ChecksSection } from './ChecksSection';
import { CurrentPageSection } from './CurrentPageSection';
import { ListsSection } from './ListsSection';
import { SettingsSection } from './SettingsSection';

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

/**
 * Merges a partial change into the latest settings and saves it.
 */
export type UpdateSettings = (patch: Partial<Settings>) => Promise<void>;

/**
 * Replaces all settings and saves them. Pass `remount` to reset the text areas to the new values.
 */
export type ReplaceSettings = (
  next: Settings,
  remount?: boolean
) => Promise<void>;

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

  // Debounced text saves can fire after a re-render, so always build on the latest settings.
  const latest = useRef(settings);

  const replace = useCallback<ReplaceSettings>(
    async (next, remount = false) => {
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

  const update = useCallback<UpdateSettings>(
    (patch) => replace(sanitizeSettings({ ...latest.current, ...patch })),
    [replace]
  );

  useEffect(() => {
    void sendToActiveTab({ type: 'get-stats' }).then(setPageStats);
  }, []);

  const off = !settings.enabled;

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

      <ListsSection settings={settings} update={update} version={version} />

      <ChecksSection
        settings={settings}
        version={version}
        update={update}
        replace={replace}
      />

      <BackupSection settings={settings} replace={replace} />
    </main>
  );
}
