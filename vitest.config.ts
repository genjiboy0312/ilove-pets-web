import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    globals: false,
    maxWorkers: 2,
    setupFiles: ["src/test/setup.ts"],
    css: true,
    coverage: {
      enabled: false,
    },
  },
})
