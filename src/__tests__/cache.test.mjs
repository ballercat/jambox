// import mock from 'mock-fs';
import path from 'path';
import { PROJECT_ROOT } from '../constants.mjs';
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

test('cache api', (t) => {
  const cache = new Cache();

  t.is(typeof Cache.hash, 'function');
  t.is(typeof cache.add, 'function');
  t.is(typeof cache.reset, 'function');
  t.is(typeof cache.hasStaged, 'function');
  t.is(typeof cache.commit, 'function');
  t.is(typeof cache.revert, 'function');
  t.is(typeof cache.has, 'function');
  t.is(typeof cache.get, 'function');
  t.is(typeof cache.persist, 'function');
  t.is(typeof cache.delete, 'function');
  t.is(typeof cache.clear, 'function');
});

test('Hashing: Cache.hash()', async (t) => {
  const hash = await Cache.hash(request);

  t.snapshot(hash, 'Hashing should have a consistent value');
});

test('Staging: add(), reset(), hasStaged()', (t) => {
  const cache = new Cache();
  cache.add(request);

  t.is(cache.hasStaged(request), true);

  cache.reset(request);

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

test.skip('reading cache', async (t) => {
  const hash = '16068043c24805b3a5ab193fa4a23b8c';
  const cache = new Cache();
  const results = await cache.read(
    path.join(PROJECT_ROOT, 'src', '__mocks__', 'cache-dir')
  );

  // Check that hashing is working post deserialization
  t.is(cache.has(hash), true);
  t.snapshot(results[hash]);
});
