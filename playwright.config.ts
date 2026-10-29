import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

if (existsSync('.env.ui.local')) process.loadEnvFile('.env.ui.local')
const baseURL = process.env.UI_BASE_URL || 'http://127.0.0.1:5173'
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0, // Mutations must never be replayed automatically.
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['./e2e/support/redact-reporter.ts'],
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/automated.json' }],
  ],
  use: {
    baseURL,
    // Login credentials and session tokens must not enter trace/network archives.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.UI_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
})
