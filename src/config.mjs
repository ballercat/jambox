import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import getUserConfigFile from './read-user-config.js';
import {
  PROJECT_ROOT,
  CONFIG_FILE_NAME,
  CACHE_DIR_NAME,
} from './constants.mjs';

export default function config(overrides = {}, cwd = process.cwd()) {
  const filepath = path.join(cwd, CONFIG_FILE_NAME);
  // Works with .json & .js
  const userConfig = getUserConfigFile(filepath);
  const cacheDir = path.join(cwd, CACHE_DIR_NAME);

  const logName = `sever.${new Date().toISOString().split('T')[0]}.log`;

  const config = deepmerge(
    {
      cwd,
      filepath,
      logLocation: path.join(PROJECT_ROOT, logName),
      forward: {},
      noProxy: ['<-loopback->'],
      ...userConfig,
    },
    overrides
  );

  if (fs.existsSync(cacheDir)) {
    config.cache = deepmerge(config.cache || {}, { dir: cacheDir });
    config.logLocation = path.join(cacheDir, logName);
  }

  return config;
}
