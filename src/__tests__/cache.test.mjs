// import mock from 'mock-fs';
import path from 'path';
import { PROJECT_ROOT, DEFAULT_TAPE_NAME } from '../constants.mjs';
import test from 'ava';
import Cache from '../cache.mjs';

const request = {
  id: '123456',
  url: 'https://foo.bar',
  body: {
    async getText() {
      return 'foo=bar';
    },
  },
};
const response = {
  id: '123456',
};

test('Hashing: Cache.hash()', async (t) => {
  const hash = await Cache.hash(request);

  t.snapshot(hash, 'Hashing should have a consistent value');
});

test('Staging: add(), abort(), hasStaged()', (t) => {
  const cache = new Cache();
  cache.add(request);

  t.is(cache.hasStaged(request), true);

  cache.abort(request);

  t.is(cache.hasStaged(request), false);
});

test('Committing: commit(), revert(), has(), get()', async (t) => {
  const cache = new Cache();
  const hash = await Cache.hash(request);

  cache.add(request);

  await cache.commit(response);

  t.is(cache.has(hash), true);

  const result = cache.get(hash);

  t.is(result.request, request);
  t.is(result.response, response);

  await cache.revert(request);

  t.is(cache.has(request), false);
});

test('observing cache changes', async (t) => {
  const cache = new Cache();
  const events = [];

  cache.subscribe({
    next(event) {
      events.push(event);
    },
  });

  cache.add(request);
  await cache.commit(response);
  await cache.revert(request);

  t.snapshot(events);
});

test('reading cache', async (t) => {
  const hash = '16068043c24805b3a5ab193fa4a23b8c';
  const cache = new Cache();
  await cache.reset({
    tape: path.join(
      PROJECT_ROOT,
      'src',
      '__mocks__',
      'basic',
      '.jambox',
      DEFAULT_TAPE_NAME
    ),
  });

  // Check that hashing is working post deserialization
  t.is(cache.has(hash), true);
});
