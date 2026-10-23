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

export type UnknownJsonProps = Record<string, unknown>;
export type ReactFiber = UnknownJsonProps;
