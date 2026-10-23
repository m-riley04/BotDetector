import { UnknownRecord } from './types';

export function isObject(value: unknown): value is object {
  return typeof value === 'object';
}

export function isNonNullObject(value: unknown): value is object {
  return isObject(value) && value !== null;
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

/**
 * Checks whether a value is a plain object (record) and not an array or null.
 * @param value The value to check.
 * @returns True if the value is a plain object (record), false otherwise.
 */
export function isRecord(value: unknown): value is UnknownRecord {
  return isNonNullObject(value) && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function toNumber(value: unknown): number | undefined {
  const parsed = isString(value) ? Number(value) : value;
  return isNumber(parsed) && Number.isFinite(parsed) ? parsed : undefined;
}

export function toWholePercent(n: number) {
  return `${Number((n * 100).toFixed(2))}%`;
}

export function toSignedWholePercent(n: number) {
  return `${n < 0 ? '-' : '+'}${toWholePercent(Math.abs(n))}`;
}
