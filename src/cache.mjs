// @ts-check
import { access } from 'fs/promises';
import path from 'path';
import Observable from 'zen-observable';
import crypto from 'crypto';
import deserialize from './utils/deserialize.mjs';
import _debug from 'debug';
import { updateResponse } from './utils/serialize.mjs';
import { PortablePath, npath, ppath } from '@yarnpkg/fslib';
import { ZipFS } from '@yarnpkg/libzip';

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
    method: request.method,
    body: (await request.body?.getJson()) || {},
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
    body: (await response.body?.getJson()) || {},
    ...response.timingEvents,
  };
};

export const events = {
  commit: 'cache.commit',
  abort: 'cache.abort',
  reset: 'cache.reset',
  revert: 'cache.revert',
  persist: 'cache.persist',
  stage: 'cache.stage',
  delete: 'cache.delete',
  update: 'cache.update',
  clear: 'cache.clear',
};

class Cache {
  #staged = {};
  #cache = {};
  #observer;
  #observable;
  #bypass = false;
  /**
   * @member {PortablePath}
   */
  tape;

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
   * @type request {Request}
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
  abort(request) {
    if (request == null || request.id == null) {
      return;
    }

    this.#observer.next({
      type: events.abort,
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
      id: hash,
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

    debug(`Revert ${hash}`);
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
    return Object.values(this.#cache).find((pair) => pair.request.id === id);
  }

  /**
   * @param ids {Array<string>}
   */
  async persist(ids) {
    const zipfs = new ZipFS(this.tape, { create: true });

    for (const hash of ids) {
      const record = this.#cache[hash];
      if (!record) {
        debug(`Attempted to record ${hash} but it's not found`);
        return;
      }
      const filename = ppath.join(PortablePath.root, `${hash}.json`);
      debug(`Record ${filename} into tape ${this.tape}`);
      // 'pretty-print' json since it'll be compressed anyway
      await zipfs.writeFilePromise(filename, JSON.stringify(record, null, 2));

      this.#cache[hash] = {
        ...this.#cache[hash],
        tape: this.tape,
        filename,
      };

      this.#observer.next({
        type: events.persist,
        payload: {
          id: hash,
          tape: this.tape,
          filename,
        },
      });
    }

    zipfs.saveAndClose();
  }

  /**
   * - Reset the cache
   * - Read a cache tape to bootstrap in-memory cache
   *
   * @param options {object}
   */
  async reset(options) {
    this.clear();

    if (!options.tape) {
      return;
    }

    this.tape = npath.toPortablePath(options.tape);
    let create = false;
    try {
      await access(this.tape);
    } catch (e) {
      create = true;
    }

    const zipfs = new ZipFS(this.tape, { create });
    const files = zipfs.getAllFiles();

    debug(
      `Tape ${path.parse(this.tape).base} ready with ${files.length} records`
    );

    for (const filename of files) {
      const { ext, name } = path.parse(filename);

      if (ext === '.json') {
        debug(`read ${filename}`);

        try {
          const content = await zipfs.readFilePromise(filename, 'utf-8');
          const json = JSON.parse(content);
          const obj = deserialize(json);

          this.add(obj.request);
          await this.commit(obj.response);
          this.#cache[name].tape = this.tape;
          this.#cache[name].filename = filename;
        } catch (e) {
          debug(
            `failed to read ${filename}. The file will be deleted! ERROR: ${e}`
          );
          await zipfs.unlinkPromise(filename);
        }
      }
    }

    zipfs.discardAndClose();
    this.#observer.next({ type: events.reset });
  }

  /**
   * @param ids  {Array<string>}
   *
   * @return {Promise}
   */
  async delete(ids) {
    const errors = [];
    const zips = {};
    /**
     * @param tape {PortablePath}
     */
    const getZip = (tape) => {
      if (zips[tape]) {
        return zips[tape];
      }

      zips[tape] = new ZipFS(tape);
      return zips[tape];
    };

    for (const hash of ids) {
      try {
        const record = this.#cache[hash];

        if (!record) {
          const errorMessage = `Attempted to delete a record that does not exist ${hash}`;
          debug(errorMessage);
          throw new Error(errorMessage);
        }

        await this.revert(record.request);

        if (record.tape) {
          debug(`Delete record ${record.filename} from tape ${record.tape}`);

          await getZip(record.tape).unlinkPromise(record.filename);

          this.#observer.next({
            type: events.delete,
            payload: { id: hash },
          });
        }
      } catch (e) {
        debug(e);
        errors.push(e.message);
      }
    }

    for (const key in zips) {
      zips[key].saveAndClose();
    }

    return errors;
  }

  async update({ id, response }) {
    const newResponse = await updateResponse(
      this.#cache[id].response,
      response
    );

    this.#cache[id].response = newResponse;
    debug(`Update record ${id}`);
    this.#observer.next({
      type: events.update,
      payload: this.#cache[id],
    });

    if (this.#cache[id].tape) {
      await this.persist([id]);
    }
  }

  clear() {
    this.#staged = {};
    this.#cache = {};
    this.#observer.next({ type: events.clear });
  }

  subscribe(options) {
    this.#observable.subscribe(options);
  }
}

export default Cache;
