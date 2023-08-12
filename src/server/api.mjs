import _debug from 'debug';
import noop from '../noop.mjs';
import resetServer from './reset.mjs';
import { enter } from '../store.mjs';
import Broadcaster from './Broadcaster.mjs';
import cacheRouter from './routes/cache.route.mjs';
import resetRouter from './routes/reset.route.mjs';
import configRouter from './routes/config.route.mjs';

const debug = _debug('jambox.backend');

const backend = async (svc, config) => {
  const broadcaster = new Broadcaster(() => svc.ws.getWss().clients);
  const sendAll = (event) => {
    const json = JSON.stringify(event);
    svc.ws.getWss('/').clients.forEach((client) => client.send(json));
  };

  const reset = async () => {
    debug(`Reset`);
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

  config.subscribe(reset);

  broadcaster.broadcast(svc.cache);
  broadcaster.broadcast(config);
};

export default backend;
