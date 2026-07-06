import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",

  use: {
    baseURL: "http://localhost:8787",
    extraHTTPHeaders: { Accept: "text/html,application/json" },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev --workspace=apps/worker",
    url: "http://localhost:8787",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
