import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  css: {
    transformer: "postcss",
  },
  build: {
    cssMinify: "esbuild",
  },
  preview: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
})
