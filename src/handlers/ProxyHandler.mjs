// @ts-nocheck
import mockttp from 'mockttp';

/**
 * Request handler that forwards requests to a target host.
 *
 * A thin wrapper around mockttp's `PassThroughHandler` that stores the
 * forwarding options for use in {@link ProxyHandler#explain}.
 *
 * @extends {mockttp.requestHandlers.PassThroughHandler}
 */
export default class ProxyHandler
  extends mockttp.requestHandlers.PassThroughHandler
{
  /** @type {object} */
  #options;

  /**
   * Creates a new ProxyHandler.
   *
   * @param {object} options - PassThrough options (forwarding target, SSL settings, etc.)
   * @param {object} [options.forwarding] - Forwarding configuration
   * @param {string} [options.forwarding.targetHost] - Target host URL
   * @param {boolean} [options.ignoreHostHttpsErrors] - Whether to ignore HTTPS cert errors
   */
  constructor(options) {
    super(options);
    this.#options = options;
  }

  /**
   * Returns a human-readable description of the handler configuration.
   *
   * @returns {string}
   */
  explain() {
    return `ProxyHandler ${JSON.stringify(this.#options)}`;
  }
}
