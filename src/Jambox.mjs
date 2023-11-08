// @ts-check
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
import { createDebug } from './diagnostics.js';

const debug = createDebug('core');

export default class Jambox extends Emitter {
  /**
   * @member {Cache}
   */
  cache;

  /**
   * @member {Config}
   */
  config;

  /**
   * @param {object} proxy
   * @param {string} port
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
        .asPriority(98)
        .thenReply(418, 'Network access disabled', '');
    }

    if (this.config.paused) {
      return;
    }

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

  record(setting) {
    return this.proxy.addRequestRule({
      priority: 100,
      matchers: [new CacheMatcher(this, setting)],
      handler: new CacheHandler(this),
    });
  }

  forward(setting) {
    return Promise.all(
      Object.entries(setting).map(async ([original, ...rest]) => {
        const options =
          typeof rest[0] === 'object'
            ? rest[0]
            : {
                target: rest[0],
              };

        const originalURL = new URL(original);
        const targetURL = new URL(
          options.target,
          // If the first argument of new URL() is a path the second argument is
          // used to establish a base of the url
          // https://developer.mozilla.org/en-US/docs/Web/API/URL/URL#parameters
          originalURL.protocol + '//' + originalURL.hostname
        );
        const useSSL =
          targetURL.port === '443' || targetURL.protocol === 'https:';
        const changeHosts = originalURL.host !== targetURL.host;

        const httpOptions = {
          ignoreHostHttpsErrors: true,
          forwarding: {
            targetHost: `http${useSSL ? 's' : ''}://${targetURL.host}`,
            updateHostHeader: changeHosts ? originalURL.host : false,
          },
        };

        const matchers = [
          new GlobMatcher(originalURL, { paths: options.paths || ['**'] }),
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
