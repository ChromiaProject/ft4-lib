import { defineConfig } from "cypress";
import synpressPlugins from "@synthetixio/synpress/plugins";
import webpackPreprocessor from '@cypress/webpack-preprocessor';
import cypressWebpackConfig from './cypress/webpack.config';

export default defineConfig({
  userAgent: 'synpress',
  chromeWebSecurity: true,
  e2e: {
    baseUrl: 'http://localhost:9000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      // Register custom webpack configuration for Cypress
      // This is required for Synpress modules to load correctly
      on('file:preprocessor', webpackPreprocessor({
        webpackOptions: cypressWebpackConfig,
        watchOptions: {},
      }));

      // Register Synpress plugins
      synpressPlugins(on, config);

      return config;
    },
  },
});
