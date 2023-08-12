// @ts-check
import { serializeRequest, serializeResponse } from '../Cache.mjs';

/**
 * @typedef Client
 * @property {function} send
 */

/**
 * Send data to WebSocket clients
 */
export default class Broadcaster {
  /**
   * @param {() => Set<Client>} clients
   */
  constructor(clients) {
    this.clients = clients;
    this.next = this.next.bind(this);
  }

  /**
   * @param {object} event
   * @param {string} event.type
   * @param {object} event.payload
   */
  async next(event) {
    let json;
    const namespace = event.type.split('.')[0];
    switch (namespace) {
      case 'cache': {
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
        break;
      }
      default:
        json = JSON.stringify(event);
    }

    if (json) {
      this.clients().forEach((client) => client.send(json));
    }
  }

  /**
   * @param {import('../Emitter.mjs').default} observable
   */
  broadcast(observable) {
    observable.subscribe(this.next);
  }
}
