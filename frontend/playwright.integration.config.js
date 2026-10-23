import { defineConfig } from '@playwright/test'
import process from 'node:process'

// Requires scripts/start-social-e2e.ps1 or an equivalent disposable fixture.
export default defineConfig({
  testDir: './e2e',
  testMatch: [
    'social-marketplace-fullstack.spec.js',
    'social-notifications-fullstack.spec.js',
    'social-media-s3.spec.js',
  ],
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', {
    outputFile: process.env.E2E_REPORT_PATH ?? 'test-results/integration.json',
  }]],
  use: { baseURL: 'http://127.0.0.1:5182', browserName: 'chromium' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --configLoader native --config e2e/social-vite.config.js --host 127.0.0.1 --port 5182 --strictPort',
    url: 'http://127.0.0.1:5182',
    reuseExistingServer: false,
    env: {
      VITE_API_URL: 'http://127.0.0.1:8012/api',
      VITE_GOOGLE_AUTH_ENABLED: 'false',
      VITE_REALTIME_ENABLED: 'false',
      VITE_MONITORING_ENABLED: 'false',
    },
  },
})
