import { defineConfig } from "cypress";
import synpressPlugins from "@synthetixio/synpress/plugins";

export default defineConfig({
  userAgent: 'synpress',
  chromeWebSecurity: true,
  e2e: {
    baseUrl: 'http://localhost:9000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    setupNodeEvents(on, config) {
      synpressPlugins(on, config);
    },
  },
});
