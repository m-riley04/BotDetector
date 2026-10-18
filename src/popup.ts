import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from './common/settings';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing popup element: #${id}`);
  return element as T;
}

const enabled = byId<HTMLInputElement>('enabled');
const threshold = byId<HTMLInputElement>('threshold');
const thresholdValue = byId<HTMLOutputElement>('threshold-value');
const onlyLikelyBots = byId<HTMLInputElement>('only-likely-bots');
const hideLikelyBots = byId<HTMLInputElement>('hide-likely-bots');
const reset = byId<HTMLButtonElement>('reset');
const status = byId<HTMLParagraphElement>('status');
const settingsSection = byId<HTMLElement>('settings');

function render(settings: Settings): void {
  enabled.checked = settings.enabled;
  threshold.value = String(Math.round(settings.threshold * 100));
  thresholdValue.value = `${threshold.value}%`;
  onlyLikelyBots.checked = settings.onlyShowLikelyBotsBadges;
  hideLikelyBots.checked = settings.hideLikelyBots;

  status.textContent = settings.enabled
    ? 'Active on x.com'
    : 'Paused. No badges will be shown.';
  status.classList.toggle('off', !settings.enabled);

  settingsSection.classList.toggle('disabled', !settings.enabled);
  threshold.disabled = !settings.enabled;
  onlyLikelyBots.disabled = !settings.enabled;
  hideLikelyBots.disabled = !settings.enabled;
}

function readForm(): Settings {
  return {
    enabled: enabled.checked,
    threshold: Number(threshold.value) / 100,
    onlyShowLikelyBotsBadges: onlyLikelyBots.checked,
    hideLikelyBots: hideLikelyBots.checked,
  };
}

async function persist(settings: Settings): Promise<void> {
  render(settings);
  try {
    await saveSettings(settings);
  } catch (error) {
    console.error('[BotDetector] Could not save settings.', error);
    status.textContent = 'Could not save settings.';
    status.classList.add('off');
  }
}

// Update the readout while dragging; save once the value is committed.
threshold.addEventListener('input', () => {
  thresholdValue.value = `${threshold.value}%`;
});
threshold.addEventListener('change', () => void persist(readForm()));
enabled.addEventListener('change', () => void persist(readForm()));
onlyLikelyBots.addEventListener('change', () => void persist(readForm()));
hideLikelyBots.addEventListener('change', () => void persist(readForm()));
reset.addEventListener('click', () => void persist({ ...DEFAULT_SETTINGS }));

loadSettings()
  .then(render)
  .catch((error) => {
    console.error('[BotDetector] Could not load settings.', error);
    render(DEFAULT_SETTINGS);
  });
