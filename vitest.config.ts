import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // e2e/ holds Playwright browser tests (run via `npm run test:e2e`),
    // not vitest tests — without this, vitest's default *.spec.ts glob
    // also picks them up and fails on Playwright's own `test()` global.
    exclude: [...configDefaults.exclude, "**/e2e/**"],
  },
});
