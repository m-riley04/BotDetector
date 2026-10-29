import { TextDecoder, TextEncoder } from 'util';

// jsdom doesn't provide these, but decancer's WASM glue needs them at import time.
// Runs via `setupFiles`, i.e. before tests/setup.ts imports decancer.
Object.assign(globalThis, {
  TextDecoder: globalThis.TextDecoder ?? TextDecoder,
  TextEncoder: globalThis.TextEncoder ?? TextEncoder,
});
