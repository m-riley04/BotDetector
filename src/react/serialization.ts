import { isRecord } from '../common/helpers';
import { ReactComponentData } from './models';
import type { SerializableValue, SerializationState } from './types';

interface SerializationOptions {
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
    depth > maxDepth ||
    state.nodes >= maxNodes
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

interface ReactData {
  elementProps?: SerializableValue;
  components?: ReactComponentData[];
}

interface GetReactDataOptions {
  propsKey: string;
  fiberKeys: string[];
  maxDepth: number;
}

const DEFAULT_GET_REACT_DATA_OPTIONS: GetReactDataOptions = {
  propsKey: '__reactProps$',
  fiberKeys: ['__reactFiber$', '__reactInternalInstance$'],
  maxDepth: 50,
};

// The tweet prop is large and deeply nested, so it gets its own, bigger budget
const TWEET_SERIALIZATION_OPTIONS: SerializationOptions = {
  maxNodes: 3000,
  maxDepth: 10,
};

/**
 * Gets the React data associated with a tweet element.
 * @param tweet The tweet element for which to retrieve React data.
 * @returns An object containing the serialized element props and an array of React component data, if available.
 */
export function getReactData(
  tweet: HTMLElement,
  getReactDataOptions: GetReactDataOptions = DEFAULT_GET_REACT_DATA_OPTIONS
): ReactData {
  const keys = Object.keys(tweet);
  const propsKey = keys.find((key) =>
    key.startsWith(getReactDataOptions.propsKey)
  );
  const fiberKey = keys.find((key) =>
    getReactDataOptions.fiberKeys.some((fiberKey) => key.startsWith(fiberKey))
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
    let tweetComponent:
      | { name?: string; tweet: unknown }
      | undefined;
    let fiber: Record<string, unknown> | undefined = isRecord(
      Reflect.get(tweet, fiberKey)
    )
      ? Reflect.get(tweet, fiberKey)
      : undefined;
    let depth = 0;

    while (fiber && depth < getReactDataOptions.maxDepth) {
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

        if (!tweetComponent && isRecord(memoizedProps.tweet)) {
          tweetComponent = {
            ...(name === undefined ? {} : { name }),
            tweet: memoizedProps.tweet,
          };
        } else {
          pendingComponents.push({
            ...(name === undefined ? {} : { name }),
            props: memoizedProps,
          });
        }
      }

      fiber = isRecord(fiber.return) ? fiber.return : undefined;
      depth += 1;
    }

    const components: ReactComponentData[] = [];

    if (tweetComponent) {
      const tweetState: SerializationState = {
        nodes: 0,
        seen: new WeakSet(),
      };
      const tweet = toSerializable(
        tweetComponent.tweet,
        tweetState,
        0,
        TWEET_SERIALIZATION_OPTIONS
      );
      if (tweet !== undefined) {
        components.push({
          ...(tweetComponent.name === undefined
            ? {}
            : { name: tweetComponent.name }),
          props: { tweet },
        });
      }
    }

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
