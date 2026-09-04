// @ts-nocheck
import * as NodeFS from 'node:fs';
import * as path from 'node:path';
import { createDebug } from './diagnostics.cjs';
import getUserConfigFile from './read-user-config.cjs';
import {
  CONFIG_FILE_NAME,
  CACHE_DIR_NAME,
  DEFAULT_TAPE_NAME,
} from './constants.mjs';
import Emitter from './Emitter.mjs';
import debounce from './utils/debounce.mjs';

const debug = createDebug('config');

/**
 * Browser launch configuration.
 *
 * @typedef  {object} BrowserConfig
 * @property {string} name    - Browser name (e.g. 'chromium')
 * @property {string} command - Absolute path to the browser executable
 */

/**
 * Validate and return a browser config value.
 * Accepts a string (browser name) or an object with { name, command }.
 * Throws on invalid input.
 *
 * @param {string|BrowserConfig} value
 * @returns {string|BrowserConfig}
 */
export function validateBrowserConfig(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const errors = [];
    if (typeof value.name !== 'string' || value.name.length === 0) {
      errors.push('"name" must be a non-empty string');
    }
    if (typeof value.command !== 'string' || value.command.length === 0) {
      errors.push('"command" must be a non-empty string');
    }
    if (errors.length > 0) {
      throw new Error(
        `Invalid browser config object: ${errors.join(', ')}. Expected { name: string, command: string }.`
      );
    }
    return value;
  }

  throw new Error(
    `Invalid browser config: expected a string or an object with { name: string, command: string }, got ${typeof value}.`
  );
}

/**
 * Partial configuration update, as accepted by {@link Config#update}.
 *
 * @typedef  {object} ConfigUpdate
 * @property {object=}                  forward
 * @property {object=}                  stub
 * @property {Array<string>=}           trust
 * @property {object=}                  cache
 * @property {boolean=}                 blockNetworkRequests
 * @property {boolean=}                 paused
 * @property {string=}                  port
 * @property {(string|BrowserConfig)=}  browser
 */

/**
 * Jambox runtime configuration.
 *
 * Loads `jambox.config.js` from the working directory, watches it for
 * changes (debounced hot-reload via {@link Config#watch}), and exposes
 * the merged values used by {@link Jambox} to configure the proxy.
 *
 * Emits a `config.update` event whenever the config is updated.
 *
 * @extends {Emitter}
 */
export default class Config extends Emitter {
  /**
   * URL of the jambox management server (host + port).
   *
   * @member {URL}
   */
  serverURL;
  browser = 'chrome';
  cwd = '';
  dir = '';
  filepath = '';
  logLocation = '';
  proxy = {};
  noProxy = ['<-loopback->'];
  trust = new Set();
  forward = null;
  /**
   * Cache settings (`{ tape, stage?, ignore? }`) or `null` when caching is disabled.
   *
   * @member {object|null}
   */
  cache;
  stub = null;
  blockNetworkRequests = false;
  paused = false;
  /**
   * Filesystem module (injectable for testing).
   *
   * @member {import('node:fs')}
   */
  fs;
  /**
   * Loads the user config module from a filepath (injectable for testing).
   *
   * @member {(f: string) => object}
   */
  loadConfigModule;

  /**
   * Creates a new Config instance.
   *
   * @param {object}                init
   * @param {string=}               init.port   - Port for the management server (default: '9000')
   * @param {object=}               init.proxy  - Proxy URLs + env vars reported to clients
   * @param {object}                [options]   - Injectable dependencies
   * @param {import('node:fs')}     [options.fs]              - Filesystem module
   * @param {(f: string) => object} [options.loadConfigModule] - Config module loader
   */
  constructor(
    { port, proxy, ...rest } = {},
    { fs, loadConfigModule } = {
      fs: NodeFS,
      loadConfigModule: getUserConfigFile,
    }
  ) {
    super('config');
    this.loadConfigModule = loadConfigModule;
    this.fs = fs;
    this.serverURL = new URL('http://localhost');
    this.serverURL.port = port || '9000';
    this.proxy = proxy;
    this.cache = null;
    this.update(rest);
  }

  /**
   * Ensure the `.jambox` cache directory exists, creating it if necessary.
   */
  prepCacheDir() {
    if (this.fs.existsSync(this.dir)) {
      return;
    }

    debug(`Couldn't locale ${this.dir}/, creating one.`);
    this.fs.mkdirSync(this.dir);
  }

  /**
   * Apply a partial configuration update and dispatch `config.update`.
   *
   * Only the keys present in `options` are applied; everything else
   * keeps its current value.
   *
   * @param {ConfigUpdate} options - Partial config values to apply
   */
  update(options) {
    if ('forward' in options) {
      this.forward = options.forward;
    }

    if ('stub' in options) {
      this.stub = options.stub;
    }

    if (Array.isArray(options.trust)) {
      this.trust = new Set([...this.trust, ...options.trust]);
    }

    if ('cache' in options) {
      this.cache = {
        tape: path.join(this.dir, DEFAULT_TAPE_NAME),
        ...options.cache,
      };
    }

    if ('blockNetworkRequests' in options) {
      this.blockNetworkRequests = Boolean(options.blockNetworkRequests);
    }

    if ('paused' in options) {
      this.paused = Boolean(options.paused);
    }

    if (
      typeof options.port === 'string' &&
      options.port !== this.serverURL.port
    ) {
      this.serverURL.port = options.port;
    }

    if (options.browser != null) {
      this.browser = validateBrowserConfig(options.browser);
    }

    this.dispatch('update', this.serialize());
  }

  /**
   * Reset all user-facing config values back to their defaults.
   */
  clear() {
    this.forward = null;
    this.stub = null;
    this.trust.clear();
    this.cache = null;
    this.blockNetworkRequests = false;
    this.paused = false;
  }

  /**
   * Load configuration from a `jambox.config.js` file.
   *
   * With a `cwd` argument, points the config at that directory (creating the
   * cache dir, resolving the config file path and starting a file watcher).
   * Without one, re-reads the previously loaded config file (used by the
   * file watcher on changes).
   *
   * @param {string=} cwd - Working directory to load `jambox.config.js` from
   */
  load(cwd) {
    this.clear();

    if (!cwd) {
      debug(`Update existing config ${this.filepath}`);
      this.update(this.loadConfigModule(this.filepath));
      return;
    }

    this.cwd = cwd;
    this.dir = path.join(this.cwd, CACHE_DIR_NAME);
    this.filepath = path.join(cwd, CONFIG_FILE_NAME);
    this.logLocation = path.join(
      this.dir,
      `server.${new Date().toISOString().split('T')[0]}.log`
    );

    debug(`Load new config at ${this.filepath}`);

    this.prepCacheDir();

    // Works with .json & .js
    this.update(this.loadConfigModule(this.filepath));

    this.watch();
  }

  /**
   * Watch the config file for changes and hot-reload on modification.
   *
   * @private
   */
  watch() {
    if (this.watcher) {
      this.watcher.removeAllListeners();
      this.watcher = null;
    }

    debug(`Watching ${this.filepath} for changes`);
    this.watcher = this.fs.watch(
      this.filepath,
      debounce(() => this.load())
    );
  }

  /**
   * Serialize the config into a plain object for the REST API.
   *
   * @returns {import('./index.ts').SerializedConfig}
   */
  serialize() {
    return {
      browser: this.browser,
      serverURL: this.serverURL.origin,
      paused: this.paused,
      blockNetworkRequests: this.blockNetworkRequests,
      cwd: this.cwd,
      forward: this.forward,
      cache: this.cache,
      trust: Array.from(this.trust),
      stub: this.stub,
      proxy: this.proxy,
      noProxy: this.noProxy,
    };
  }
}
