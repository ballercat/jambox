// @ts-check
import _debug from 'debug';
import fs from 'fs';
import path from 'path';
import getUserConfigFile from './read-user-config.js';
import {
  CONFIG_FILE_NAME,
  CACHE_DIR_NAME,
  DEFAULT_TAPE_NAME,
} from './constants.mjs';
import Emitter from './Emitter.mjs';
import { store } from './store.mjs';
import debounce from './utils/debounce.mjs';

const debug = _debug('jambox.config');

export default class Config extends Emitter {
  serverURL = '';
  cwd = '';
  dir = '';
  filepath = '';
  logLocation = '';
  noProxy = ['<-loopback->'];
  trust = new Set();
  forward;
  cache;
  stub;
  proxy = {};
  blockNetworkRequests = false;
  paused = false;

  /**
   * @param {object} init
   */
  constructor({ serverURL, proxy, ...rest }) {
    super('config');
    this.serverURL = serverURL;
    this.proxy = proxy;
    this.update(rest);
  }

  static current() {
    return store().config;
  }

  /**
   * @param {string} dir
   */
  static prepCacheDir(dir) {
    if (fs.existsSync(dir)) {
      return;
    }

    console.log(`Couldn't locale ${CACHE_DIR_NAME}/, creating one.`);
    fs.mkdirSync(dir);
  }

  /**
   * @param {object} options
   */
  update({ forward, stub, trust, cache, ...options }) {
    if (forward) {
      this.forward = { ...this.forward, ...forward };
    }

    if (stub) {
      this.stub = { ...this.stub, ...stub };
    }

    if (trust) {
      this.trust = new Set([...this.trust, ...trust]);
    }

    if (cache) {
      this.cache = {
        tape: path.join(this.dir, DEFAULT_TAPE_NAME),
        ...cache,
      };
    }

    if ('blockNetworkRequests' in options) {
      this.blockNetworkRequests = options.blockNetworkRequests;
    }

    if ('paused' in options) {
      this.paused = options.paused;
    }

    this.dispatch('update', this.serialize());
  }

  /**
   * @param {string=} cwd
   */
  load(cwd) {
    if (!cwd) {
      debug(`Update existing config ${this.filepath}`);
      this.update(getUserConfigFile(this.filepath));
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

    Config.prepCacheDir(this.cwd);

    // Works with .json & .js
    this.update(getUserConfigFile(this.filepath));

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

    this.watcher = fs.watch(
      this.filepath,
      debounce(() => this.load())
    );
  }

  serialize() {
    return {
      serverURL: this.serverURL,
      paused: this.paused,
      blockNetworkRequests: this.blockNetworkRequests,
      cwd: this.cwd,
      forward: this.forward,
      cache: this.cache,
      trust: [...this.trust],
      stub: this.stub,
      proxy: this.proxy,
    };
  }
}
