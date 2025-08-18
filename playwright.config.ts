import { defineConfig } from '@playwright/test';

const E2E_ENABLED = process.env.E2E_ENABLED === 'true';

export default defineConfig({
  testDir: './e2e',
  grepInvert: E2E_ENABLED ? undefined : /.*/, // skippt alle Tests wenn Flag nicht gesetzt
  reporter: 'list',
  use: {
    headless: true,
  },
});
