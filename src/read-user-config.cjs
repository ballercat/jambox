const { createDebug } = require('./diagnostics.cjs');

const debug = createDebug('jambox.config');

/**
 * Load a user config module (CJS) from disk, bypassing the require cache
 * so config file changes are picked up on reload.
 *
 * @param {string} filepath - Absolute path to the user's `jambox.config.js`
 * @returns {object} The exported config, or `{}` when the file cannot be loaded
 */
module.exports = (filepath) => {
  try {
    delete require.cache[require.resolve(filepath)];
    return require(filepath);
  } catch (error) {
    debug(`No config file found: ${filepath}.`);
    return {};
  }
};
