// @ts-check
import fs from 'fs';
import path from 'path';
import _debug from 'debug';
import express from 'express';
import expessWS from 'express-ws';
import bodyParser from 'body-parser';
import mockttp from 'mockttp';
import Cache from '../cache.mjs';
import setupAPI from './api.mjs';
import setupHandlers from './reset.mjs';
import { PROJECT_ROOT } from '../constants.mjs';
import Config from '../config.mjs';

const debug = _debug('jambox');

const getServices = (filesystem) => {
  const app = express();
  const ews = expessWS(app);
  const cache = new Cache();
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

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  return { app, ws: ews, cache, proxy };
};

const shutdown = (nodeProcess, svc) => async (req, res) => {
  await svc.proxy.stop();

  res.send('Shutting down.');

  nodeProcess.exit(0);
};

async function start({ port, nodeProcess = process, filesystem = fs }) {
  const svc = getServices(filesystem);

  await svc.proxy.start();
  const proxyURL = new URL(svc.proxy.url);
  const config = new Config({
    serverURL: `http://localhost:${port}`,
    proxy: {
      http: `http://${proxyURL.host}`,
      https: `https://${proxyURL.host}`,
      env: svc.proxy.proxyEnv,
    },
  });

  await setupHandlers(svc, config);

  setupAPI(svc, config);

  svc.app.get('/shutdown', shutdown(nodeProcess, svc));
  svc.app.listen(port, () =>
    debug(`Jambox ${config.serverURL}. Proxy ${svc.proxy.url}`)
  );

  nodeProcess.on('exit', (code) => {
    debug(`Shutting down, code: ${code}`);
  });

  return svc.app;
}

export default start;
