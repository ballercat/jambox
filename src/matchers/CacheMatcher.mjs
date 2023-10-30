// @ts-check
import mockttp from 'mockttp';
import minimatch from 'minimatch';
import Cache from '../Cache.mjs';

export default class CacheMatcher extends mockttp.matchers.CallbackMatcher {
  #options;

  /**
   * @param svc {object}
   * @param svc.cache {Cache}
   */
  constructor(svc, options = {}) {
    super(async (request) => {
      if (svc.cache.bypass()) {
        return false;
      }

      const { ignore = [], stage = [] } = options;
      const url = new URL(request.url);
      const testGlob = (glob) => minimatch(url.hostname + url.pathname, glob);
      const ignored = ignore.some(testGlob);
      const matched = stage.some(testGlob);

      const hash = await Cache.hash(request);

      return !ignored && matched && svc.cache.has(hash);
    });
    this.#options = options;
  }

  explain() {
    return `CacheMatcher ${JSON.stringify(this.#options)}`;
  }
}
