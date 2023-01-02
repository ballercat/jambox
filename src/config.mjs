import path from 'path';
import deepmerge from 'deepmerge';
import getUserConfigFile from './read-user-config.js';
import { PROJECT_ROOT } from './constants.mjs';

export default function config(overrides = {}) {
  // Works with .json & .js
  const userConfig = getUserConfigFile();

  return deepmerge(
    {
      logLocation: path.join(PROJECT_ROOT, 'server.log'),
      forward: {},
      noProxy: ['<-loopback->'],
      ...userConfig,
    },
    overrides
  );
}
