import * as nodeFSPromises from 'node:fs/promises';
import { importFromString } from 'module-from-string';
import * as esbuild from 'esbuild';

export const getLoader = (fsPromises = nodeFSPromises) => {
  return async function loadConfig(/** @type {string} */ file) {
    const code = await fsPromises.readFile(file, 'utf-8');
    try {
      const result = await importFromString(code);
      if (result && result.default) {
        return result.default;
      }

      return result;
    } catch (e) {
      // non esbuild error
      if (!e.errors) {
        throw new Error(`Could not load ${file}`, { cause: e });
      }

      // Format the esbuild problem and throw that as the error
      const errors = await esbuild.formatMessages(
        e.errors.map(({ location, ...rest }) => {
          return {
            ...rest,
            location: {
              ...location,
              file,
            },
          };
        }),
        {
          kind: 'error',
          color: false,
          terminalWidth: 80,
        }
      );
      throw new Error(errors.join('\n'));
    }
  };
};
