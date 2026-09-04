// @ts-nocheck
import { access } from 'fs/promises';
import path from 'path';
import Emitter from './Emitter.mjs';
import crypto from 'crypto';
import deserialize from './utils/deserialize.mjs';
import { updateResponse } from './utils/serialize.mjs';
import { PortablePath, npath, ppath } from '@yarnpkg/fslib';
import { ZipFS } from '@yarnpkg/libzip';
import { createDebug } from './diagnostics.cjs';

const debug = createDebug('server');

/**
 * Serialize a mockttp request into a plain JSON-safe object.
 *
 * @param {import('mockttp').CompletedRequest} request
 * @returns {Promise<object>} JSON-safe representation (body parsed as JSON when possible)
 */
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

/**
 * Serialize a mockttp response into a plain JSON-safe object.
 *
 * @param {import('mockttp').CompletedResponse} response
 * @returns {Promise<object>} JSON-safe representation including `sizeInBytes`
 */
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

/**
 * Cache lifecycle event names, dispatched on the `cache.*` namespace.
 */
export const events = {
  commit: 'commit',
  abort: 'abort',
  reset: 'reset',
  revert: 'revert',
  persist: 'persist',
  stage: 'stage',
  delete: 'delete',
  update: 'update',
  clear: 'clear',
};

/**
 * In-memory HTTP traffic cache with zip "tape" persistence.
 *
 * Request/response pairs are staged as requests arrive ({@link Cache#add}),
 * committed when their responses complete ({@link Cache#commit}), and looked
 * up by an MD5 hash of `url + body`. Committed entries can be persisted to
 * (and reloaded from) a zip file "tape" via {@link Cache#persist} and
 * {@link Cache#reset}.
 *
 * Lifecycle events are dispatched on the `cache.*` namespace
 * (see {@link events}).
 *
 * @extends {Emitter}
 */
class Cache extends Emitter {
  /** @private */
  staged = {};
  /** @private */
  cache = {};
  /** @private */
  _bypass = false;

  /**
   * Path to the zip "tape" file backing this cache.
   *
   * @member {PortablePath}
   */
  tape;

  constructor() {
    super('cache');
  }

  /**
   * Compute the cache hash for a request: an MD5 digest of its URL + body.
   *
   * @param request {import('mockttp').CompletedRequest}
   * @returns {Promise<string>} Hex digest used as the cache key
   */
  static async hash(request) {
    const body = await request.body.getText();
    return crypto
      .createHash('md5')
      .update(`${request.url} ${body}`)
      .digest('hex');
  }

  /**
   * Get or set cache bypass mode.
   *
   * When bypassed, no new requests are staged and cached responses are not
   * replayed (used by the "pause" feature).
   *
   * @param {boolean=} value - When provided, sets the bypass flag
   * @returns {boolean} Current bypass state
   */
  bypass(value) {
    if (typeof value !== 'undefined') {
      debug(`set bypass from ${this._bypass} to ${value}`);
      this._bypass = value;
    }

    return this._bypass;
  }

  /**
   * Return a shallow copy of all committed cache entries, keyed by hash.
   *
   * @returns {Record<string, { id: string, request: object, response: object }>}
   */
  all() {
    return { ...this.cache };
  }

  /**
   * Stage a request, awaiting its response before committing to cache.
   *
   * Ignores null requests and refuses to overwrite an already-staged
   * request with the same id. Dispatches `cache.stage`.
   *
   * @param {import('mockttp').CompletedRequest} request
   */
  add(request) {
    if (request == null || request.id == null) {
      return;
    }

    if (this.staged[request.id]) {
      debug(
        `avoiding overwritting an existing staged request to ${request.url}`
      );
      return;
    }

    debug(`add()[stage] ${request.url}`);
    this.dispatch(events.stage, { request: { ...request } });
    this.staged[request.id] = request;
  }

  /**
   * Un-stage a request (e.g. when it is aborted before responding).
   * Dispatches `cache.abort`.
   *
   * @param {import('mockttp').CompletedRequest} request
   */
  abort(request) {
    if (request == null || request.id == null) {
      return;
    }

    this.dispatch(events.abort, { request: { ...request } });
    delete this.staged[request.id];
  }

  /**
   * Check whether a request (matched by id) is currently staged.
   *
   * @param {import('mockttp').CompletedRequest|import('mockttp').CompletedResponse} request
   * @returns {boolean}
   */
  hasStaged(request) {
    if (request == null || request.id == null) {
      return false;
    }

    return Boolean(this.staged[request.id]);
  }

  /**
   * Commit a staged request/response pair into the cache.
   *
   * The pair is stored under the request's {@link Cache.hash} and the
   * request is un-staged. Dispatches `cache.commit`.
   *
   * @param {import('mockttp').CompletedResponse} response - Response whose matching request is staged
   * @returns {Promise<string|undefined>} The cache hash, or `undefined` if nothing was staged
   */
  async commit(response) {
    if (!this.hasStaged(response)) {
      return;
    }

    const request = this.staged[response.id];
    const hash = await Cache.hash(request);

    debug(`commit() url ${request.url} -- hash ${hash}`);
    this.cache[hash] = {
      id: hash,
      request,
      response,
    };
    this.dispatch(events.commit, { ...this.cache[hash] });

    delete this.staged[request.id];

    return hash;
  }

  /**
   * Remove a request's entry from the cache. Dispatches `cache.revert`.
   *
   * @param {import('mockttp').CompletedRequest} request
   * @returns {Promise<boolean|undefined>} `false` for invalid input, `undefined` when no entry existed
   */
  async revert(request) {
    if (request == null || request.id == null) {
      return false;
    }

    const hash = await Cache.hash(request);
    if (!this.cache[hash]) {
      return;
    }

    debug(`Revert ${hash}`);
    this.dispatch(events.revert, { ...this.cache[hash] });
    delete this.cache[hash];
  }

  /**
   * Check whether a hash exists in the cache.
   *
   * @param {string} hash
   * @returns {boolean}
   */
  has(hash) {
    return Boolean(this.cache[hash]);
  }

  /**
   * Get a cache entry by hash.
   *
   * @param {string} hash
   * @returns {{ id: string, request: object, response: object }|undefined}
   */
  get(hash) {
    debug(`get() ${hash}`);
    return this.cache[hash];
  }

  /**
   * Find a cache entry by its original mockttp request id.
   *
   * @param {string|number} id
   * @returns {{ id: string, request: object, response: object }|undefined}
   */
  findById(id) {
    return Object.values(this.cache).find((pair) => pair.request.id === id);
  }

  /**
   * Persist cache entries into the zip tape file.
   *
   * Creates the tape if it does not exist yet. Each entry is written as a
   * pretty-printed JSON file named `<hash>.json`. Successfully persisted
   * entries are annotated with their `tape` and `filename`.
   * Dispatches `cache.persist` per entry.
   *
   * @param ids {Array<string>} Cache hashes to persist
   * @returns {Promise<void>}
   */
  async persist(ids) {
    let create = false;
    try {
      await access(this.tape);
    } catch (e) {
      create = true;
    }
    const zipfs = new ZipFS(this.tape, { create });

    for (const hash of ids) {
      const record = this.cache[hash];
      if (!record) {
        debug(`Attempted to record ${hash} but it's not found`);
        return;
      }
      const filename = ppath.join(PortablePath.root, `${hash}.json`);
      debug(`Record ${filename} into tape ${this.tape}`);
      // 'pretty-print' json since it'll be compressed anyway
      await zipfs.writeFilePromise(filename, JSON.stringify(record, null, 2));

      this.cache[hash] = {
        ...this.cache[hash],
        tape: this.tape,
        filename,
      };

      this.dispatch(events.persist, {
        id: hash,
        tape: this.tape,
        filename,
      });
    }

    zipfs.saveAndClose();
  }

  /**
   * Clear the in-memory cache and bootstrap it from the zip tape.
   *
   * - Reset the cache
   * - Read a cache tape to bootstrap in-memory cache
   *
   * Invalid/corrupt records found on the tape are deleted from it.
   * Dispatches `cache.reset`.
   *
   * @param options {object}
   * @param {string=} options.tape - Path to the zip tape file; when falsy only clears
   * @returns {Promise<void>}
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

          this.cache[name] = {
            id: name,
            request: obj.request,
            response: obj.response,
            tape: this.tape,
            filename,
          };
        } catch (e) {
          debug(
            `failed to read ${filename}. The file will be deleted! ERROR: ${e}`
          );
          await zipfs.unlinkPromise(filename);
        }
      }
    }

    zipfs.discardAndClose();
    this.dispatch(events.reset);
  }

  /**
   * Delete cache entries by hash, both from memory and from their tape.
   *
   * Per-entry failures (e.g. deleting a non-existent hash) are collected
   * and returned rather than thrown.
   *
   * @param ids  {Array<string>} Cache hashes to delete
   *
   * @return {Promise<string[]>} Error messages for entries that failed to delete
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
        const record = this.cache[hash];

        if (!record) {
          const errorMessage = `Attempted to delete a record that does not exist ${hash}`;
          debug(errorMessage);
          throw new Error(errorMessage);
        }

        await this.revert(record.request);

        if (record.tape) {
          debug(`Delete record ${record.filename} from tape ${record.tape}`);

          await getZip(record.tape).unlinkPromise(record.filename);

          this.dispatch(events.delete, { id: hash });
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

  /**
   * Replace a cache entry's response and re-persist it if it lives on a tape.
   * Dispatches `cache.update`.
   *
   * @param {object} param0
   * @param {string} param0.id       - Cache hash to update
   * @param {object} param0.response - Partial response update (body + headers)
   * @returns {Promise<void>}
   */
  async update({ id, response }) {
    const newResponse = await updateResponse(this.cache[id].response, response);

    this.cache[id].response = newResponse;
    debug(`Update record ${id}`);
    this.dispatch(events.update, this.cache[id]);

    if (this.cache[id].tape) {
      await this.persist([id]);
    }
  }

  /**
   * Empty the in-memory staged and committed caches.
   * Dispatches `cache.clear`.
   */
  clear() {
    this.staged = {};
    this.cache = {};
    this.dispatch(events.clear);
  }
}

export default Cache;
