import test from 'ava';
import { Volume, createFsFromVolume } from 'memfs';
import Config, { validateBrowserConfig } from '../Config.mjs';
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

test('validateBrowserConfig: accepts a string', (t) => {
  t.is(validateBrowserConfig('chrome'), 'chrome');
  t.is(validateBrowserConfig('firefox'), 'firefox');
});

test('validateBrowserConfig: accepts a valid object', (t) => {
  const browser = { name: 'chromium', command: '/usr/bin/chromium' };
  t.deepEqual(validateBrowserConfig(browser), browser);
});

test('validateBrowserConfig: rejects object missing name', (t) => {
  const err = t.throws(() => validateBrowserConfig({ command: '/usr/bin/x' }));
  t.true(err.message.includes('"name" must be a non-empty string'));
});

test('validateBrowserConfig: rejects object missing command', (t) => {
  const err = t.throws(() => validateBrowserConfig({ name: 'chromium' }));
  t.true(err.message.includes('"command" must be a non-empty string'));
});

test('validateBrowserConfig: rejects object with empty strings', (t) => {
  const err = t.throws(() =>
    validateBrowserConfig({ name: '', command: '' })
  );
  t.true(err.message.includes('"name" must be a non-empty string'));
  t.true(err.message.includes('"command" must be a non-empty string'));
});

test('validateBrowserConfig: rejects non-string non-object values', (t) => {
  t.throws(() => validateBrowserConfig(123));
  t.throws(() => validateBrowserConfig(true));
  t.throws(() => validateBrowserConfig(null));
});

test('validateBrowserConfig: rejects arrays', (t) => {
  t.throws(() => validateBrowserConfig(['chrome']));
});

test('Config.update accepts browser as string', (t) => {
  const vol = new Volume();
  vol.fromJSON({ './jambox.config.js': 'module.exports = {};' }, '/app');
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  config.update({ browser: 'firefox' });
  t.is(config.browser, 'firefox');
});

test('Config.update accepts browser as object', (t) => {
  const vol = new Volume();
  vol.fromJSON({ './jambox.config.js': 'module.exports = {};' }, '/app');
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  const browser = { name: 'chromium', command: '/usr/bin/chromium' };
  config.update({ browser });
  t.deepEqual(config.browser, browser);
});

test('Config.update throws on invalid browser object', (t) => {
  const vol = new Volume();
  vol.fromJSON({ './jambox.config.js': 'module.exports = {};' }, '/app');
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  t.throws(() => config.update({ browser: { name: 123 } }));
});

test('Config.serialize includes browser object', (t) => {
  const vol = new Volume();
  vol.fromJSON({ './jambox.config.js': 'module.exports = {};' }, '/app');
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  const browser = { name: 'chromium', command: '/usr/bin/chromium' };
  config.update({ browser });
  const serialized = config.serialize();
  t.deepEqual(serialized.browser, browser);
});

test('browser config loaded from config file', (t) => {
  const vol = new Volume();
  const browser = { name: 'brave', command: '/usr/bin/brave-browser' };
  vol.fromJSON(
    {
      './jambox.config.js': `module.exports = { browser: ${JSON.stringify(browser)} };`,
    },
    '/app'
  );
  const fs = createFsFromVolume(vol);
  const config = new Config({}, { fs, loadConfigModule: configLoader(fs) });
  config.load('/app');

  t.deepEqual(config.browser, browser);
});
