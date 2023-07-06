const fetch = require('node-fetch');
const { defineConfig } = require('cypress');
const webpackConfig = require('./webpack.config.js');
const waitOn = require('wait-on');

module.exports = defineConfig({
  viewportHeight: 720,
  viewportWidth: 1280,
  chromeWebSecurity: false,
  component: {
    specPattern: 'ext/**/*.cy.js',
    devServer: {
      framework: 'svelte',
      bundler: 'webpack',
      webpackConfig,
    },
    setupNodeEvents(on) {
      on('task', {
        // Configure Jambox with a dynamic config during a test
        'set-jambox-config': async (jamboxConfig) => {
          // When running the service with yarn dev nodemon will restart the server
          // when src/** folders are changed so it's nicer to just wait for half a
          // second before sending the config request
          await waitOn({ resources: [`http://localhost:9000`], timeout: 1500 });
          return fetch(`http://localhost:9000/api/config`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jamboxConfig),
          });
        },
      });
    },
  },
});
