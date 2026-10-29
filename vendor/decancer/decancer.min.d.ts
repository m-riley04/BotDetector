// Hand-written types for the vendored (patched) decancer WASM loader.
// Only the parts this project uses are declared; see upstream docs for the full API.

export interface CuredString {
  toString(): string;
  equals(other: string): boolean;
  contains(other: string): boolean;
  startsWith(other: string): boolean;
  endsWith(other: string): boolean;
  /** Releases the WASM-side memory. The JS garbage collector does not do this for you. */
  free(): void;
}

export type Decancer = (input: string, options?: Record<string, boolean> | number) => CuredString;

/** Instantiates the WASM module from raw bytes. Upstream caches the instance after the first resolve. */
export default function init(wasmBytes: BufferSource): Promise<Decancer>;
