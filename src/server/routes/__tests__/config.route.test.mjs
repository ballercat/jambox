import test from 'ava';
import supertest from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import router from '../config.route.mjs';
import Config from '../../../Config.mjs';
import { enter } from '../../../store.mjs';

const SERVER_PORT = 7777;
const APP_PORT = 5555;

test('get & post api', async (t) => {
  const config = new Config({
    serverURL: `http://localhost:${SERVER_PORT}`,
  });

  const app = express();
  app.use(bodyParser.json());
  app.use((req, res, next) => enter({ jambox: { config, reset() {} } }, next));
  app.use('/api', router);

  await supertest(app)
    .get('/api/config')
    .expect('Content-Type', /json/)
    .expect(200);
  await supertest(app)
    .post('/api/config')
    .send({
      forward: {
        'http://github.com': `http://localhost:${APP_PORT}`,
        'http://google.com': `http://localhost:${APP_PORT}`,
      },
    })
    .expect(200);

  t.like(config.serialize(), {
    serverURL: `http://localhost:${SERVER_PORT}`,
    forward: {
      'http://github.com': `http://localhost:${APP_PORT}`,
      'http://google.com': `http://localhost:${APP_PORT}`,
    },
  });
});
