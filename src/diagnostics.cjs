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
exports.createDebug = createDebug;

/**
 * @type {Record<string, any>}
 */
const debuggers = {};
let enabled = false;
debugChannel.subscribe(
  (/** @type {{namespace: string; message: string; }} */ event) => {
    if (!enabled) {
      return;
    }
    if (!debuggers[event.namespace]) {
      debuggers[event.namespace] = _debug(event.namespace);
    }
    debuggers[event.namespace](event.message);
  }
);
exports.debugChannel = debugChannel;

const enable = () => {
  enabled = true;
};
exports.enable = enable;
