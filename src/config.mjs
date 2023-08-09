// @ts-check
import _debug from 'debug';
import fs from 'fs';
import path from 'path';
import Observable from 'zen-observable';
import deepmerge from 'deepmerge';
import getUserConfigFile from './read-user-config.js';
import {
  CONFIG_FILE_NAME,
  CACHE_DIR_NAME,
  DEFAULT_TAPE_NAME,
} from './constants.mjs';
import { store } from './store.mjs';
import debounce from './utils/debounce.mjs';

const debug = _debug('jambox.config');

export class Config {
  serverURL = '';
  cwd = '';
  dir = '';
  filepath = '';
  logLocation = '';
  noProxy = ['<-loopback->'];
  trust = new Set();
  forward = {};
  cache = {};
  stub = {};
  proxy = {};
  blockNetworkRequests = false;
  paused = false;

  #observer;
  #observable;

  /**
   * @param {string} port
   */
  constructor(port) {
    this.serverURL = `http://localhost:${port}`;
    let pendingEvents = [];
    this.#observer = {
      next(event) {
        pendingEvents.push(event);
      },
    };
    this.#observable = new Observable((observer) => {
      this.#observer = observer;
      pendingEvents.forEach((event) => this.#observer.next(event));
      pendingEvents = [];
    });
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

    this.notify();
  }

  /**
   * @param {string=} cwd
   */
  load(cwd) {
    if (!cwd) {
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

  /**
   * @param {object} options
   * @param {string} options.http
   * @param {string} options.https
   * @param {object} options.proxyEnv
   */
  setProxy(options) {
    this.proxy = options;
  }

  /**
   * @param {object}   options
   * @param {function} options.next
   */
  subscribe(options) {
    this.#observable.subscribe(options);
  }

  notify() {
    this.#observer.next({ type: 'update', payload: this.serialize() });
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

export default function config(overrides = {}, cwd = process.cwd()) {
  const filepath = path.join(cwd, CONFIG_FILE_NAME);
  // Works with .json & .js
  const userConfig = getUserConfigFile(filepath);
  const cacheDir = path.join(cwd, CACHE_DIR_NAME);

  const logName = `server.${new Date().toISOString().split('T')[0]}.log`;

  Config.prepCacheDir(cwd);

  const config = deepmerge(
    {
      cwd,
      filepath,
      logLocation: path.join(cacheDir, logName),
      forward: {},
      noProxy: ['<-loopback->'],
      ...userConfig,
    },
    overrides
  );

  if (config.cache) {
    config.cache = {
      tape: path.join(cacheDir, DEFAULT_TAPE_NAME),
      ...config.cache,
    };
  }

  return config;
}
