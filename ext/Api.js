// @ts-check
import Observable from 'zen-observable';

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
    this._listen();
  }

  _listen() {
    if (this.#ws && this.#ws.readyState <= 1) {
      return;
    }

    if (this.#sub != null) {
      this.#sub.unsubscribe();
    }

    const boundListen = this._listen.bind(this);

    try {
      this.#ws = new WebSocket(this.socketURL.toString());
      this.#ws.onerror = () => {
        setTimeout(boundListen, WEBSOCKET_RETRY_TIMER);
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
        setTimeout(boundListen, WEBSOCKET_RETRY_TIMER);
      });
    } catch (e) {
      console.error(e.name, e);
      setTimeout(boundListen, WEBSOCKET_RETRY_TIMER);
    }
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
