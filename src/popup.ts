import {
  DEFAULT_SETTINGS,
  MAX_WEIGHT,
  MIN_WEIGHT,
  exportSettings,
  loadSettings,
  parseHandleList,
  parseImportedSettings,
  parseKeywordList,
  sanitizeSettings,
  saveSettings,
  type Settings,
} from './common/settings';
import {
  CHECK_DEFINITIONS,
  CHECK_KEYS,
  DEFAULT_WEIGHTS,
  type CheckKey,
} from './detection/detection';
import type { ContentRequest, PageStats } from './common/messages';

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
const stats = byId<HTMLParagraphElement>('stats');
const showHidden = byId<HTMLButtonElement>('show-hidden');
const allowlist = byId<HTMLTextAreaElement>('allowlist');
const blocklist = byId<HTMLTextAreaElement>('blocklist');
const checksContainer = byId<HTMLDivElement>('checks');
const scamKeywords = byId<HTMLTextAreaElement>('scam-keywords');
const resetChecks = byId<HTMLButtonElement>('reset-checks');
const backup = byId<HTMLTextAreaElement>('backup');
const copySettings = byId<HTMLButtonElement>('copy-settings');
const importSettings = byId<HTMLButtonElement>('import-settings');
const backupStatus = byId<HTMLParagraphElement>('backup-status');

// Fields the form has no control for (lists, weights) must survive edits, so edit a full copy.
let current: Settings = { ...DEFAULT_SETTINGS };

interface CheckControls {
  row: HTMLElement;
  toggle: HTMLInputElement;
  slider: HTMLInputElement;
  value: HTMLOutputElement;
}
const checkControls = new Map<CheckKey, CheckControls>();

const percent = (weight: number) => Math.round(weight * 100);

function buildCheckRows(): void {
  for (const key of CHECK_KEYS) {
    const row = document.createElement('div');
    row.className = 'check-row';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = `check-${key}`;
    toggle.setAttribute('aria-label', `Enable ${CHECK_DEFINITIONS[key].label}`);

    const label = document.createElement('label');
    label.htmlFor = toggle.id;
    label.textContent = CHECK_DEFINITIONS[key].label;

    const value = document.createElement('output');

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(percent(MIN_WEIGHT));
    slider.max = String(percent(MAX_WEIGHT));
    slider.step = '1';
    slider.style.gridColumn = '2 / 4';
    slider.setAttribute('aria-label', `${CHECK_DEFINITIONS[key].label} weight`);

    slider.addEventListener('input', () => {
      value.value = `${slider.value}%`;
    });
    slider.addEventListener('change', () => void persist(readForm()));
    toggle.addEventListener('change', () => void persist(readForm()));

    row.append(toggle, label, value, slider);
    checksContainer.append(row);
    checkControls.set(key, { row, toggle, slider, value });
  }
}

function render(settings: Settings): void {
  current = settings;

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

  // don't overwrite text the user is still typing
  const setText = (area: HTMLTextAreaElement, text: string) => {
    if (document.activeElement !== area) area.value = text;
  };
  setText(allowlist, settings.allowlist.join('\n'));
  setText(blocklist, settings.blocklist.join('\n'));
  setText(scamKeywords, settings.scamKeywords.join('\n'));

  for (const key of CHECK_KEYS) {
    const controls = checkControls.get(key);
    if (!controls) continue;
    const isOn = !settings.disabledChecks.includes(key);
    const weight = settings.checkWeights[key] ?? DEFAULT_WEIGHTS[key];
    controls.toggle.checked = isOn;
    controls.slider.value = String(percent(weight));
    controls.slider.disabled = !isOn;
    controls.value.value = `${percent(weight)}%`;
    controls.row.classList.toggle('off', !isOn);
  }
}

function readForm(): Settings {
  const disabledChecks: string[] = [];
  const checkWeights: Record<string, number> = {};
  for (const key of CHECK_KEYS) {
    const controls = checkControls.get(key);
    if (!controls) continue;
    if (!controls.toggle.checked) disabledChecks.push(key);
    const weight = Number(controls.slider.value) / 100;
    if (Math.abs(weight - DEFAULT_WEIGHTS[key]) > 0.0001) {
      checkWeights[key] = weight;
    }
  }

  return sanitizeSettings({
    ...current,
    enabled: enabled.checked,
    threshold: Number(threshold.value) / 100,
    onlyShowLikelyBotsBadges: onlyLikelyBots.checked,
    hideLikelyBots: hideLikelyBots.checked,
    allowlist: parseHandleList(allowlist.value),
    blocklist: parseHandleList(blocklist.value),
    scamKeywords: parseKeywordList(scamKeywords.value),
    disabledChecks,
    checkWeights,
  });
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

function debounce(callback: () => void, delay: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delay);
  };
}

// Update the readout while dragging; save once the value is committed.
threshold.addEventListener('input', () => {
  thresholdValue.value = `${threshold.value}%`;
});
threshold.addEventListener('change', () => void persist(readForm()));
enabled.addEventListener('change', () => void persist(readForm()));
onlyLikelyBots.addEventListener('change', () => void persist(readForm()));
hideLikelyBots.addEventListener('change', () => void persist(readForm()));

// The popup can close at any moment, so save text areas shortly after typing stops.
const saveText = debounce(() => void persist(readForm()), 500);
for (const area of [allowlist, blocklist, scamKeywords]) {
  area.addEventListener('input', saveText);
  area.addEventListener('change', () => void persist(readForm()));
}

// Resetting keeps the allow/block lists, since those are the user's own data.
reset.addEventListener(
  'click',
  () =>
    void persist({
      ...DEFAULT_SETTINGS,
      allowlist: current.allowlist,
      blocklist: current.blocklist,
    })
);
resetChecks.addEventListener(
  'click',
  () =>
    void persist({
      ...current,
      disabledChecks: [],
      checkWeights: {},
      scamKeywords: [],
    })
);

copySettings.addEventListener('click', async () => {
  backup.value = exportSettings(current);
  try {
    await navigator.clipboard.writeText(backup.value);
    backupStatus.textContent = 'Copied to clipboard.';
  } catch {
    backup.select();
    backupStatus.textContent = 'Press Ctrl+C to copy the selected text.';
  }
});

importSettings.addEventListener('click', () => {
  const imported = parseImportedSettings(backup.value);
  if (!imported) {
    backupStatus.textContent = 'That is not valid settings JSON.';
    return;
  }
  void persist(imported);
  backupStatus.textContent = 'Settings applied.';
});

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

function renderStats(pageStats: PageStats | undefined): void {
  if (!pageStats) {
    stats.textContent = 'Open x.com to see results.';
    showHidden.disabled = true;
    return;
  }
  stats.textContent = `${pageStats.flagged} likely bot${
    pageStats.flagged === 1 ? '' : 's'
  } found, ${pageStats.hidden} hidden, ${pageStats.badges} badged.`;
  showHidden.disabled = pageStats.hidden === 0;
}

showHidden.addEventListener('click', () => {
  void sendToActiveTab({ type: 'show-hidden' }).then(renderStats);
});

buildCheckRows();
loadSettings()
  .then(render)
  .catch((error) => {
    console.error('[BotDetector] Could not load settings.', error);
    render(DEFAULT_SETTINGS);
  });
void sendToActiveTab({ type: 'get-stats' }).then(renderStats);
