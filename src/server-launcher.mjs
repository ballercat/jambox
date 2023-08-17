// @ts-check
import waitOn from 'wait-on';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { PROJECT_ROOT } from './constants.mjs';
import { createDebug } from './diagnostics.js';

const debug = createDebug();

const ping = async (href) => {
  try {
    await waitOn({ resources: [href], timeout: 500 });
    return true;
  } catch (error) {
    return false;
  }
};

// Returns when a server instance is available
const launcher = async ({ log, port, constants, config }) => {
  debug('Checking if a server instance is running.');
  const isServerAvailable = await ping(config.serverURL.href);
  if (isServerAvailable) {
    return;
  }

  log('Jambox server not currently running. Launching an instance');

  const out = fs.openSync(config.logLocation, 'a');
  const child = spawn(
    'node',
    [path.join(PROJECT_ROOT, './jam-server.mjs'), '--port', port],
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

export default launcher;
