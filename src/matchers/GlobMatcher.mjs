// @ts-nocheck
import minimatch from 'minimatch';
import mockttp from 'mockttp';

/**
 * Test whether all glob patterns match the URL pathname.
 *
 * @param {URL}      url   - Parsed request URL
 * @param {string[]} globs - Glob patterns to test against the pathname
 * @returns {boolean} `true` if every pattern matches
 */
const checkGlobs = (url, globs) => {
  for (const glob of globs) {
    if (!minimatch(url.pathname, glob, { dot: true })) {
      return false;
    }
  }

  return true;
};

/**
 * Build a callback that returns `true` when the request URL host and path
 * match the given forwarding target and path globs.
 *
 * @param {URL|string}  target  - Target URL (hostname must match) or `'*'` to match any host
 * @param {{ paths: string[] }} options - Forwarding options containing path glob patterns
 * @returns {(request: object) => boolean}
 */
const pathGlobMatcher = (target, options) => (request) => {
  const url = new URL(request.url);
  if (target !== '*' && target.hostname !== url.hostname) {
    return false;
  }

  return checkGlobs(url, options.paths);
};

/**
 * Request matcher that matches requests by host and path glob patterns.
 *
 * Used by the forwarding rules to determine whether a request should be
 * proxied to a different host.
 *
 * @extends {mockttp.matchers.CallbackMatcher}
 */
export default class GlobMatcher extends mockttp.matchers.CallbackMatcher {
  /** @type {{ target: URL|string, paths: string[] }} */
  #options;

  /**
   * Creates a new GlobMatcher.
   *
   * @param {URL|string}          target  - Target URL to match against, or `'*'` for any host
   * @param {{ paths: string[] }} options - Options with path glob patterns
   */
  constructor(target, options) {
    super(pathGlobMatcher(target, options));

    this.#options = {
      target,
      ...options,
    };
  }

  /**
   * Returns a human-readable description of the matcher configuration.
   *
   * @returns {string}
   */
  explain() {
    return `GlobMatcher ${JSON.stringify(this.#options)}`;
  }
}
