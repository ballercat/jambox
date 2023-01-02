import _debug from 'debug';
import deepmerge from 'deepmerge';
import setupHandlers from './handlers.mjs';

const debug = _debug('jambox.backend');

const getConfig = (svc, config) => {
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

  svc.app.get('/', async (_, res) => res.send('OK'));
  svc.app.get('/api/config', async (_, res) =>
    res.send(getConfig(svc, config))
  );
  svc.app.get('/api/cache', (_, res) => {
    res.send(svc.cache.all());
  });

  svc.app.post('/api/config', async (req, res) => {
    try {
      await svc.proxy.reset();
      config.value = deepmerge(config.value, req.body);

      await setupHandlers(svc, config);
      sendConfig();

      res.sendStatus(200);
    } catch (e) {
      res.status(500).send(e.stack);
    }
  });
  svc.app.post('/api/reset', async (req, res) => {
    debug('Reset');
    try {
      await svc.proxy.reset();

      config.value = { ...req.body };

      await setupHandlers(svc, config);
      svc.cache.clear();

      if (config.value.cache.dir) {
        svc.cache.read(config.value.cache.dir);
      }

      res.status(200).send(getConfig(svc, config));
    } catch (e) {
      res.status(500).send({ error: e.stack });
    }
  });

  svc.app.ws('/', (ws) => {
    ws.on('message', async (msg) => {
      try {
        const { type, payload } = JSON.parse(msg);

        switch (type) {
          case '__sub': {
            sendConfig();
            break;
          }
          case 'config': {
            await svc.proxy.reset();

            config.value = deepmerge(config.value, payload);

            await setupHandlers(svc, config);

            sendConfig();
            break;
          }
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
