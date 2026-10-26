import { toPercent } from '../../common/helpers';
import { DEFAULT_SETTINGS, Settings } from '../../common/settings';
import { useSlider } from './useSlider';

interface SettingsSectionProps {
  settings: Settings;
  isOff: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  replace: (next: Settings, remount?: boolean) => Promise<void>;
}

export function SettingsSection({
  settings,
  isOff,
  update,
  replace,
}: SettingsSectionProps) {
  const threshold = useSlider(toPercent(settings.threshold), (value) =>
    update({ threshold: value / 100 })
  );

  return (
    <section
      id="settings"
      class={isOff ? 'disabled' : undefined}
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
          disabled={isOff}
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
          disabled={isOff}
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
          disabled={isOff}
          onChange={(e) => update({ hideLikelyBots: e.currentTarget.checked })}
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
  );
}
