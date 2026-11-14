import path from "node:path";
import { defineConfig } from "@playwright/test";

const HERE = __dirname;

/**
 * Isolated Playwright config for the Jezero panel preview.
 *
 * The repository config only runs `tests/browser` against the Next.js dev
 * server. This milestone must not modify that shared setup, so the preview is
 * checked against generated static HTML instead:
 *
 *   npx tsx team/environment/jezero/render_preview.tsx
 *   npx playwright test -c team/environment/jezero/playwright.preview.config.ts
 */
export default defineConfig({
  testDir: HERE,
  testMatch: "preview.spec.ts",
  outputDir: path.join(HERE, "test-results"),
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    browserName: "chromium",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--allow-file-access-from-files", "--enable-unsafe-swiftshader"] },
  },
});
