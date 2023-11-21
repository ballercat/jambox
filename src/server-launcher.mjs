// @ts-check
import * as path from 'path';
import * as fs from 'node:fs';
import waitOn from 'wait-on';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { PROJECT_ROOT, getVersion } from './constants.mjs';
import { createDebug } from './diagnostics.js';

const debug = createDebug();

/**
 * @param href {String}
 */
const ping = async (href) => {
  try {
    await waitOn({ resources: [href], timeout: 500 });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Launches the jambox server in a new process
 *
 * @param {object}                         options
 * @param {(msg: string) => void}          options.log
 * @param {import('./Config.mjs').default} options.config
 * @param {object}                         options.constants
 */
const spawnServerProcess = async ({ log, config, constants }) => {
  log('Launching a new Jambox instance.');
  const out = fs.openSync(config.logLocation, 'a');
  const child = spawn(
    'node',
    [
      path.join(PROJECT_ROOT, './jam-server.mjs'),
      '--port',
      config.serverURL.port,
    ],
    {
      detached: true,
      // All of the server output is piped into a file
      stdio: ['ignore', out, out],
      env: {
        ...process.env,
        DEBUG: 'jambox*',
        DEBUG_COLORS: '0',
        NODE_EXTRA_CA_CERTS: path.join(constants.PROJECT_ROOT, 'testCA.pem'),
      },
    }
  );

  child.unref();

  debug('Waiting on the server to become available');
  await waitOn({
    resources: [config.serverURL.href],
    timeout: 1000 * 10,
  });
};

/**
 * Kill a running server
 *
 * @param {import('./Config.mjs').default}  config
 * @param {(msg: string) => void}           log
 */
const killOldServer = (config, log) => {
  log(`Sending a shutdown signal to running Jambox server.`);
  return fetch(String(new URL('shutdown', config.serverURL)));
};

/**
 * Returns when a server instance is available
 *
 * @param {object}                          options
 * @param {object}                          options.constants
 * @param {(msg: string) => void}           options.log
 * @param {import('./Config.mjs').default}  options.config
 * @param {object}                          options.flags
 */
const launcher = async ({ log, constants, config, flags }) => {
  debug('Checking if a server instance is running.');
  const isServerAvailable = await ping(config.serverURL.href);
  if (!isServerAvailable) {
    return spawnServerProcess({ log, config, constants });
  }

  if (flags.reset) {
    log('Resetting.');
    await killOldServer(config, log);
    return spawnServerProcess({ log, config, constants });
  }

  // Would be slightly nicer if waitOn could return the values from the pinged endpoints...
  const apiVersion = await fetch(config.serverURL.href).then((res) =>
    res.text()
  );
  const currentVersion = getVersion();

  if (currentVersion !== null && apiVersion !== currentVersion) {
    log(
      `Installed version (${getVersion()}) is different from running version (${
        apiVersion || '??'
      }).`
    );
    await killOldServer(config, log);
    return spawnServerProcess({ log, config, constants });
  }
};

export default launcher;
