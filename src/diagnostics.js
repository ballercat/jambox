// @ts-check
const DC = require('node:diagnostics_channel');
const _debug = require('debug');

const debugChannel = DC.channel('debug');

/**
 * @param {string=} n
 */
const createDebug = (n) => {
  const namespace = ['jambox', n].filter(Boolean).join('.');
  /**
   * @param {string} message
   */
  return (message) => debugChannel.publish({ namespace, message });
};

const debuggers = {};
let enabled = false;
debugChannel.subscribe((event) => {
  if (!enabled) {
    return;
  }
  if (!debuggers[event.namespace]) {
    debuggers[event.namespace] = _debug(event.namespace);
  }
  debuggers[event.namespace](event.message);
});

const enable = () => {
  enabled = true;
};

module.exports = {
  debugChannel,
  createDebug,
  enable,
};
