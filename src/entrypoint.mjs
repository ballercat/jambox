// @ts-nocheck
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import fetch from 'node-fetch';
import persistRuntimeConfig from './persist-runtime-config.mjs';
import launchProxiedChrome from './browser.mjs';
import isURI from './is-uri.mjs';
import launchServer from './server-launcher.mjs';
import Config from './Config.mjs';
import { parseArgs, JAMBOX_FLAGS } from './parse-args.mjs';
import { createDebug } from './diagnostics.cjs';

const debug = createDebug();

/**
 * Jambox CLI entrypoint.
 *
 * Given a target (a URL or a command to run), this will:
 *
 * 1. Load the user config from the current working directory
 * 2. Ensure a jambox server is running ({@link launchServer})
 * 3. POST the cwd to `/api/reset` so the running server picks up this
 *    project's config and returns its proxy settings
 * 4. Launch the target:
 *    - A **URI** opens a proxied Chrome instance ({@link launchProxiedChrome})
 *      and persists the runtime config for the extension
 *    - Anything else is spawned as a **node script** with `NODE_EXTRA_CA_CERTS`,
 *      the proxy `require` hook, and `GLOBAL_AGENT_HTTP_PROXY` set
 *
 * @param {object} options
 * @param {string} options.script    - Full CLI invocation (parsed for jambox flags)
 * @param {string=} options.cwd      - Working directory (default: `process.cwd()`)
 * @param {Function} options.log     - Logger
 * @param {object} options.env       - Environment variables passed to spawned scripts
 * @param {object} options.constants - Project constants (PROJECT_ROOT, SCRIPT_HELPER)
 * @returns {Promise<{ browser?: object, process?: boolean }>}
 */
async function cli(options) {
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
  const info = /** @type {import('./index.js').SerializedConfig} */ (
    await (
      await fetch(`${config.serverURL.href}api/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cwd }),
      })
    ).json()
  );

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

export default cli;
