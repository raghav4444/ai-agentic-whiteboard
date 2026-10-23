import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Excalidraw and Clerk both touch browser globals at import time; giving
    // the environment a real DOM before any module loads avoids flaky
    // "window is not defined" failures.
    globals: true,
  },
})
