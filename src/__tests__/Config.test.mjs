import test from 'ava';
import { Volume, createFsFromVolume } from 'memfs';
import Config from '../Config.mjs';

test('file load', async (t) => {
  const vol = new Volume();
  vol.fromJSON(
    {
      '.jambox': {
        '.gitkeep': '',
      },
      './jambox.config.js': `module.exports = ${JSON.stringify({
        cache: {},
        forward: {},
        stub: {},
        trust: [],
        blockNetworkRequests: true,
        paused: true,
      })};`,
    },
    '/app'
  );
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs });
  await config.load('/app');

  t.like(config, { stub: {}, paused: true });
});

test('file load ESM', async (t) => {
  const vol = new Volume();
  vol.fromJSON(
    {
      '.jambox': {
        '.gitkeep': '',
      },
      './jambox.config.js': `
      export const stub = {};
      export const paused = true;
      `,
    },
    '/app'
  );
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs });
  await config.load('/app');

  t.like(config, { stub: {}, paused: true });

  vol.fromJSON(
    {
      'jambox.config.js': `
      const trust = ['foobar.net'];
      export default { trust }`,
    },
    '/app2'
  );

  await config.load('/app2');

  t.like(config, { trust: new Set(['foobar.net']) });
});

test('file load error', async (t) => {
  const vol = new Volume();
  vol.fromJSON(
    {
      '.jambox': {
        '.gitkeep': '',
      },
      './jambox.config.js': `
      export defaults {}
      `,
    },
    '/app'
  );
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs });
  await config.load('/app');

  // Should be a parse-time error of "Unexpected 'defaults'"
  // See snapshot for formatted message
  t.snapshot(config.errors);

  fs.writeFileSync('/app/jambox.config.js', `foo = 'bar';const foo = '';`);
  await config.once('config.update');

  // Keep stack traces out of the snapshot. There are dynamic filenames
  // and real filepaths in the stack(s) we want to avoid.
  t.like(config.errors[0], {
    message: 'Could not load /app/jambox.config.js',
    // nested cause error
    cause: {
      message: "Cannot access 'foo' before initialization",
    },
  });
});

test('updates & watch mode', async (t) => {
  const vol = new Volume();
  vol.fromJSON(
    {
      './jambox.config.js':
        'module.exports = { trust: ["self-signed.org"], cache: { stage: ["*"]} };',
    },
    '/app'
  );
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs });
  await config.load('/app');

  t.is(config.cwd, '/app');
  t.like(config.cache, { stage: ['*'] });
  t.deepEqual(config.trust, new Set(['self-signed.org']));

  fs.writeFileSync('/app/jambox.config.js');
  fs.writeFileSync('/app/jambox.config.js', 'module.exports = { cache: {} };');
  fs.writeFileSync('/app/jambox.config.js', 'module.exports = { };');
  await config.once('config.update');

  t.is(config.cache, null);
  t.deepEqual(config.trust, new Set());
});

test('changes to cwd', async (t) => {
  const vol = new Volume();
  vol.fromJSON({
    '/one/jambox.config.js': 'module.exports = { cache: { stage: ["one"]} };',
    '/two/jambox.config.js': 'module.exports = { cache: { stage: ["two"]}};',
  });
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs });
  await config.load('/one');

  t.is(config.cwd, '/one');
  t.like(config.cache, { stage: ['one'] });

  fs.writeFileSync(
    '/one/jambox.config.js',
    'module.exports = { cache: { stage: []} };'
  );
  await config.once('config.update');

  t.like(config.cache, { stage: [] });

  await config.load('/two');

  t.like(config.cache, { stage: ['two'] });
  fs.writeFileSync(
    '/two/jambox.config.js',
    'module.exports = { cache: { stage: []} };'
  );
  await config.once('config.update');

  t.like(config.cache, { stage: [] });
});
