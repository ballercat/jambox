const prettier = require('prettier');
const manifest = require('./ext/manifest');

class ManifestPlugin {
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

module.exports = ManifestPlugin;
