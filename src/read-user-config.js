const path = require('path');
const debug = require('debug')('jambox.config');

module.exports = (cwd = process.cwd()) => {
  try {
    return require(path.join(cwd, 'jambox.config'));
  } catch (error) {
    debug('No config file found.');
    return {};
  }
};
