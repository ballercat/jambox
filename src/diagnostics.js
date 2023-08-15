// @ts-check
const DC = require('node:diagnostics_channel');

const debugChannel = DC.channel('debug');

/**
 * @param {string} n
 */
const createDebug = (n) => {
  const namespace = ['jambox', n].filter(Boolean).join('.');
  /**
   * @param {string} message
   */
  return (message) => debugChannel.publish({ namespace, message });
};

module.exports = {
  debugChannel,
  createDebug,
};
