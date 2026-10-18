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
