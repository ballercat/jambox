// @ts-check
import fetch from 'node-fetch';
import path from 'path';
import { spawn } from 'child_process';
import persistRuntimeConfig from './persist-runtime-config.mjs';
import launchProxiedChrome from './browser.mjs';
import isURI from './is-uri.mjs';
import launchServer from './server-launcher.mjs';
import Config from './Config.mjs';
import { createDebug } from './diagnostics.js';

const debug = createDebug();

export default async function record(options) {
  const { script, cwd = process.cwd(), log, env, constants } = options;
  const [entrypoint, ...args] = script;

  debug('Checking if a server instance is running.');

  const config = new Config();
  config.load(cwd);

  try {
    await launchServer({ log, constants, config });
  } catch (error) {
    log(`Failed to launch a server, terminating. ${error}`);
    throw error;
  }

  /**
   * Naming/clean-up/notes:
   *
   * - This is just a launch script
   * - Server may be already running or we may have launched one for the first time
   * - In either case we need the server to read the config from the CWD where THIS
   *   script is running from
   * - 'info' is kind of a poor name here
   * - We are looking for the proxy settings from the running instance
   */
  const info = await (
    await fetch(`${config.serverURL.href}api/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cwd }),
    })
  ).json();

  debug(`Check if entrypoint ${entrypoint} is a URI`);

  // Launch a browser
  if (isURI(entrypoint)) {
    log(`${entrypoint} parsed as a URI. Launching a browser instance`);
    debug('launch proxied chrome');
    const browser = await launchProxiedChrome(entrypoint, info);
    persistRuntimeConfig(config.serverURL);
    return {
      browser,
    };
  }

  // Launch a (node) script
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
