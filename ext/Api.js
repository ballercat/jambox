// @ts-check
import Observable from 'zen-observable';
import { debounce } from './nodash.js';

/**
 * @typedef {import('./types').Subscribtion} Subscribtion
 */

const WEBSOCKET_RETRY_TIMER = 3000;

export default class API {
  /**
   * @type {?Subscribtion}
   * */
  #sub;
  /**
   * @type {WebSocket}
   */
  #ws;

  /**
   * @returns {Promise<API>}
   */
  static async create() {
    try {
      const runtimeConfigURL = chrome.runtime.getURL('runtime.json');
      const res = await fetch(runtimeConfigURL);
      const config = await res.json();

      return new API(config);
    } catch (e) {
      return new API({ host: 'localhost', port: 9000 });
    }
  }

  constructor({ host, port }) {
    this.socketURL = new URL(`ws://${host}:${port}`);
    this.apiURL = new URL(`http://${host}:${port}/api`);
    this.callbacks = new Set();
    this._listen = debounce(this._listen.bind(this), 10);
    this._listen();
  }

  /**
   * @private
   */
  _listen() {
    if (this.#ws && this.#ws.readyState <= 1) {
      return;
    }

    if (this.#sub != null) {
      this.#sub.unsubscribe();
    }

    try {
      this.#ws = new WebSocket(this.socketURL.toString());
      this.#ws.onerror = () => {
        setTimeout(this._listen, WEBSOCKET_RETRY_TIMER);
      };
      this.#ws.onopen = () => {
        this.observable = new Observable((observer) => {
          const listener = (event) => {
            try {
              const action = JSON.parse(event.data);
              observer.next(action);
            } catch (e) {
              observer.error(e);
            }
          };

          this.#ws.addEventListener('message', listener);

          return () => {
            this.#ws.removeEventListener('message', listener);
          };
        });

        this.#sub = this.observable.subscribe((...args) =>
          this.onMessage(...args)
        );
      };
      this.#ws.addEventListener('close', () => {
        setTimeout(this._listen, WEBSOCKET_RETRY_TIMER);
      });
    } catch (e) {
      setTimeout(this._listen, WEBSOCKET_RETRY_TIMER);
    }
  }

  /**
   * @param path {string}
   * @param data {object}
   */
  post(path, data) {
    return fetch(`${this.apiURL.toString()}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  onMessage(action) {
    for (const callback of this.callbacks) {
      callback(action);
    }
  }

  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * @param paused {boolean}
   */
  pause(paused) {
    return fetch(`${this.apiURL.toString()}/pause`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ paused }),
    });
  }

  /**
   * @param ids {Array<string>}
   */
  delete(ids) {
    return fetch(`${this.apiURL.toString()}/cache`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        action: {
          type: 'delete',
          payload: ids,
        },
      }),
    });
  }

  /**
   * @param id {string}
   */
  updateCache(id, { response }) {
    return this.post('/cache', {
      action: {
        type: 'update',
        payload: { id, response },
      },
    });
  }

  /**
   * @param ids {Array<string>}
   */
  persist(ids) {
    return this.post('/cache', { action: { type: 'persist', payload: ids } });
  }

  /**
   * @param blockNetworkRequests {boolean}
   */
  blockNetworkRequests(blockNetworkRequests) {
    return fetch(`${this.apiURL.toString()}/config`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({ blockNetworkRequests }),
    });
  }

  async getConfig() {
    const res = await fetch(`${this.apiURL.toString()}/config`);
    return res.json();
  }

  async getCache() {
    const res = await fetch(`${this.apiURL.toString()}/cache`);
    return res.json();
  }
}
