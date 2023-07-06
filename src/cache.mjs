// @ts-check
import fs from 'fs';
import path from 'path';
import Observable from 'zen-observable';
import crypto from 'crypto';
import deserialize from './utils/deserialize.mjs';
import _debug from 'debug';

const debug = _debug('jambox.cache');

export const serializeRequest = async (request) => {
  return {
    id: request.id,
    url: request.url,
    path: request.path,
    headers: request.headers,
    status: request.status,
    statusCode: request.statusCode,
    statusMessage: request.statusMessage,
    body: await request.body.getJson(),
    ...request.timingEvents,
  };
};
export const serializeResponse = async (response) => {
  const text = await response.body.getText();
  const sizeInBytes = text.length;
  return {
    id: response.id,
    sizeInBytes,
    status: response.status,
    statusCode: response.statusCode,
    statusMessage: response.statusMessage,
    headers: response.headers,
    body: await response.body.getJson(),
    ...response.timingEvents,
  };
};

export const events = {
  commit: 'cache.commit',
  reset: 'cache.reset',
  revert: 'cache.revert',
  stage: 'cache.stage',
};

class Cache {
  #staged = {};
  #cache = {};
  #observer;
  #observable;
  #bypass = false;

  constructor() {
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

  /**
   *
   */
  static async hash(request) {
    const body = await request.body.getText();
    return crypto
      .createHash('md5')
      .update(`${request.url} ${body}`)
      .digest('hex');
  }

  bypass(value) {
    if (typeof value !== 'undefined') {
      debug(`set bypass from ${this.#bypass} to ${value}`);
      this.#bypass = value;
    }

    return this.#bypass;
  }

  all() {
    return { ...this.#cache };
  }

  /**
   * Stage a request
   */
  add(request) {
    if (request == null || request.id == null) {
      return;
    }

    if (this.#staged[request.id]) {
      debug(
        `avoiding overwritting an existing staged request to ${request.url}`
      );
      return;
    }

    debug(`add()[stage] ${request.url}`);
    this.#observer.next({
      type: events.stage,
      payload: { request: { ...request } },
    });
    this.#staged[request.id] = request;
  }

  /**
   * Un-stage a request
   */
  reset(request) {
    if (request == null || request.id == null) {
      return;
    }

    this.#observer.next({
      type: events.reset,
      payload: { request: { ...request } },
    });
    delete this.#staged[request.id];
  }

  hasStaged(request) {
    if (request == null || request.id == null) {
      return false;
    }

    return Boolean(this.#staged[request.id]);
  }

  /**
   *
   */
  async commit(response) {
    if (!this.hasStaged(response)) {
      return;
    }

    const request = this.#staged[response.id];
    const hash = await Cache.hash(request);

    debug(`commit() url ${request.url} -- hash ${hash}`);
    this.#cache[hash] = {
      request,
      response,
    };
    this.#observer.next({
      type: events.commit,
      payload: { ...this.#cache[hash] },
    });

    delete this.#staged[request.id];

    return hash;
  }

  /**
   *
   */
  async revert(request) {
    if (request == null || request.id == null) {
      return false;
    }

    const hash = await Cache.hash(request);
    if (!this.#cache[hash]) {
      return;
    }

    this.#observer.next({
      type: events.revert,
      payload: { ...this.#cache[hash] },
    });
    delete this.#cache[hash];
  }

  has(hash) {
    return Boolean(this.#cache[hash]);
  }

  get(hash) {
    debug(`get() ${hash}`);
    return this.#cache[hash];
  }

  findById(id) {
    return Object.values(this.#cache).find(
      (pair) => console.log(pair.request.id) || pair.request.id === id
    );
  }

  write(dir, hash) {
    const record = this.#cache[hash];
    if (!record) {
      debug(`Attempted to write ${hash} but it's not found`);
      return;
    }
    debug(`Writing ${hash} to disk`);
    fs.writeFileSync(path.join(dir, `${hash}.json`), JSON.stringify(record));
  }

  read(dir) {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const results = {};

    const readCacheFile = (filename) => {
      const { ext, name } = path.parse(filename);

      if (ext !== '.json') {
        return;
      }

      debug(`read ${filename}`);
      const json = JSON.parse(
        fs.readFileSync(path.join(dir, filename), 'utf-8')
      );
      const obj = deserialize(json);
      results[name] = obj;
    };
    fs.readdirSync(dir).forEach(readCacheFile);

    this.#cache = {
      ...this.#cache,
      ...results,
    };

    return results;
  }

  /**
   * TODO
   */
  delete() {}

  clear() {
    this.#staged = {};
    this.#cache = {};
  }

  subscribe(options) {
    this.#observable.subscribe(options);
  }
}

export default Cache;
