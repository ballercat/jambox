import * as NodeFS from 'node:fs';
import * as path from 'node:path';
import { getLoader } from './read-user-config.js';
import {
  CONFIG_FILE_NAME,
  CACHE_DIR_NAME,
  DEFAULT_TAPE_NAME,
} from './constants.mjs';
import Emitter from './Emitter.mjs';
import debounce from './utils/debounce.mjs';
import { createDebug } from './diagnostics.cjs';

const debug = createDebug('config');

/**
 * @typedef  {object}         ConfigUpdate
 * @property {object=}        forward
 * @property {object=}        stub
 * @property {Array<string>=} trust
 * @property {object=}        cache
 * @property {boolean=}       blockNetworkRequests
 * @property {boolean=}       paused
 * @property {string=}        port
 */
export default class Config extends Emitter {
  /**
   * @member {URL}
   */
  serverURL;
  cwd = '';
  dir = '';
  filepath = '';
  logLocation = '';
  errors = [];
  /**
   * @type {import('./index.js').ProxyInfo}
   */
  proxy;
  noProxy = ['<-loopback->'];
  trust = new Set();
  /**
   * @type {Record<string, import('./index.js').ForwardOption>}
   */
  forward = null;
  /**
   * @type {import('./index.js').CacheOption}
   */
  cache;
  /**
   * @type {Record<string, import('./index.js').StubOption>}
   */
  stub;
  blockNetworkRequests = false;
  paused = false;
  /**
   * @member {import('node:fs')}
   */
  fs;
  /**
   * @member {(f: string) => object}
   */
  loadConfigModule;

  /**
   * @param {object}                init
   * @param {string|number=}        init.port
   * @param {import('./index.js').ProxyInfo=}   init.proxy
   * @param {object}                options
   * @param {import('node:fs')}     options.fs
   */
  constructor(
    { port, proxy, ...rest } = {},
    { fs } = {
      fs: NodeFS,
    }
  ) {
    super('config');
    const loader = getLoader(fs.promises);
    this.loadConfigModule = async (/** @type {string} */ filepath) => {
      try {
        return await loader(filepath);
      } catch (e) {
        debug(`Caught error during config load ${e.message}`);
        this.errors.push(e);
        return {};
      }
    };
    this.fs = fs;
    this.serverURL = new URL('http://localhost');
    this.serverURL.port = String(port) || '9000';
    this.proxy = proxy;
    this.cache = null;
    this.update(rest);
  }

  prepCacheDir() {
    if (this.fs.existsSync(this.dir)) {
      return;
    }

    debug(`Couldn't locale ${this.dir}/, creating one.`);
    this.fs.mkdirSync(this.dir);
  }

  /**
   * @param {ConfigUpdate} options
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

    this.dispatch('update', this.serialize());
  }

  clear() {
    this.forward = null;
    this.stub = null;
    this.trust.clear();
    this.cache = null;
    this.blockNetworkRequests = false;
    this.paused = false;
    this.errors = [];
  }

  /**
   * @param {string=} cwd
   */
  async load(cwd) {
    this.clear();

    if (!cwd) {
      debug(`Update existing config ${this.filepath}`);
      this.update(await this.loadConfigModule(this.filepath));
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
    this.update(await this.loadConfigModule(this.filepath));

    this.watch();
  }

  /**
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
   * @returns {import('./index.js').SerializedConfig}
   */
  serialize() {
    return {
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
      errors: this.errors,
    };
  }
}
