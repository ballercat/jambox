import prettier from 'prettier';
import manifest from './ext/manifest.js';

export default class ManifestPlugin {
  apply(compiler) {
    compiler.hooks.make.tap('ManifestPlugin', (compilation) => {
      const fileName = 'manifest.json';
      const manifestJSON = prettier.format(JSON.stringify(manifest), {
        filepath: fileName,
      });

      compilation.emitAsset(fileName, {
        source() {
          return manifestJSON;
        },
        size() {
          return manifestJSON.length;
        },
      });
    });
  }
}
