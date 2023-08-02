import * as url from 'url';
import path from 'path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const PROJECT_ROOT = path.join(__dirname, '..');
export const SCRIPT_HELPER = path.join(PROJECT_ROOT, 'src', 'script-helper.js');
export const EXTENSION_PATH = path.join(PROJECT_ROOT, 'build');
export const CACHE_DIR_NAME = '.jambox';
export const CONFIG_FILE_NAME = 'jambox.config.js';
export const DEFAULT_TAPE_NAME = 'default.tape.zip';
