import type { SerializableValue } from '../react/serialization';

export interface ReactComponentData {
  name?: string;
  props?: SerializableValue;
}

export interface ReactPropsData {
  components?: ReactComponentData[];
}

export interface ReactPropsResponse {
  id: string;
  props: ReactPropsData;
}
