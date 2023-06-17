// @ts-check
import path from 'path';
import fs from 'fs';
import { EXTENSION_PATH } from './constants.mjs';

export default function persistRuntimeConfig(config) {
  fs.writeFileSync(
    path.join(EXTENSION_PATH, 'runtime.json'),
    JSON.stringify(config, null, 2)
  );
}
