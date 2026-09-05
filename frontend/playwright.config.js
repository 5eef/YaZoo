import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'
const apiURL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000/api'
const shouldStartWebServer = process.env.E2E_SKIP_WEBSERVER !== 'true'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: shouldStartWebServer
    ? {
        command: 'node ./node_modules/vite/bin/vite.js --configLoader native --host 127.0.0.1',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000,
        env: {
          VITE_API_URL: apiURL,
          VITE_GOOGLE_AUTH_ENABLED: 'false',
          VITE_REALTIME_ENABLED: 'false',
          VITE_MONITORING_ENABLED: 'false',
        },
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
