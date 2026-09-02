import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL

if (!externalBaseURL) {
  throw new Error(
    "PLAYWRIGHT_BASE_URL must point to Aaron's already-running local app.",
  )
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: externalBaseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit-iphone-portrait',
      use: { ...devices['iPhone 15'] },
    },
    {
      name: 'webkit-iphone-landscape',
      use: {
        ...devices['iPhone 15'],
        viewport: { width: 844, height: 390 },
      },
    },
  ],
})
