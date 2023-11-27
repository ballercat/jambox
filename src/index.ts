// Typedoc entrypoint and where types are improted from into js

export type ProxyInfo = {
  http: string;
  https: string;
  env: object;
};
export type SerializedConfig = {
  serverURL: string;
  paused: boolean;
  blockNetworkRequests: boolean;
  cwd: string;
  forward: object;
  cache: object;
  trust: Array<string>;
  stub: object;
  proxy: ProxyInfo;
  noProxy: Array<string>;
};

export type ForwardOption =
  | {
      /**
       * Target host to send traffic to. Must be a valid URL.
       */
      target: string;
      /**
       * What paths should requests be matched aggainst. Accepts globs.
       *
       * Use `**` to match all paths
       */
      paths: Array<string>;
      /**
       * Should websocket requests also be matched?
       *
       * Default value: false
       */
      websocket?: boolean;
    }
  | string;

type StatusCode = number;
/**
 * Stub Rule
 *
 * Either a status code or a config object
 */
export type StubOption =
  | StatusCode
  | {
      status: StatusCode;
      /**
       * Optional status message.
       *
       * Defaults to 'jambox stub'
       */
      statusMessage?: string;
      /**
       * File to respond with. Ignored if `body` is set
       *
       * Useful for image stubbing for example.
       */
      file?: string;
      /**
       * If networking is enabled this stub will be ingnored in favor of a
       * real response from a remote server
       */
      preferNetwork?: boolean;
      /**
       * A body to respond with. Must be an object if defined.
       */
      body?: object;
    };

/**
 * Cache options
 */
export type CacheOption = {
  stage?: Array<string>;
  ignore?: Array<string>;
};

/**
 * Jambox File Configuration
 *
 * The file which exports these values will be watched as the proxy is running.
 * Any changes to the config will be reflected on the already running proxy process.
 * Anytime a config is changed the proxy resets and reloads values from cache.
 */
export interface FileConfig {
  /**
   * Should the proxy allow for any network access.
   *
   * Once set to true, the proxy will not allow any outdoing responses. However
   * any requests which have a valid cache values will still respond with those
   * cached responses.
   */
  blockNetworkRequests: boolean;
  /**
   * Forwarding rules
   *
   * Accepts a key-value pair of Forward configs. Each key must be a valid URL.
   * The host of the provided URL will be matched across all requests inspected
   * by the Jambox proxy.
   */
  forward?: Record<string, ForwardOption>;
  /**
   * Stub rules
   *
   * Key-value pairs of globs of request paths with a matching StubRule.
   */
  stub?: Record<string, StubOption>;
  /**
   * Cache rules
   *
   * When falsy, caching is disabled.
   */
  cache?: CacheOption;
}
