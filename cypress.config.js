import fetch from 'node-fetch';
import { defineConfig } from 'cypress';
import webpackConfig from './webpack.config.js';
import nodeEvents from './cypress-node-events.js';

const config = defineConfig({
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
    setupNodeEvents(on, config) {
      nodeEvents(on);

      // Shutdown the server after `yarn cypress run --component completes
      // This ensures that c8 outputs the lcov.info file properly
      on('after:run', () => {
        return fetch('http://localhost:9000/shutdown');
      });
      return config;
    },
  },
});

export default config;
