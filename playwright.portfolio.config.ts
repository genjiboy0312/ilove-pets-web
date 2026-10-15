import { defineConfig } from "@playwright/test"
import base from "./playwright.config"

// Isolated production preview; never records a user's existing browser session.
export default defineConfig({
  ...base,
  testDir: "./tests/portfolio",
  testMatch: "**/*.demo.ts",
  timeout: 90000,
  outputDir: "test-results/portfolio",
  use: { ...base.use, baseURL: "http://127.0.0.1:5178" },
  webServer: {
    command: "node node_modules/vite/bin/vite.js preview --port 5178 --strictPort",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
    timeout: 120000,
  },
})
