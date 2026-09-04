// @ts-nocheck
import { serializeRequest, serializeResponse } from '../Cache.mjs';

/**
 * A WebSocket client with a `send` method.
 *
 * @typedef {object} Client
 * @property {(data: string) => void} send - Send a JSON string to this client
 */

/**
 * Broadcasts Jambox events to connected WebSocket clients.
 *
 * Subscribes to an {@link Emitter} observable and forwards each event as a
 * JSON-serialized string to all active WebSocket clients. For `cache.*`
 * events, raw request/response objects are serialized before sending so
 * that they are safe to transmit over the wire.
 */
export default class Broadcaster {
  /**
   * Creates a new Broadcaster.
   *
   * @param {() => Set<Client>} clients - Factory that returns the current set of WebSocket clients
   */
  constructor(clients) {
    this.clients = clients;
    this.next = this.next.bind(this);
  }

  /**
   * Process and broadcast a single event to all connected clients.
   *
   * For `cache.*` namespace events, `request` and `response` objects are
   * serialized via {@link serializeRequest} / {@link serializeResponse} before
   * being JSON-stringified and broadcast.
   *
   * @param {object} event         - The event emitted by an {@link Emitter}
   * @param {string} event.type    - Namespaced event type (e.g. `'cache.commit'`)
   * @param {object} [event.payload] - Optional event payload
   * @returns {Promise<void>}
   */
  async next(event) {
    let json;
    const namespace = event.type.split('.')[0];

    if (namespace === 'cache') {
      const { request, response, ...rest } = event.payload || {};
      const data = {
        type: event.type,
        payload: {
          ...rest,
        },
      };

      if (request) {
        data.payload.request = await serializeRequest(request);
      }
      if (response) {
        data.payload.response = await serializeResponse(response);
      }

      json = JSON.stringify(data);
    } else {
      json = JSON.stringify(event);
    }

    this.clients().forEach((client) => client.send(json));
  }

  /**
   * Subscribe to an observable and broadcast all its events.
   *
   * @param {import('../Emitter.mjs').default} observable - An Emitter whose events should be broadcast
   */
  broadcast(observable) {
    observable.subscribe(this.next);
  }
}
