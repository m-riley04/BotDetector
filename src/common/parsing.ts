import type { ReactPropsResponse, ReactComponentData } from '../react/types';
import { isRecord } from './helpers';

export function parseReactPropsResponse(
  value: unknown
): ReactPropsResponse | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !isRecord(value.props)
  ) {
    console.error('Value is not a record or missing required fields:', value);
    return undefined;
  }

  const components = value.props.components;
  if (components === undefined) {
    return { id: value.id, props: {} };
  }
  if (!Array.isArray(components)) {
    console.error('Components is not an array:', components);
    return undefined;
  }

  const parsedComponents: ReactComponentData[] = [];
  for (const component of components) {
    if (
      !isRecord(component) ||
      (component.name !== undefined && typeof component.name !== 'string') ||
      (component.props !== undefined && !isRecord(component.props))
    ) {
      console.warn('Skipping malformed React component data:', component);
      continue;
    }

    parsedComponents.push({
      ...(typeof component.name === 'string' ? { name: component.name } : {}),
      ...(component.props === undefined
        ? {}
        : { props: component.props as ReactComponentData['props'] }),
    });
  }

  return { id: value.id, props: { components: parsedComponents } };
}
