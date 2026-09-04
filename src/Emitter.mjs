// @ts-nocheck
import Observable from 'zen-observable';

/**
 * Namespaced event emitter backed by a zen-observable stream.
 *
 * Events dispatched via {@link Emitter#dispatch} are prefixed with the
 * emitter's namespace (e.g. namespace `cache` + type `commit` produces
 * the event type `cache.commit`) and pushed to all subscribers.
 *
 * The instance itself is subscribable (`emitter.subscribe(observer)`)
 * since the observable's `subscribe` method is bound onto it.
 */
export default class Emitter {
  #observers = new Set();
  #observer;
  /**
   * Creates a new Emitter with the given event namespace.
   *
   * @param {string} namespace - Prefix for all dispatched event types
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
   * Dispatch an event to all subscribers.
   *
   * @param {string} type    - Event type (prefixed with the emitter namespace)
   * @param {object=} payload - Optional event payload attached as `event.payload`
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
   * Resolve a promise the next time the given event is dispatched.
   *
   * @param {string} eventName - Fully-qualified event type (e.g. `'jambox.reset'`)
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
