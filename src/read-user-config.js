const debug = require('debug')('jambox.config');

module.exports = (filepath) => {
  try {
    delete require.cache[require.resolve(filepath)];
    return require(filepath);
  } catch (error) {
    debug(`No config file found: ${filepath}.`);
    return {};
  }
};
