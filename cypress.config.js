const fetch = require('node-fetch');
const { defineConfig } = require('cypress');
const webpackConfig = require('./webpack.config.js');
const waitOn = require('wait-on');

module.exports = defineConfig({
  viewportHeight: 720,
  viewportWidth: 1280,
  chromeWebSecurity: false,
  experimentalInteractiveRunEvents: true,
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
        'jambox-reset': async () => {
          await waitOn({ resources: [`http://localhost:9000`], timeout: 1500 });
          return fetch(`http://localhost:9000/api/reset`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cwd: process.cwd() }),
          });
        },
      });

      // Shutdown the server after `yarn cypress run --component completes
      // This ensures that c8 outputs the lcov.info file properly
      on('after:run', () => {
        return fetch('http://localhost:9000/shutdown');
      });
    },
  },
});
