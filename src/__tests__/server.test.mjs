import test from 'ava';
import path from 'path';
import HttpsProxyAgent from 'https-proxy-agent';
import superwstest from 'superwstest';
import supertest from 'supertest';
import fetch from 'node-fetch';
import server from '../server/index.mjs';
import tiny from '../utils/tiny-server.mjs';
import { PROJECT_ROOT } from '../constants.mjs';

const SERVER_PORT = 7777;
const APP_PORT = 5555;

test.before(async (t) => {
  t.context.server = await server({
    port: SERVER_PORT,
    nodeProcess: { on() {}, exit() {} },
  });

  // Setup a tiny server
  t.context.app = await tiny(APP_PORT);
});

test.after.always(async (t) => {
  await supertest(t.context.server).get('/shutdown');
  t.context.server = null;
  await t.context.app._close();
  t.context.app = null;
});

test.serial('server config - get, post', async (t) => {
  let config = (await supertest(t.context.server).get('/api/config')).body;
  t.like(config, {
    serverURL: `http://localhost:${SERVER_PORT}`,
  });

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      forward: {
        'http://github.com': `http://localhost:${APP_PORT}`,
        'http://google.com': `http://localhost:${APP_PORT}`,
      },
    })
    .expect(200);
  config = (await supertest(t.context.server).get('/api/config')).body;

  t.like(config, {
    forward: {
      'http://github.com': `http://localhost:${APP_PORT}`,
      'http://google.com': `http://localhost:${APP_PORT}`,
    },
    serverURL: `http://localhost:${SERVER_PORT}`,
  });
});

test.serial('ws - config', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);

  const config = (await supertest(t.context.server).get('/api/config')).body;

  const ws = await superwstest(config.serverURL).ws('/');

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      forward: {
        'http://github.com': `http://localhost:${APP_PORT}`,
        'http://google.com': `http://localhost:${APP_PORT}`,
      },
    })
    .expect(200);
  // Websocket is notified of config changes
  t.is(ws.messages.pendingPush.length >= 1, true);
  t.like(JSON.parse(ws.messages.pendingPush[0].data.toString()), {
    type: 'config',
    payload: {
      forward: {
        'http://github.com': `http://localhost:${APP_PORT}`,
        'http://google.com': `http://localhost:${APP_PORT}`,
      },
    },
  });

  // An agent to send all requests to the the proxy
  const opts = { agent: new HttpsProxyAgent(config.proxy.http) };

  const res = await (await fetch('http://github.com', opts)).json();
  t.like(res, { path: '/' });

  const res2 = await (await fetch('http://google.com/echo', opts)).json();
  t.like(res2, { path: '/echo' });
});

test.serial('ws - request inspect', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);

  const { body: config } = await supertest(t.context.server).get('/api/config');

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      forward: {
        'http://google.com': `http://localhost:${APP_PORT}`,
      },
    })
    .expect(200);

  const plan = superwstest(config.serverURL)
    .ws('/')
    .expectJson((json) => {
      t.like(json, { type: 'request', payload: { url: 'http://google.com/' } });
      t.is(typeof json.payload.startTimestamp, 'number');
      t.is(typeof json.payload.bodyReceivedTimestamp, 'number');
    })
    .expectJson((json) => {
      t.like(json, {
        type: 'response',
        payload: { statusCode: 200 },
      });
    })
    .expectJson((json) => {
      t.like(json, {
        type: 'request',
        payload: { url: 'http://google.com/test' },
      });
    })
    .expectJson((json) =>
      t.like(json, { type: 'response', payload: { statusCode: 200 } })
    );

  const opts = { agent: new HttpsProxyAgent(config.proxy.http) };

  await fetch('http://google.com', opts).catch(console.log);
  await fetch('http://google.com/test', opts).catch(console.log);

  await plan;
});

test.serial('auto mocks', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);
  const { body: config } = await supertest(t.context.server).get('/api/config');

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      stub: {
        '**/path.html': { status: 204 },
        '**/*.jpg': { status: 204, preferNetwork: true },
      },
    })
    .expect(200);

  const plan = superwstest(config.serverURL)
    .ws('/')
    .expectJson((json) => {
      t.like(json, {
        type: 'request',
        payload: { url: 'http://random-domain.com/path.html' },
      });
    })
    .expectJson((json) => {
      t.like(json, { type: 'response', payload: { statusCode: 204 } });
    });

  const opts = { agent: new HttpsProxyAgent(config.proxy.http) };

  await fetch('http://random-domain.com/path.html', opts).catch(console.log);

  await plan;
});

test.serial('abort signal', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);
  const { body: config } = await supertest(t.context.server).get('/api/config');

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      forward: {
        'http://random-domain.com': `http://localhost:${APP_PORT}`,
      },
    })
    .expect(200);

  const plan = superwstest(config.serverURL)
    .ws('/')
    .expectJson((json) => {
      t.like(json, {
        type: 'request',
        payload: { url: 'http://random-domain.com/delay' },
      });
    })
    .expectJson((json) => {
      t.like(json, {
        type: 'abort',
        payload: { url: 'http://random-domain.com/delay' },
      });
    });

  const controller = new AbortController();
  const signal = controller.signal;
  const opts = {
    method: 'POST',
    agent: new HttpsProxyAgent(config.proxy.http),
    signal,
  };

  const fetchPromise = fetch('http://random-domain.com/delay', opts).catch(
    (e) => e
  );

  // A bit tricky, we need to delay the abort somewhat to ensure a connection of
  // some kind is established before abort.
  setTimeout(() => controller.abort(), 10);

  const error = await fetchPromise;

  t.is(error.name, 'AbortError');

  await plan;
});

test.serial('pause', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);
  const { body: config } = await supertest(t.context.server).get('/api/config');

  await supertest(t.context.server)
    .post('/api/config')
    .send({
      stub: {
        '**/**/*.jpg': { status: 204 },
      },
    })
    .expect(200);

  const opts = { agent: new HttpsProxyAgent(config.proxy.http) };
  const doRequest = () => fetch('http://jamboxtest.com/test.jpg', opts);

  // Baseline, get's a 204 auto-mock response
  let res = await doRequest();
  t.is(res.status, 204);
  t.is(res.statusText, 'jambox stub');

  await supertest(t.context.server)
    .post('/api/pause')
    .send({ paused: true })
    .expect(200);

  // Paused, no more mocking
  res = await doRequest();
  t.is(res.status, 502);
  t.is(res.statusText, 'Error communicating with upstream server');

  await supertest(t.context.server)
    .post('/api/pause')
    .send({ paused: false })
    .expect(200);

  // Unpaused, back to baseline
  res = await doRequest();
  t.is(res.status, 204);
  t.is(res.statusText, 'jambox stub');
});

// NOTE: This does work but needs a better cache mock
test('server - reset', async (t) => {
  t.assert(t.context.server, `Server init error: ${t.context.error?.stack}`);

  const cacheDir = path.join(PROJECT_ROOT, 'src', '__mocks__', 'cache-dir');

  await supertest(t.context.server)
    .post('/api/reset')
    .send({ cache: { dir: cacheDir } })
    .expect(200);

  await supertest(t.context.server)
    .get('/api/cache')
    .set('Accept', 'application/json')
    .expect((res) => {
      t.is(res.status, 200);
    });
});
