// @ts-check
import fs from 'fs';
import path from 'path';
import _debug from 'debug';
import express from 'express';
import expessWS from 'express-ws';
import bodyParser from 'body-parser';
import mockttp from 'mockttp';
import { PROJECT_ROOT } from '../constants.mjs';
import Jambox from '../Jambox.mjs';
import noop from '../noop.mjs';
import { enter } from '../store.mjs';
import Broadcaster from './Broadcaster.mjs';
import cacheRouter from './routes/cache.route.mjs';
import resetRouter from './routes/reset.route.mjs';
import configRouter from './routes/config.route.mjs';

const debug = _debug('jambox');

async function start({ port, nodeProcess = process, filesystem = fs }) {
  nodeProcess.on('exit', (code) => {
    debug(`Shutting down, code: ${code}`);
  });

  const proxy = mockttp.getLocal({
    cors: true,
    recordTraffic: false,
    suggestChanges: false,
    https: {
      key: filesystem
        .readFileSync(path.join(PROJECT_ROOT, 'testCA.key'))
        .toString(),
      cert: filesystem
        .readFileSync(path.join(PROJECT_ROOT, 'testCA.pem'))
        .toString(),
    },
  });
  await proxy.start();
  const jambox = new Jambox(proxy, port);
  await jambox.reset();

  const app = express();
  const ws = expessWS(app);

  const broadcaster = new Broadcaster(() => ws.getWss().clients);
  broadcaster.broadcast(jambox.cache);
  broadcaster.broadcast(jambox.config);
  broadcaster.broadcast(jambox);

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.get('/shutdown', async (req, res) => {
    await proxy.stop();

    res.send('Shutting down.');

    nodeProcess.exit(0);
  });
  app.use((req, res, next) => enter({ jambox }, next));
  app.get('/', (_, res) => res.send('OK'));

  app.use('/api', configRouter);
  app.use('/api', cacheRouter);
  app.use('/api', resetRouter);
  // enable websocket connects
  // @ts-ignore
  app.ws('/', noop);

  // eslint-disable-next-line
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    debug(err.message, err.stack);
    res.status(statusCode).json({ error: err.message, stack: err.stack });
  });

  app.listen(port, () =>
    debug(`Jambox ${jambox.config.serverURL}. Proxy ${proxy.url}`)
  );

  return app;
}

export default start;
