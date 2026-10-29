import init, { type Decancer } from '../../vendor/decancer/decancer.min.js';
import wasmBytes from '../../vendor/decancer/decancer.wasm';

export type {
  CuredString,
  Decancer,
} from '../../vendor/decancer/decancer.min.js';

// The in-flight (or finished) load. Storing the *promise* rather than the result means
// callers that arrive mid-load wait on the same load instead of starting a second one.
let loading: Promise<Decancer> | undefined;
let loaded: Decancer | undefined;

/**
 * Loads the decancer WASM module. Safe to call any number of times; only the first call does work.
 * Await this once at startup before anything calls {@link getDecancer}.
 */
export function loadDecancer(): Promise<Decancer> {
  if (!loading) {
    const attempt = init(wasmBytes).then((decancer) => (loaded = decancer));
    // forget a failed attempt so a later call can retry instead of getting the same rejection forever
    attempt.catch(() => {
      if (loading === attempt) loading = undefined;
    });
    loading = attempt;
  }
  return loading;
}

/**
 * Returns the loaded decancer function synchronously.
 * @throws if {@link loadDecancer} hasn't finished yet. That's a startup-ordering bug, not a runtime condition.
 */
export function getDecancer(): Decancer {
  if (!loaded) {
    throw new Error('decancer is not loaded yet; await loadDecancer() first');
  }
  return loaded;
}
