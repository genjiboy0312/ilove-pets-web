import { defineConfig } from "@playwright/test"
import { loadEnv } from "vite"

const publicEnv = loadEnv("production", process.cwd(), "VITE_")

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  metadata: {
    authConfigured: Boolean(
      publicEnv["VITE_SUPABASE_URL"] && publicEnv["VITE_SUPABASE_PUBLISHABLE_KEY"],
    ),
  },
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: "npm run preview",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env["CI"],
    timeout: 120000,
  },
})
