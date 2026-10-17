/**
 * Checks whether a value is a plain object (record) and not an array or null.
 * @param value The value to check.
 * @returns True if the value is a plain object (record), false otherwise.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
