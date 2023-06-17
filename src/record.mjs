// @ts-check
import _debug from 'debug';
import fetch from 'node-fetch';
import path from 'path';
import { spawn } from 'child_process';
import persistRuntimeConfig from './persist-runtime-config';
import launchProxiedChrome from './browser.mjs';
import isURI from './is-uri.mjs';
import launchServer from './server-launcher.mjs';
import getConfig from './config.mjs';

const debug = _debug('jambox');

export default async function record(options) {
  const { script, cwd = process.cwd(), log, env, constants } = options;
  const [entrypoint, ...args] = script;

  debug('Checking if a server instance is running.');

  const config = getConfig({}, cwd);
  const port = config.port || 9000;

  try {
    await launchServer({ log, port, constants, config });
  } catch (error) {
    log(`Failed to launch a server, terminating. ${error}`);
    throw error;
  }

  const info = await (
    await fetch(`http://localhost:${port}/api/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cwd }),
    })
  ).json();

  debug(`Check if entrypoint ${entrypoint} is a URI`);

  if (isURI(entrypoint)) {
    log(`${entrypoint} parsed as a URI. Launching a browser instance`);
    debug('launch proxied chrome');
    const browser = await launchProxiedChrome(entrypoint, info);
    persistRuntimeConfig({
      host: 'localhost',
      port,
    });
    return {
      browser,
    };
  }

  spawn(entrypoint, args, {
    cwd,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: {
      ...env,
      NODE_EXTRA_CA_CERTS: path.join(constants.PROJECT_ROOT, 'testCA.pem'),
      NODE_OPTIONS: `--require ${constants.SCRIPT_HELPER}`,
      GLOBAL_AGENT_HTTP_PROXY: info.proxy.http,
    },
  });

  return { process: true };
}
