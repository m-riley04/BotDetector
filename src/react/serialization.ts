import { isRecord } from '../common/helpers';
import { ReactComponentData } from './types';

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export interface SerializationState {
  nodes: number;
  seen: WeakSet<object>;
}

/**
 * Converts an unknown value into a serializable value suitable for JSON serialization.
 * @param value The value to be converted into a serializable format.
 * @param state The current serialization state, tracking seen objects and node count.
 * @param depth The current depth of the serialization recursion.
 * @returns A serializable value or undefined if the value cannot be serialized.
 */
export function toSerializable(
  value: unknown,
  state: SerializationState,
  depth: number
): SerializableValue | undefined {
  const MAX_NODES = 250; // TODO: move these out and into a config maybe?
  const MAX_DEPTH = 5; // TODO: move these out and into a config maybe?

  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'string') return value.slice(0, 300);
  if (
    typeof value !== 'object' ||
    depth > MAX_DEPTH ||
    state.nodes >= MAX_NODES
  ) {
    return undefined;
  }
  if (state.seen.has(value)) return '[Circular]';

  state.seen.add(value);
  state.nodes += 1;

  try {
    if (Array.isArray(value)) {
      return value
        .slice(0, 20)
        .map((item) => toSerializable(item, state, depth + 1))
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
        depth + 1
      );
      if (serializable !== undefined) result[key] = serializable;
      if (state.nodes >= MAX_NODES) break;
    }
    return result;
  } finally {
    state.seen.delete(value);
  }
}

interface ReactData {
  elementProps?: SerializableValue;
  components?: ReactComponentData[];
}

/**
 * Gets the React data associated with a tweet element.
 * @param tweet The tweet element for which to retrieve React data.
 * @returns An object containing the serialized element props and an array of React component data, if available.
 */
export function getReactData(tweet: HTMLElement): ReactData {
  const keys = Object.keys(tweet);
  const propsKey = keys.find((key) => key.startsWith('__reactProps$'));
  const fiberKey = keys.find(
    (key) =>
      key.startsWith('__reactFiber$') ||
      key.startsWith('__reactInternalInstance$')
  );

  const result: ReactData = {};
  const state: SerializationState = { nodes: 0, seen: new WeakSet() };

  if (propsKey) {
    const elementProps = toSerializable(Reflect.get(tweet, propsKey), state, 0);
    if (elementProps !== undefined) result.elementProps = elementProps;
  }

  if (fiberKey) {
    const pendingComponents: Array<{
      name?: string;
      props: Record<string, unknown>;
    }> = [];
    let fiber: Record<string, unknown> | undefined = isRecord(
      Reflect.get(tweet, fiberKey)
    )
      ? Reflect.get(tweet, fiberKey)
      : undefined;
    let depth = 0;

    const MAX_DEPTH = 15; // TODO: move these out and into a config maybe?
    while (fiber && depth < MAX_DEPTH) {
      const memoizedProps = fiber.memoizedProps;
      if (isRecord(memoizedProps)) {
        const type = fiber.type;
        let name: string | undefined;

        if (typeof type === 'function') {
          const displayName = Reflect.get(type, 'displayName');
          name =
            typeof displayName === 'string'
              ? displayName
              : type.name || undefined;
        } else if (typeof type === 'string') {
          name = type;
        }

        pendingComponents.push({
          ...(name === undefined ? {} : { name }),
          props: memoizedProps,
        });
      }

      fiber = isRecord(fiber.return) ? fiber.return : undefined;
      depth += 1;
    }

    pendingComponents.sort(
      (left, right) => Number(right.name === 'b') - Number(left.name === 'b')
    );

    const components: ReactComponentData[] = [];
    for (const component of pendingComponents) {
      const props = toSerializable(component.props, state, 0);
      components.push({
        ...(component.name === undefined ? {} : { name: component.name }),
        ...(props === undefined ? {} : { props }),
      });
    }

    result.components = components;
  }

  return result;
}
