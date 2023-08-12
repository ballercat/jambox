import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

export const enter = (store, fn) => storage.run(store, fn);
export const store = () => storage.getStore();
export const jambox = () => storage.getStore().jambox;
