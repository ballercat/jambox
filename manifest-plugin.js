const prettier = require('prettier');
const { RawSource } = require('webpack-sources');
const manifest = require('./ext/manifest');

class ManifestPlugin {
  apply(compiler) {
    compiler.hooks.make.tapPromise('ManifestPlugin', async (compilation) => {
      const fileName = 'manifest.json';
      const manifestJSON = await prettier.format(JSON.stringify(manifest), {
        filepath: fileName,
      });

      compilation.emitAsset(fileName, new RawSource(manifestJSON));
    });
  }
}

module.exports = ManifestPlugin;
