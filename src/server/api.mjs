import _debug from 'debug';
import fs from 'fs';
import deepmerge from 'deepmerge';
import getConfig from '../config.mjs';
import setupHandlers from './handlers.mjs';
import debounce from '../utils/debounce.mjs';

const debug = _debug('jambox.backend');

const getInfo = (svc, config) => {
  const url = new URL(svc.proxy.url);
  const proxy = {
    http: `http://${url.host}`,
    https: `https://${url.host}`,
    env: svc.proxy.proxyEnv,
  };
  return {
    ...config.value,
    proxy,
  };
};

const backend = async (svc, config) => {
  const sendAll = (event) =>
    svc.ws.getWss('/').clients.forEach((client) => {
      client.send(JSON.stringify(event));
    });
  const sendConfig = () =>
    sendAll({
      type: 'config',
      payload: config.value,
    });

  let configWatcher = null;

  const reset = async () => {
    debug(`Reset`);

    sendConfig();
    await svc.proxy.reset();
    await setupHandlers(svc, config);
    svc.cache.clear();

    if (config.value.cache?.dir) {
      svc.cache.read(config.value.cache.dir);
    }
  };

  svc.app.get('/', async (_, res) => res.send('OK'));
  svc.app.get('/api/config', async (_, res) => res.send(getInfo(svc, config)));
  // Bandaid solution (mostly) for testing purposes (does not persist to disk)
  svc.app.post('/api/config', async (req, res) => {
    try {
      config.value = deepmerge(config.value, req.body);
      await reset();

      res.sendStatus(200);
    } catch (e) {
      res.status(500).send(e.stack);
    }
  });

  // Maybe a tad bit unnecessary if /api/config can do the same thing, but it's
  // nice to have a specific endpoint for a specific action also :shrug:
  svc.app.post('/api/pause', async (req, res) => {
    try {
      const { paused } = req.body;
      config.value = {
        ...config.value,
        paused,
      };
      await reset();

      res.sendStatus(200);
    } catch (e) {
      res.status(500).send(e.stack);
    }
  });

  svc.app.get('/api/cache', (_, res) => {
    res.send(svc.cache.all());
  });

  svc.app.post('/api/reset', async (req, res) => {
    try {
      const setupWatcher = req.body.cwd !== config.value.cwd;
      config.value = getConfig({}, req.body.cwd);

      // Read a config from cwd
      await reset();

      if (setupWatcher) {
        configWatcher?.removeAllListeners();
        configWatcher = null;

        configWatcher = fs.watch(
          config.value.filepath,
          debounce(() => {
            config.value = getConfig({}, config.value.cwd);
            reset();
          })
        );
      }

      res.status(200).send(getInfo(svc, config));
    } catch (e) {
      res.status(500).send({ error: e.stack });
    }
  });

  svc.app.ws('/', (ws) => {
    ws.on('message', async (msg) => {
      try {
        const { type, payload } = JSON.parse(msg);

        switch (type) {
          case 'write': {
            const { hash } = payload;
            if (config.value.cache?.dir) {
              debug(`Cannot write ${hash} no cache directory set`);
              return;
            }
            svc.cache.write(svc.config.value.cacheDir, hash);
            break;
          }
        }
      } catch (error) {
        debug(error);
      }
    });
  });

  svc.cache.subscribe({
    next(event) {
      const data = {
        type: event.type,
        payload: {},
      };
      if (event.payload?.request) {
        const { body, ...request } = event.payload.request;
        data.payload.request = request;
      }
      if (event.payload?.response) {
        const { body, ...response } = event.payload.response;
        data.payload.response = response;
      }

      svc.ws.getWss('/').clients.forEach((client) => {
        client.send(JSON.stringify(data));
      });
    },
  });
};

export default backend;
