// @ts-check
import mockttp from 'mockttp';
import minimatch from 'minimatch';
import Cache from '../Cache.mjs';

export default class CacheMatcher extends mockttp.matchers.CallbackMatcher {
  #options;

  /**
   * @param {import('../Jambox.mjs').default} jambox
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

  explain() {
    return `CacheMatcher ${JSON.stringify(this.#options)}`;
  }
}
