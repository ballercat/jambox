import test from 'ava';
import Cache from '../../cache.mjs';
import Broadcaster from '../Broadcaster.mjs';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

test('cache broadcast', async (t) => {
  const client = {
    data: [],
    send(event) {
      this.data.push(event);
    },
  };
  const broadcaster = new Broadcaster(() => [client]);
  const cache = new Cache('test');

  broadcaster.broadcast(cache);

  const request = {
    id: 0,
    url: 'www.jambox.test.com',
    body: {
      getJson: async () => ({}),
      getText: async () => '{}',
    },
  };
  const response = {
    id: 0,
    body: {
      getJson: async () => ({}),
      getText: async () => '{}',
    },
  };

  cache.add(request);
  await cache.commit(response);

  // let observer play out
  await delay(1);

  t.snapshot(client.data);
});
