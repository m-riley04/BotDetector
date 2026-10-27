import { useCallback, useRef, useState } from 'preact/hooks';
import {
  exportSettings,
  parseImportedSettings,
  Settings,
} from '../../common/settings';
import type { ReplaceSettings } from './ExtensionPopup';

interface BackupSectionProps {
  settings: Settings;
  replace: ReplaceSettings;
}

export function BackupSection({ settings, replace }: BackupSectionProps) {
  const [backupText, setBackupText] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const backupArea = useRef<HTMLTextAreaElement>(null);

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

  return (
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
  );
}
