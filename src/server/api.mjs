import _debug from 'debug';
import fs from 'fs';
import deepmerge from 'deepmerge';
import getConfig from '../config.mjs';
import setupHandlers from './handlers.mjs';
import debounce from '../utils/debounce.mjs';
import { serializeRequest, serializeResponse } from '../cache.mjs';
import { getVersion } from '../constants.mjs';

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
  const sendAll = (event) => {
    const json = JSON.stringify(event);
    svc.ws.getWss('/').clients.forEach((client) => client.send(json));
  };

  let configWatcher = null;

  const reset = async () => {
    debug(`Reset`);

    sendAll({ type: 'config', payload: config.value });
    await svc.proxy.reset();
    await setupHandlers(svc, config);

    await svc.cache.reset({
      ...config.value?.cache,
    });
  };

  svc.app.get('/', async (_, res) => res.send(getVersion()));
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

  svc.app.get('/api/cache', async (_, res) => {
    const raw = svc.cache.all();
    const all = {};
    for (const id in raw) {
      const { request, response, ...rest } = raw[id];
      all[id] = {
        ...rest,
        request: await serializeRequest(request),
        response: await serializeResponse(response),
      };
    }
    res.send(all);
  });

  svc.app.post('/api/cache', async (req, res) => {
    try {
      const { action } = req.body;

      if (action.type === 'delete') {
        const errors = await svc.cache.delete(action.payload || []);

        res.status(200).send({ errors });
      } else if (action.type === 'update') {
        await svc.cache.update(action.payload);
        res.sendStatus(200);
      } else if (action.type === 'persist') {
        await svc.cache.persist(action.payload);
        res.sendStatus(200);
      } else {
        res.status(400).send('unknown action');
      }
    } catch (e) {
      res.status(500).send(e.stack);
    }
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

  // enable websocket connects
  svc.app.ws('/', () => {});
  svc.cache.subscribe({
    async next(event) {
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

      svc.ws.getWss('/').clients.forEach((client) => {
        client.send(JSON.stringify(data));
      });
    },
  });
};

export default backend;
