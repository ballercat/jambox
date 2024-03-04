// @ts-check
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import fetch from 'node-fetch';
import persistRuntimeConfig from './persist-runtime-config.mjs';
import launchProxiedChrome from './browser.mjs';
import isURI from './is-uri.mjs';
import launchServer from './server-launcher.mjs';
import Config from './Config.mjs';
import { parseArgs, JAMBOX_FLAGS } from './parse-args.mjs';
import { createDebug } from './diagnostics.js';
import * as Undici from 'undici';

const debug = createDebug();

export default async function cli(options) {
  const { script, cwd = process.cwd(), log, env, constants } = options;
  const flags = parseArgs(script, JAMBOX_FLAGS);
  const [entrypoint, ...args] = flags.target;

  debug('Checking if a server instance is running.');

  const config = new Config();
  config.load(cwd);

  try {
    await launchServer({ log, constants, config, flags });
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

  // Configure "native" `fetch` (e.g. `globalThis.fetch` in Node.js)
  // to work with the `global-agent` proxy
  // @see: https://github.com/gajus/global-agent/issues/52#issuecomment-1134525621
  const ProxyAgent = Undici.ProxyAgent;
  const setGlobalDispatcher = Undici.setGlobalDispatcher;

  setGlobalDispatcher(new ProxyAgent(info.proxy.http));

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
