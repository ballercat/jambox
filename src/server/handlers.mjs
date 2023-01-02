import _debug from 'debug';
import minimatch from 'minimatch';
import mockttp from 'mockttp';
import Cache from '../cache.mjs';

const debug = _debug('jambox.handlers');

const checkGlobs = (url, globs) => {
  for (let i = 0; i < globs.length; i++) {
    if (!minimatch(url.pathname, globs[i])) {
      return false;
    }
  }

  return true;
};

const pathGlobMatcher = (target, options) => (request) => {
  const url = new URL(request.url);
  if (target !== '*' && target.hostname !== url.hostname) {
    return false;
  }

  return checkGlobs(url, options.paths);
};

class CacheMatcher extends mockttp.matchers.CallbackMatcher {
  #options = null;

  constructor(svc, options) {
    const matchPaths = pathGlobMatcher(options.host, options);
    super(async (request) => {
      if (svc.cache.bypass()) {
        return false;
      }

      const matches = matchPaths(request);
      const hash = await Cache.hash(request);

      if (!matches || !svc.cache.has(hash)) {
        return false;
      }

      return true;
    });
    this.#options = options;
  }

  explain() {
    return `CacheMatcher ${JSON.stringify(this.#options)}`;
  }
}

class GlobMatcher extends mockttp.matchers.CallbackMatcher {
  #target = null;
  #options = null;

  constructor(target, options) {
    super(pathGlobMatcher(target, options));

    this.#target = target;
    this.#options = {
      target,
      ...options,
    };
  }
  explain() {
    return `GlobMatcher ${JSON.stringify(this.#options)}`;
  }
}

class ProxyHandler extends mockttp.requestHandlers.PassThroughHandler {
  #options = null;
  constructor(options) {
    super(options);
    this.#options = options;
  }

  explain() {
    return `ProxyHandler ${JSON.stringify(this.#options)}`;
  }
}

class CacheHandler extends mockttp.requestHandlers.CallbackHandler {
  constructor(svc) {
    const callback = async (completedRequest) => {
      try {
        const hash = await Cache.hash(completedRequest);
        const { response } = svc.cache.get(hash);
        return {
          headers: {
            ...response.headers,
            'x-jambox-hash': hash,
          },
          json: response.json,
          rawBody: response.body.buffer,
          status: response.status,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
        };
      } catch (e) {
        throw new Error('Error');
      }
    };

    super(callback);
  }
  explain() {
    return `CacheHandler return a response from cache`;
  }
}

export const record = async (svc, config) => {
  const all = {
    '*': {
      paths: ['**'],
    },
    ...config.value?.cache,
  };
  await Promise.all(
    Object.entries(all).map(([original, ...rest]) => {
      const options = typeof rest[0] === 'object' ? rest[0] : {};

      options.host = original;
      return svc.proxy.addRequestRule({
        priority: 100,
        matchers: [new CacheMatcher(svc, options)],
        handler: new CacheHandler(svc),
      });
    })
  );
};

export const forward = (svc, config) => {
  return Promise.all(
    Object.entries(config.value.forward).map(async ([original, ...rest]) => {
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
        ignoreHostHttpsErrors: [
          changeHosts ? targetURL.host : originalURL.host,
        ],
        forwarding: {
          targetHost: `http${useSSL ? 's' : ''}://${targetURL.host}`,
          updateHostHeader: changeHosts ? originalURL.host : false,
        },
      };

      const matchers = [
        new GlobMatcher(originalURL, { paths: options.paths || ['**'] }),
      ];

      await svc.proxy.addRequestRule({
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

        await svc.proxy.addWebSocketRule({
          matchers,
          handler: new mockttp.webSocketHandlers.PassThroughWebSocketHandler(
            wsOptions
          ),
        });
      }
    })
  );
};

export const auto = (svc, config) => {
  return Promise.all(
    Object.entries(config.value.auto).map(async ([path, value]) => {
      const options = typeof value === 'object' ? value : { status: value };
      await svc.proxy.addRequestRule({
        matchers: [new GlobMatcher('*', { paths: [path] })],
        handler: new mockttp.requestHandlers.SimpleHandler(
          options.status,
          options.statusMessage || 'jambox auto-mock',
          options.data || null
        ),
      });
    })
  );
};

// Tracks requests & responses
// does not change behavior of seen requests
const events = (svc, config) => {
  const shouldStage = (url) => {
    if (svc.cache.bypass() || config.value.blockNetworkRequests) {
      return false;
    }

    if (config.value.cacheEverything) {
      return true;
    }

    const ignoreList = config.value.cache?.ignore || [];
    const stageList = config.value.cache?.stage || [];

    if (ignoreList.some((glob) => minimatch(url.pathname, glob))) {
      return false;
    }

    return stageList.some((glob) => minimatch(url.pathname, glob));
  };

  const onRequest = async (request) => {
    try {
      const url = new URL(request.url);
      const hash = await Cache.hash(request);
      const cached = svc.cache.has(hash);
      const staged = cached ? false : shouldStage(url);

      if (staged) {
        svc.cache.add(request);
      }

      const message = JSON.stringify({
        type: 'request',
        payload: {
          id: request.id,
          url: request.url,
          hash,
          cached,
          staged,
          headers: request.headers,
          status: request.status,
          statusCode: request.statusCode,
          statusMessage: request.statusMessage,
          ...request.timingEvents,
        },
      });

      svc.ws.getWss('/').clients.forEach((client) => client.send(message));
    } catch (e) {
      debug(`Request Event Error: ${e.stack}`);
    }
  };

  const onResponse = async (response) => {
    try {
      const text = await response.body.getText();
      const sizeInBytes = text.length;

      if (!svc.cache.bypass() && svc.cache.hasStaged(response)) {
        const hash = await svc.cache.commit(response);
        if (config.value.cache.write === 'auto') {
          svc.cache.write(config.value.cache.dir, hash);
        }
      }

      const message = JSON.stringify({
        type: 'response',
        payload: {
          id: response.id,
          sizeInBytes,
          status: response.status,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          ...response.timingEvents,
        },
      });
      svc.ws.getWss('/').clients.forEach((client) => client.send(message));
    } catch (e) {
      debug(`Response Event Error: ${e.stack}`);
    }
  };

  svc.proxy.on('request', onRequest);
  svc.proxy.on('response', onResponse);
};

export default async function handlers(svc, config) {
  await events(svc, config);

  await record(svc, config);

  if (!config.value.blockNetworkRequests) {
    await svc.proxy
      .forAnyRequest()
      .asPriority(98)
      .thenPassThrough({
        ignoreHostHttpsErrors: [...(config.value.trust || [])],
      });
  }

  if (config.value.forward) {
    await forward(svc, config);
  }

  if (config.value.auto) {
    await auto(svc, config);
  }
}
