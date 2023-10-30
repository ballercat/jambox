import test from 'ava';
import { Volume, createFsFromVolume } from 'memfs';
import Config from '../Config.mjs';
import Module from 'node:module';

// Mocked loadConfig. e2e for a 'real' required config module
const configLoader = (fs) => (filepath) => {
  const m = new Module(filepath);
  const content = fs.readFileSync(filepath, 'utf-8');
  m.filename = 'jambox.config.js';
  m._compile(content, 'jambox.config.js');
  return m.exports;
};

test('load', async (t) => {
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
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  t.like(config, { stub: {}, paused: true });
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
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

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
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/one');

  t.is(config.cwd, '/one');
  t.like(config.cache, { stage: ['one'] });

  fs.writeFileSync(
    '/one/jambox.config.js',
    'module.exports = { cache: { stage: []} };'
  );
  await config.once('config.update');

  t.like(config.cache, { stage: [] });

  config.load('/two');

  t.like(config.cache, { stage: ['two'] });
  fs.writeFileSync(
    '/two/jambox.config.js',
    'module.exports = { cache: { stage: []} };'
  );
  await config.once('config.update');

  t.like(config.cache, { stage: [] });
});
