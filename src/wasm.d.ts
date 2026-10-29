// .wasm files are inlined into the bundle as bytes (esbuild "binary" loader).
declare module '*.wasm' {
  const bytes: Uint8Array<ArrayBuffer>;
  export default bytes;
}
