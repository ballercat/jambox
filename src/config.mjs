import fs from 'fs';
import path from 'path';
import deepmerge from 'deepmerge';
import getUserConfigFile from './read-user-config.js';
import { CONFIG_FILE_NAME, CACHE_DIR_NAME } from './constants.mjs';

const prepCacheDir = (cwd) => {
  const cacheDir = path.join(cwd, CACHE_DIR_NAME);
  if (fs.existsSync(cacheDir)) {
    return;
  }

  console.log(`Couldn't locale ${CACHE_DIR_NAME}/, creating one.`);
  fs.mkdirSync(cacheDir);
};

export default function config(overrides = {}, cwd = process.cwd()) {
  const filepath = path.join(cwd, CONFIG_FILE_NAME);
  // Works with .json & .js
  const userConfig = getUserConfigFile(filepath);
  const cacheDir = path.join(cwd, CACHE_DIR_NAME);

  const logName = `sever.${new Date().toISOString().split('T')[0]}.log`;

  prepCacheDir(cwd);

  const config = deepmerge(
    {
      cwd,
      filepath,
      logLocation: path.join(cacheDir, logName),
      forward: {},
      noProxy: ['<-loopback->'],
      ...userConfig,
    },
    overrides
  );

  config.cache = deepmerge(config.cache || {}, { dir: cacheDir });

  return config;
}
