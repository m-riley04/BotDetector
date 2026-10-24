import {
  isBoolean,
  isNonNullObject,
  isNumber,
  isRecord,
  isString,
} from './helpers';
import { UnknownRecord } from './types';

export interface Settings {
  enabled: boolean;

  /**
   * Bot chance (0-1) at or above which an account is marked as a bot.
   */
  threshold: number;
  onlyShowLikelyBotsBadges: boolean;
  hideLikelyBots: boolean;

  /**
   * Lowercase handles (without @) that are always treated as human.
   */
  allowlist: string[];

  /**
   * Lowercase handles (without @) that are always hidden.
   */
  blocklist: string[];

  /**
   * Check keys (see CHECK_DEFINITIONS) that are switched off.
   */
  disabledChecks: string[];

  /**
   * Per-check weight overrides keyed by check key.
   */
  checkWeights: Record<string, number>;

  /**
   * Extra scam keywords on top of the built-in list.
   */
  scamKeywords: string[];
}

export type ListName = 'allowlist' | 'blocklist';
export type ListStatus = 'allowed' | 'blocked' | 'none';
export type ListAction = 'allow' | 'block' | 'clear';

export const SETTINGS_KEY = 'settings';

const DEFAULT_KEY_PATTERN = /^[A-Za-z]{1,40}$/;

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  threshold: 0.75,
  onlyShowLikelyBotsBadges: false,
  hideLikelyBots: false,
  allowlist: [],
  blocklist: [],
  disabledChecks: [],
  checkWeights: {},
  scamKeywords: [],
};

/**
 * Normalizes a handle ("@Some_User") to its stored form ("some_user").
 * @param value
 * @param handlePattern The pattern to check whether the normalization succeeded. Defaults to `/^[a-z0-9_]{1,15}$/`
 * @returns The handle, or undefined if it isn't a valid X handle.
 */
export function normalizeUserHandle(
  value: unknown,
  handlePattern: RegExp = /^[a-z0-9_]{1,15}$/
): string | undefined {
  if (!isString(value)) return undefined;
  const handle = value.trim().replace(/^@/, '').toLowerCase(); // TODO: There is `.toLowerCase` here, but some sites are likely case-sensitive for handles. Test this rigorously.
  return handlePattern.test(handle) ? handle : undefined;
}

function sanitizeList<T>(
  value: unknown,
  normalize: (item: unknown) => T | undefined,
  options: SanitizeListOptions = {
    maxListSize: 1000,
  }
): T[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<T>();
  for (const item of value) {
    const normalized = normalize(item);
    if (normalized !== undefined) result.add(normalized);
    if (result.size >= (options.maxListSize ?? 0)) break;
  }
  return [...result];
}

function normalizeKeyword(
  value: unknown,
  maxKeywordLength: number = 50
): string | undefined {
  if (!isString(value)) return undefined;
  const keyword = value.trim().toLowerCase();
  return keyword.length > 0 && keyword.length <= maxKeywordLength
    ? keyword
    : undefined;
}

function normalizeKey(
  value: unknown,
  keyPattern: RegExp = DEFAULT_KEY_PATTERN
): string | undefined {
  return isString(value) && keyPattern.test(value) ? value : undefined;
}

function sanitizeWeights(
  value: unknown,
  minWeight: number = -1,
  maxWeight: number = 1,
  keyPattern: RegExp = DEFAULT_KEY_PATTERN
): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, weight] of Object.entries(value)) {
    if (!keyPattern.test(key)) continue;
    if (!isNumber(weight) || !Number.isFinite(weight)) continue;
    result[key] = Math.min(Math.max(weight, minWeight), maxWeight);
  }
  return result;
}

interface SanitizeListOptions {
  maxListSize?: number;
}

/**
 * Builds a valid Settings object from untrusted stored data,
 * falling back to defaults for anything missing or invalid.
 */
export function sanitizeSettings(
  value: unknown,
  minThreshold: number = 0.1,
  maxThreshold: number = 1,
  listSanitizeOptions?: SanitizeListOptions
): Settings {
  const raw = isNonNullObject(value) ? (value as UnknownRecord) : {};

  const threshold =
    isNumber(raw.threshold) && Number.isFinite(raw.threshold)
      ? Math.min(Math.max(raw.threshold, minThreshold), maxThreshold)
      : DEFAULT_SETTINGS.threshold;

  const blocklist = sanitizeList(
    raw.blocklist,
    normalizeUserHandle,
    listSanitizeOptions
  );
  // a handle can't be on both lists; blocking wins
  const allowlist = sanitizeList(
    raw.allowlist,
    normalizeUserHandle,
    listSanitizeOptions
  ).filter((handle) => !blocklist.includes(handle));

  return {
    enabled: isBoolean(raw.enabled) ? raw.enabled : DEFAULT_SETTINGS.enabled,
    threshold,
    onlyShowLikelyBotsBadges: isBoolean(raw.onlyShowLikelyBotsBadges)
      ? raw.onlyShowLikelyBotsBadges
      : DEFAULT_SETTINGS.onlyShowLikelyBotsBadges,
    hideLikelyBots: isBoolean(raw.hideLikelyBots)
      ? raw.hideLikelyBots
      : DEFAULT_SETTINGS.hideLikelyBots,
    allowlist,
    blocklist,
    disabledChecks: sanitizeList(
      raw.disabledChecks,
      normalizeKey,
      listSanitizeOptions
    ),
    checkWeights: sanitizeWeights(raw.checkWeights),
    scamKeywords: sanitizeList(
      raw.scamKeywords,
      normalizeKeyword,
      listSanitizeOptions
    ),
  };
}

/**
 * Parses a list typed into the popup: one handle per line, or separated by commas/spaces.
 * Invalid entries are dropped.
 */
export function parseHandleList(
  text: string,
  sanitizeListOptions?: SanitizeListOptions
): string[] {
  return sanitizeList(
    text.split(/[\s,]+/),
    normalizeUserHandle,
    sanitizeListOptions
  );
}

/**
 * Parses a keyword list typed into the popup: one keyword or phrase per line, or comma separated.
 */
export function parseKeywordList(
  text: string,
  sanitizeListOptions?: SanitizeListOptions
): string[] {
  return sanitizeList(
    text.split(/[\n,]+/),
    normalizeKeyword,
    sanitizeListOptions
  );
}

export function getListStatus(
  handle: string | undefined,
  settings: Settings
): ListStatus {
  const normalized = normalizeUserHandle(handle);
  if (!normalized) return 'none';
  if (settings.blocklist.includes(normalized)) return 'blocked';
  if (settings.allowlist.includes(normalized)) return 'allowed';
  return 'none';
}

/**
 * Returns new settings with the handle moved onto the allowlist or blocklist, or off both.
 */
export function applyListAction(
  settings: Settings,
  handle: string,
  action: ListAction
): Settings {
  const normalized = normalizeUserHandle(handle);
  if (!normalized) return settings;

  const allowlist = settings.allowlist.filter((item) => item !== normalized);
  const blocklist = settings.blocklist.filter((item) => item !== normalized);
  if (action === 'allow') allowlist.push(normalized);
  if (action === 'block') blocklist.push(normalized);

  return sanitizeSettings({ ...settings, allowlist, blocklist });
}

/**
 * Serializes settings for backup or sharing.
 */
export function exportSettings(settings: Settings): string {
  return JSON.stringify(sanitizeSettings(settings), null, 2);
}

/**
 * Parses exported settings.
 * @returns The sanitized settings, or undefined if the text isn't a JSON object.
 */
export function parseImportedSettings(text: string): Settings | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isRecord(parsed)) {
      return undefined;
    }
    return sanitizeSettings(parsed);
  } catch {
    return undefined;
  }
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
