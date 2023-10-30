const { createDebug } = require('./diagnostics.js');

const debug = createDebug('jambox.config');

module.exports = (filepath) => {
  try {
    delete require.cache[require.resolve(filepath)];
    return require(filepath);
  } catch (error) {
    debug(`No config file found: ${filepath}.`);
    return {};
  }
};
