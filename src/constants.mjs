import * as url from 'url';
import path from 'path';
import fs from 'fs';

// @ts-ignore
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/** Absolute path to the jambox package root */
export const PROJECT_ROOT = path.join(__dirname, '..');
/** Path to the script injected into child node processes to wire up the proxy */
export const SCRIPT_HELPER = path.join(PROJECT_ROOT, 'src', 'script-helper.js');
/** Path to the built browser extension loaded into proxied Chrome */
export const EXTENSION_PATH = path.join(PROJECT_ROOT, 'build');
/** Path to this package's package.json */
export const PACKAGE_JSON_PATH = path.join(PROJECT_ROOT, 'package.json');
/** Name of the per-project cache directory created inside the user's cwd */
export const CACHE_DIR_NAME = '.jambox';
/** Name of the user config file jambox loads from the cwd */
export const CONFIG_FILE_NAME = 'jambox.config.js';
/** Default filename of the zip "tape" cache file inside the cache dir */
export const DEFAULT_TAPE_NAME = 'default.tape.zip';

let version = null;
/**
 * Get the jambox version from package.json (cached after first read).
 *
 * @returns {string|null} Version string, or `null` if package.json could not be read
 */
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
