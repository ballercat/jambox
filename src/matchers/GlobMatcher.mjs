// @ts-check
import minimatch from 'minimatch';
import mockttp from 'mockttp';

const checkGlobs = (url, globs) => {
  for (const glob of globs) {
    if (!minimatch(url.pathname, glob)) {
      return false;
    }
  }

  return true;
};

const pathGlobMatcher = (target, options) => (request) => {
  const url = new URL(request.url);
  if (target !== '*' && target.hostname !== url.hostname) {
    return false;
  }

  return checkGlobs(url, options.paths);
};

export default class GlobMatcher extends mockttp.matchers.CallbackMatcher {
  #options;

  constructor(target, options) {
    super(pathGlobMatcher(target, options));

    this.#options = {
      target,
      ...options,
    };
  }
  explain() {
    return `GlobMatcher ${JSON.stringify(this.#options)}`;
  }
}
