import * as url from 'url';
import path from 'path';
import fs from 'fs';

// @ts-ignore
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const PROJECT_ROOT = path.join(__dirname, '..');
export const SCRIPT_HELPER = path.join(PROJECT_ROOT, 'src', 'script-helper.js');
export const EXTENSION_PATH = path.join(PROJECT_ROOT, 'build');
export const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
export const CACHE_DIR_NAME = '.jambox';
export const CONFIG_FILE_NAME = 'jambox.config.js';
export const DEFAULT_TAPE_NAME = 'default.tape.zip';

let version = null;
export const getVersion = () => {
  if (version) {
    return version;
  }

  try {
    const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
    version = JSON.parse(content).version;
    return version;
  } catch (e) {
    console.log('Failed while loading jambox pacakge.json', e);
    return null;
  }
};
