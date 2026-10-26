import { isFunction, isRecord, isString } from '../common/helpers';
import { ReactComponentData } from './models';
import { SerializationOptions, toSerializable } from './serialization';
import {
  ReactFiber,
  SerializableValue,
  SerializationState,
  UnknownJsonProps,
} from './types';

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

// The post prop is large and deeply nested, so it gets its own, bigger budget
const POST_SERIALIZATION_OPTIONS: SerializationOptions = {
  maxNodes: 3000,
  maxDepth: 10,
};

/**
 * Gets the React data associated with a post element.
 * @param post The post element for which to retrieve React data.
 * @param targetPostPropKey The key that should hold the core data desired in the post element. (i.e. 'tweet') TODO: is this really the best way to generalize this?
 * @returns An object containing the serialized element props and an array of React component data, if available.
 */
export function getReactData(
  post: HTMLElement,
  targetPostPropKey: string,
  getReactDataOptions: GetReactDataOptions = DEFAULT_GET_REACT_DATA_OPTIONS,
  serializationOptions: SerializationOptions = POST_SERIALIZATION_OPTIONS
): ReactData {
  const keys = Object.keys(post);
  const propsKey = keys.find((key) =>
    key.startsWith(getReactDataOptions.propsKey)
  );
  const fiberKey = keys.find((key) =>
    getReactDataOptions.fiberKeys.some((fiberKey) => key.startsWith(fiberKey))
  );

  const result: ReactData = {};
  const state: SerializationState = { nodes: 0, seen: new WeakSet() };

  if (propsKey) {
    const elementProps = toSerializable(Reflect.get(post, propsKey), state, 0);
    if (elementProps !== undefined) result.elementProps = elementProps;
  }

  if (!fiberKey) return result;

  const pendingComponents: Array<{
    name?: string;
    props: UnknownJsonProps;
  }> = [];
  let postComponent:
    { name?: string; [targetPostPropKey]: unknown } | undefined;
  let fiber: ReactFiber | undefined = isRecord(Reflect.get(post, fiberKey))
    ? Reflect.get(post, fiberKey)
    : undefined;
  let depth = 0;

  // deep traverse
  while (fiber && depth < getReactDataOptions.maxDepth) {
    const memoizedProps = fiber.memoizedProps;
    if (isRecord(memoizedProps)) {
      const type = fiber.type;
      let name: string | undefined;

      if (isFunction(type)) {
        const displayName = Reflect.get(type, 'displayName');
        name = isString(displayName) ? displayName : type.name || undefined;
      } else if (isString(type)) {
        name = type;
      }

      if (!postComponent && isRecord(memoizedProps[targetPostPropKey])) {
        postComponent = {
          ...(name === undefined ? {} : { name }),
          [targetPostPropKey]: memoizedProps[targetPostPropKey],
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

  if (postComponent) {
    const postState: SerializationState = {
      nodes: 0,
      seen: new WeakSet(),
    };
    const post = toSerializable(
      postComponent[targetPostPropKey],
      postState,
      0,
      serializationOptions
    );
    if (post !== undefined) {
      components.push({
        ...(postComponent.name === undefined
          ? {}
          : { name: postComponent.name }),
        props: { [targetPostPropKey]: post },
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
  return result;
}
