const { defineConfig } = require('cypress');
const webpackConfig = require('./webpack.config.js');

module.exports = defineConfig({
  viewportHeight: 720,
  viewportWidth: 1280,
  component: {
    specPattern: 'ext/**/*.cy.js',
    devServer: {
      framework: 'svelte',
      bundler: 'webpack',
      webpackConfig,
    },
  },
});
