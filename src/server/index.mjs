// @ts-nocheck
import * as fs from 'node:fs';
import * as path from 'node:path';
import express from 'express';
import expessWS from 'express-ws';
import bodyParser from 'body-parser';
import * as mockttp from 'mockttp';
import { PROJECT_ROOT, getVersion } from '../constants.mjs';
import Jambox from '../Jambox.mjs';
import noop from '../noop.mjs';
import { enter } from '../store.mjs';
import Broadcaster from './Broadcaster.mjs';
import cacheRouter from './routes/cache.route.mjs';
import resetRouter from './routes/reset.route.mjs';
import configRouter from './routes/config.route.mjs';
import { createDebug } from '../diagnostics.cjs';

const debug = createDebug('server');

/**
 * Start the Jambox REST + WebSocket server.
 *
 * Initializes the mockttp HTTPS proxy, creates a {@link Jambox} instance,
 * sets up the Express application with REST API routes and WebSocket support,
 * and starts listening on the given port.
 *
 * **Exposed REST endpoints:**
 * - `GET  /`            — Returns the current jambox version string
 * - `GET  /shutdown`    — Stops the proxy and exits the process
 * - `GET  /api/config`  — Returns serialized configuration
 * - `POST /api/config`  — Updates configuration (in-memory only)
 * - `POST /api/pause`   — Toggles the paused state
 * - `GET  /api/cache`   — Returns all cached request/response pairs
 * - `POST /api/cache`   — Performs cache actions (delete, update, persist)
 * - `POST /api/reset`   — Resets the proxy (optionally with a new CWD)
 * - `WS   /`            — WebSocket endpoint for live event streaming
 *
 * @param {object}        options
 * @param {number}        options.port                  - Port to listen on
 * @param {NodeJS.Process} [options.nodeProcess=process] - Process to attach exit handler to (injectable for testing)
 * @param {typeof fs}     [options.filesystem=fs]       - Filesystem module (injectable for testing)
 * @returns {Promise<import('express').Application>} The configured Express app
 */
async function start({ port, nodeProcess = process, filesystem = fs }) {
  nodeProcess.on('exit', (code) => {
    debug(`Shutting down, code: ${code}`);
  });

  const proxy = mockttp.getLocal({
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

  app.get('/shutdown', async (_req, res) => {
    await proxy.stop();

    res.send(nodeProcess.pid.toString());

    nodeProcess.exit(0);
  });
  app.use((_req, _res, next) => enter({ jambox }, next));
  app.get('/', (_, res) => res.send(getVersion()));

  app.use('/api', configRouter);
  app.use('/api', cacheRouter);
  app.use('/api', resetRouter);
  // enable websocket connects
  // @ts-ignore
  app.ws('/', noop);

  // eslint-disable-next-line
  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    debug(`${err.message} ${err.stack}`);
    res.status(statusCode).json({ error: err.message, stack: err.stack });
  });

  app.listen(port, () =>
    debug(`Jambox ${jambox.config.serverURL}. Proxy ${proxy.url}`)
  );

  return app;
}

export default start;
