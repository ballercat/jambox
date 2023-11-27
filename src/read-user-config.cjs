const { createDebug } = require('./diagnostics.cjs');

const debug = createDebug('jambox.config');

function getUserConfigFile(filepath) {
  try {
    delete require.cache[require.resolve(filepath)];
    return require(filepath);
  } catch (error) {
    debug(`no config file found: ${filepath}.`);
    return {};
  }
}

exports.getUserConfigFile = getUserConfigFile;
