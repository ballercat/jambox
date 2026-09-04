// @ts-nocheck
import fs from 'fs';
import minimatch from 'minimatch';
import mockttp from 'mockttp';
import Emitter from './Emitter.mjs';
import Cache, { serializeRequest, serializeResponse } from './Cache.mjs';
import Config from './Config.mjs';
import CacheMatcher from './matchers/CacheMatcher.mjs';
import GlobMatcher from './matchers/GlobMatcher.mjs';
import CacheHandler from './handlers/CacheHandler.mjs';
import ProxyHandler from './handlers/ProxyHandler.mjs';
import { createDebug } from './diagnostics.cjs';

const debug = createDebug('core');

/**
 * Jambox core orchestrator.
 *
 * Ties together the mockttp proxy, {@link Config} and {@link Cache}:
 *
 * - Applies forwarding rules ({@link Jambox#forward})
 * - Applies stub rules ({@link Jambox#stub})
 * - Records and replays cached traffic ({@link Jambox#record})
 * - Emits `jambox.request`, `jambox.response`, `jambox.abort` and
 *   `jambox.reset` events for the UI/WebSocket broadcaster
 *
 * A config update triggers a full {@link Jambox#reset} which re-applies
 * all rules from the current config.
 *
 * @extends {Emitter}
 */
export default class Jambox extends Emitter {
  /**
   * Request/response cache managed by jambox.
   *
   * @member {Cache}
   */
  cache;

  /**
   * Runtime configuration.
   *
   * @member {Config}
   */
  config;

  /**
   * Creates a new Jambox instance bound to a mockttp proxy.
   *
   * @param {object} proxy - A started mockttp instance (`mockttp.getLocal()`)
   * @param {string} port  - Port the jambox management server listens on
   */
  constructor(proxy, port) {
    super('jambox');

    const proxyURL = new URL(proxy.url);
    const config = new Config({
      port,
      proxy: {
        http: `http://${proxyURL.host}`,
        https: `https://${proxyURL.host}`,
        env: proxy.proxyEnv,
      },
    });

    this.config = config;
    this.cache = new Cache();
    this.proxy = proxy;

    this.onAbort = this.onAbort.bind(this);
    this.onRequest = this.onRequest.bind(this);
    this.onResponse = this.onResponse.bind(this);
    this.reset = this.reset.bind(this);

    this.config.subscribe(this.reset);
  }

  /**
   * Tear down and re-apply all proxy rules from the current config.
   *
   * Resets the proxy and cache, then re-applies (in order):
   * 1. Pass-through (or network-blocking) defaults
   * 2. Cache recording/replay rules (unless paused)
   * 3. Forwarding rules (unless paused)
   * 4. Stub rules (unless paused)
   *
   * Emits `jambox.reset` when finished.
   */
  async reset() {
    debug('Reset');

    await this.proxy.reset();
    await this.cache.reset({ ...this.config.cache });

    this.proxy.on('abort', this.onAbort);
    this.proxy.on('request', this.onRequest);
    this.proxy.on('response', this.onResponse);

    if (!this.config.blockNetworkRequests) {
      await this.proxy
        .forAnyRequest()
        .asPriority(98)
        .thenPassThrough({
          // Trust any hosts specified.
          ignoreHostHttpsErrors: Array.from(this.config.trust),
        });
    } else {
      await this.proxy
        .forAnyRequest()
        .matching((req) => {
          const url = new URL(req.url);
          return url.hostname !== 'localhost';
        })
        .asPriority(98)
        .thenReply(418, 'Network access disabled', '');

      // Even if network access is disabled, allow localhost requests (for any port).
      // Priority set to 1 in-case the user want's to override this behavior
      // See https://github.com/ballercat/jambox/issues/42
      await this.proxy
        .forAnyRequest()
        .matching((req) => {
          const url = new URL(req.url);
          return url.hostname === 'localhost';
        })
        .asPriority(1)
        .thenPassThrough();
    }

    if (!this.config.paused) {
      if (this.config.cache) {
        await this.record(this.config.cache);
      }

      if (this.config.forward) {
        await this.forward(this.config.forward);
      }

      if (this.config.stub) {
        await this.stub(this.config.stub);
      }
    }

    this.dispatch('reset');
  }

  /**
   * Register cache record/replay rules on the proxy.
   *
   * Requests matching the cache `stage` globs are handled by
   * {@link CacheHandler}, which replays cached responses when available.
   *
   * @param {{ stage?: string[], ignore?: string[] }} setting - Cache settings from config
   * @returns {Promise<void>}
   */
  record(setting) {
    return this.proxy.addRequestRule({
      priority: 100,
      matchers: [new CacheMatcher(this, setting)],
      handler: new CacheHandler(this),
    });
  }

  /**
   * Register forwarding rules on the proxy.
   *
   * Accepts either an array of `{ match, target, ... }` entries or the
   * config's key-value `forward` map. Each rule matches requests by host
   * and path globs ({@link GlobMatcher}) and proxies them to the target
   * host via {@link ProxyHandler}.
   *
   * Optional per-rule behavior:
   * - `cors` — answers `OPTIONS` preflights and appends CORS headers
   * - `debug` — logs matched requests
   * - `websocket` — also proxies WebSocket connections
   *
   * @param {object|Array<object>} setting - Forward rules from config
   * @returns {Promise<void[]>}
   */
  forward(setting) {
    let entries;
    if (Array.isArray(setting)) {
      entries = setting;
    } else {
      entries = Object.entries(setting).map(([match, ...rest]) => {
        const options =
          typeof rest[0] === 'object'
            ? rest[0]
            : {
                target: rest[0],
              };
        return {
          match,
          ...options,
        };
      });
    }
    return Promise.all(
      entries.map(async (options) => {
        const originalURL = new URL(options.match);
        const targetURL = new URL(
          options.target,
          // If the first argument of new URL() is a path the second argument is
          // used to establish a base of the url
          // https://developer.mozilla.org/en-US/docs/Web/API/URL/URL#parameters
          originalURL.protocol + '//' + originalURL.hostname
        );
        const useSSL =
          targetURL.port === '443' || targetURL.protocol === 'https:';

        const httpOptions = {
          ignoreHostHttpsErrors: true,
          forwarding: {
            targetHost: `http${useSSL ? 's' : ''}://${targetURL.host}`,
            updateHostHeader: true,
          },
        };

        if (options.cors) {
          httpOptions.beforeResponse = (res) => {
            return {
              ...res,
              headers: {
                'access-control-allow-origin': '*',
                ...res.headers,
              },
            };
          };

          const optionsHeaders =
            typeof options.cors === 'object'
              ? options.cors
              : {
                  'access-control-allow-origin': '*',
                  'access-control-allow-methods':
                    'GET, POST, PUT, DELETE, OPTIONS',
                  'access-control-allow-headers': '*',
                  'access-control-max-age': 600,
                };
          await this.proxy
            .forAnyRequest()
            .forHost(originalURL.host)
            .matching((request) => {
              if (request.method !== 'OPTIONS') {
                return false;
              }

              return true;
            })
            .asPriority(101)
            .thenJson(204, {}, optionsHeaders);
        }
        if (options.debug) {
          httpOptions.beforeRequest = (req) => {
            debug(`[${originalURL.host}] ${req.path} match`);
            return req;
          };
        }

        const matchers = [
          new GlobMatcher(originalURL, {
            paths: options.paths || ['**'],
          }),
        ];

        await this.proxy.addRequestRule({
          priority: 99,
          matchers,
          handler: new ProxyHandler(httpOptions),
        });

        if (options.websocket) {
          const wsOptions = {
            forwarding: {
              targetHost: `ws://${targetURL.host}`,
            },
          };

          await this.proxy.addWebSocketRule({
            matchers,
            handler: new mockttp.webSocketHandlers.PassThroughWebSocketHandler(
              wsOptions
            ),
          });
        }
      })
    );
  }

  /**
   * Register stub rules on the proxy.
   *
   * Maps each config `stub` entry (glob path → status code or
   * `{ status, body?, file?, statusMessage?, preferNetwork? }`) to a
   * mockttp `SimpleHandler` that replies with the configured response.
   *
   * Entries with `preferNetwork` are skipped while network access is enabled.
   *
   * @param {Record<string, import('./index.ts').StubOption>} setting - Stub rules from config
   * @returns {Promise<(void|undefined)[]>}
   */
  stub(setting) {
    return Promise.all(
      Object.entries(setting).map(([path, value]) => {
        const options = typeof value === 'object' ? value : { status: value };
        if (options.preferNetwork && !this.config.blockNetworkRequests) {
          return;
        }

        let response = Buffer.from('');
        if (options.file) {
          response = fs.readFileSync(options.file);
        } else if (options.body && typeof options.body === 'object') {
          response = Buffer.from(JSON.stringify(options.body));
        }

        return this.proxy.addRequestRule({
          priority: 99,
          matchers: [new GlobMatcher('*', { paths: [path] })],
          handler: new mockttp.requestHandlers.SimpleHandler(
            options.status,
            options.statusMessage || (options.file ? 'OK' : 'jambox stub'),
            response
          ),
        });
      })
    );
  }

  /**
   * Determine whether a request URL should be staged for caching.
   *
   * A URL is stageable when caching is active (not bypassed, network not
   * blocked), it matches a `cache.stage` glob, and it does not match any
   * `cache.ignore` glob.
   *
   * @param {URL} url - Parsed request URL
   * @returns {boolean}
   */
  shouldStage(url) {
    if (this.cache.bypass() || this.config.blockNetworkRequests) {
      return false;
    }

    const ignoreList = this.config.cache?.ignore || [];
    const stageList = this.config.cache?.stage || [];

    const matchValue = url.hostname + url.pathname;
    if (
      ignoreList.some((/** @type {string} */ glob) =>
        minimatch(matchValue, glob)
      )
    ) {
      return false;
    }

    return stageList.some((/** @type {string} */ glob) =>
      minimatch(matchValue, glob)
    );
  }

  /**
   * Proxy `request` event handler.
   *
   * Stages the request for caching when applicable and dispatches a
   * `jambox.request` event with the serialized request plus `hash`,
   * `cached` and `staged` flags.
   *
   * @param {import('mockttp').CompletedRequest} request
   */
  async onRequest(request) {
    try {
      const url = new URL(request.url);
      const hash = await Cache.hash(request);
      const cached = this.cache.has(hash);
      const staged = cached ? false : this.shouldStage(url);

      if (staged) {
        this.cache.add(request);
      }

      const serialized = await serializeRequest(request);

      this.dispatch('request', {
        ...serialized,
        hash,
        cached,
        staged,
      });
    } catch (e) {
      debug(`Request Event Error: ${e.stack}`);
    }
  }

  /**
   * Proxy `response` event handler.
   *
   * Commits the response to the cache when its request was staged, and
   * dispatches a `jambox.response` event with the serialized response.
   *
   * @param {import('mockttp').CompletedResponse} response
   */
  async onResponse(response) {
    try {
      if (!this.cache.bypass() && this.cache.hasStaged(response)) {
        await this.cache.commit(response);
      }

      const payload = await serializeResponse(response);
      this.dispatch('response', payload);
    } catch (e) {
      debug(`Response Event Error: ${e.stack}`);
    }
  }

  /**
   * Proxy `abort` event handler.
   *
   * Un-stages the aborted request from the cache and dispatches a
   * `jambox.abort` event.
   *
   * @param {import('mockttp').CompletedRequest} abortedRequest
   */
  async onAbort(abortedRequest) {
    if (this.cache.hasStaged(abortedRequest)) {
      this.cache.abort(abortedRequest);
    }
    this.dispatch('abort', {
      id: abortedRequest.id,
      url: abortedRequest.url,
      headers: abortedRequest.headers,
      ...abortedRequest.timingEvents,
    });
  }
}
