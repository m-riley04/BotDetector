import type { SerializableValue } from './types';

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
