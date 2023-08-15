// @ts-check
import Observable from 'zen-observable';

export default class Emitter {
  #observers = new Set();
  #observer;
  /**
   * @param {string} namespace
   */
  constructor(namespace) {
    this.namespace = namespace;
    this.#observer = new Observable((observer) => {
      this.#observers.add(observer);

      return () => this.#observers.delete(observer);
    });
    this.subscribe = this.#observer.subscribe.bind(this.#observer);
  }

  /**
   * @param {string} type
   * @param {object=} payload
   */
  dispatch(type, payload) {
    const event = { type: `${this.namespace}.${type}` };
    if (typeof payload !== 'undefined') {
      event.payload = payload;
    }
    for (const observer of this.#observers) {
      observer.next(event);
    }
  }

  /**
   * @param {string} eventName
   *
   * @return {Promise<void>}
   */
  once(eventName) {
    return new Promise((resolve) => {
      const observable = this.subscribe((event) => {
        if (event.type === eventName) {
          observable.unsubscribe();
          resolve();
        }
      });
    });
  }
}
