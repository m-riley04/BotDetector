export interface Settings {
  enabled: boolean;

  /**
   * Bot chance (0-1) at or above which an account is marked as a bot.
   */
  threshold: number;
  onlyShowLikelyBotsBadges: boolean;
  hideLikelyBots: boolean;
}

export const SETTINGS_KEY = 'settings';

export const MIN_THRESHOLD = 0.1;
export const MAX_THRESHOLD = 1;

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  threshold: 0.75,
  onlyShowLikelyBotsBadges: false,
  hideLikelyBots: false,
};

/**
 * Builds a valid Settings object from untrusted stored data,
 * falling back to defaults for anything missing or invalid.
 */
export function sanitizeSettings(value: unknown): Settings {
  const raw =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};

  const threshold =
    typeof raw.threshold === 'number' && Number.isFinite(raw.threshold)
      ? Math.min(Math.max(raw.threshold, MIN_THRESHOLD), MAX_THRESHOLD)
      : DEFAULT_SETTINGS.threshold;

  return {
    enabled:
      typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_SETTINGS.enabled,
    threshold,
    onlyShowLikelyBotsBadges:
      typeof raw.onlyShowLikelyBotsBadges === 'boolean'
        ? raw.onlyShowLikelyBotsBadges
        : DEFAULT_SETTINGS.onlyShowLikelyBotsBadges,
    hideLikelyBots:
      typeof raw.hideLikelyBots === 'boolean'
        ? raw.hideLikelyBots
        : DEFAULT_SETTINGS.hideLikelyBots,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return sanitizeSettings(stored[SETTINGS_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({
    [SETTINGS_KEY]: sanitizeSettings(settings),
  });
}
