import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

/**
 * Run `fn` with a store available via {@link store} for the duration of its
 * async execution context.
 *
 * @template T
 * @param {{ jambox: object }} storeValue - Context passed to the server route handlers
 * @param {() => T} fn - Function to run within the store context
 * @returns {T} Result of `fn`
 */
export const enter = (store, fn) => storage.run(store, fn);

/**
 * Get the current async context store (or `undefined` outside of {@link enter}).
 *
 * @returns {{ jambox: object }|undefined}
 */
export const store = () => storage.getStore();

/**
 * Convenience accessor for the active Jambox instance.
 *
 * Must be called from within an {@link enter} context (i.e. inside a
 * request handled by the jambox server).
 *
 * @returns {import('./Jambox.mjs').default}
 */
export const jambox = () => storage.getStore().jambox;
