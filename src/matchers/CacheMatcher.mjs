// @ts-nocheck
import mockttp from 'mockttp';
import minimatch from 'minimatch';
import Cache from '../Cache.mjs';

/**
 * Request matcher that determines whether a request should be served from cache.
 *
 * A request matches if:
 * 1. The cache is not in bypass mode
 * 2. The request URL matches a `stage` glob pattern
 * 3. The request URL does not match an `ignore` glob pattern
 * 4. Either network access is blocked OR the request hash exists in cache
 *
 * @extends {mockttp.matchers.CallbackMatcher}
 */
export default class CacheMatcher extends mockttp.matchers.CallbackMatcher {
  /** @type {{ stage?: string[], ignore?: string[] }} */
  #options;

  /**
   * Creates a new CacheMatcher.
   *
   * @param {import('../Jambox.mjs').default} jambox   - The active Jambox instance
   * @param {object}                          [options] - Cache match configuration
   * @param {string[]}                        [options.stage]  - Glob patterns of URLs to stage/cache
   * @param {string[]}                        [options.ignore] - Glob patterns of URLs to exclude from caching
   */
  constructor(jambox, options = {}) {
    super(async (request) => {
      if (jambox.cache.bypass()) {
        return false;
      }

      const { ignore = [], stage = [] } = options;
      const url = new URL(request.url);
      const testGlob = (/** @type {string} */ glob) =>
        minimatch(url.hostname + url.pathname, glob);
      const ignored = ignore.some(testGlob);

      if (ignored) {
        return false;
      }

      const matched = stage.some(testGlob);

      if (!matched) {
        return;
      }

      if (jambox.config.blockNetworkRequests) {
        return true;
      }

      const hash = await Cache.hash(request);

      return jambox.cache.has(hash);
    });
    this.#options = options;
  }

  /**
   * Returns a human-readable description of the matcher configuration.
   *
   * @returns {string}
   */
  explain() {
    return `CacheMatcher ${JSON.stringify(this.#options)}`;
  }
}
