import _debug from 'debug';
import noop from '../noop.mjs';
import resetServer from './reset.mjs';
import { serializeRequest, serializeResponse } from '../cache.mjs';
import { enter } from '../store.mjs';
import cacheRouter from './routes/cache.route.mjs';
import resetRouter from './routes/reset.route.mjs';
import configRouter from './routes/config.route.mjs';

const debug = _debug('jambox.backend');

const backend = async (svc, config) => {
  const sendAll = (event) => {
    const json = JSON.stringify(event);
    svc.ws.getWss('/').clients.forEach((client) => client.send(json));
  };

  const reset = async () => {
    debug(`Reset`);

    sendAll({ type: 'config', payload: config.serialize() });
    await svc.proxy.reset();
    await resetServer(svc, config);

    await svc.cache.reset({
      ...config.cache,
    });
  };

  svc.app.use((req, res, next) => {
    enter({ services: svc, sendAll, reset, config }, next);
  });

  svc.app.get('/', (_, res) => res.send('OK'));

  svc.app.use('/api', configRouter);
  svc.app.use('/api', cacheRouter);
  svc.app.use('/api', resetRouter);
  // enable websocket connects
  svc.app.ws('/', noop);

  // eslint-disable-next-line
  svc.app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    debug(err.message, err.stack);
    res.status(statusCode).json({ error: err.message, stack: err.stack });
  });

  await config.subscribe({
    next() {
      reset();
    },
  });

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
