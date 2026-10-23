import { isBoolean, isNumber, isObject, isString } from '../common/helpers';
import type { SerializableValue, SerializationState } from './types';

export interface SerializationOptions {
  maxNodes: number;
  maxDepth: number;
}

const DEFAULT_SERIALIZATION_OPTIONS: SerializationOptions = {
  maxNodes: 250,
  maxDepth: 5,
};

/**
 * Converts an unknown value into a serializable value suitable for JSON serialization.
 * @param value The value to be converted into a serializable format.
 * @param state The current serialization state, tracking seen objects and node count.
 * @param depth The current depth of the serialization recursion.
 * @returns A serializable value or undefined if the value cannot be serialized.
 *
 * @recursive
 */
export function toSerializable(
  value: unknown,
  state: SerializationState,
  depth: number,
  options: SerializationOptions = DEFAULT_SERIALIZATION_OPTIONS
): SerializableValue | undefined {
  const { maxNodes, maxDepth } = options;
  if (value === null || isBoolean(value) || isNumber(value)) {
    return value;
  }
  if (isString(value)) return value.slice(0, 300);
  if (!isObject(value) || depth > maxDepth || state.nodes >= maxNodes) {
    return undefined;
  }
  if (state.seen.has(value)) return '[Circular]';

  state.seen.add(value);
  state.nodes += 1;

  try {
    if (Array.isArray(value)) {
      return value
        .slice(0, 20)
        .map((item) => toSerializable(item, state, depth + 1, options))
        .filter((item): item is SerializableValue => item !== undefined);
    }

    const result: { [key: string]: SerializableValue } = {};
    for (const key of Object.keys(value).slice(0, 40)) {
      if (
        key === '_owner' ||
        key === 'ref' ||
        key === 'return' ||
        key === 'child' ||
        key === 'sibling'
      ) {
        continue;
      }

      const serializable = toSerializable(
        Reflect.get(value, key),
        state,
        depth + 1,
        options
      );
      if (serializable !== undefined) result[key] = serializable;
      if (state.nodes >= maxNodes) break;
    }
    return result;
  } finally {
    state.seen.delete(value);
  }
}
