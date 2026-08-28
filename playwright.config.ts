import { defineConfig, devices } from "@playwright/test";

/** Point at a remote host (e.g. Proxmox sandbox) — skips local webServer. */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";
const useRemoteServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  /** Bound CI so auth misconfig cannot hang the job for 20+ minutes. */
  globalTimeout: process.env.CI ? 15 * 60 * 1000 : undefined,
  timeout: 30_000,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: /@mobile\b/,
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
      grep: /@mobile\b/,
    },
  ],
  ...(useRemoteServer
    ? {}
    : {
        webServer: {
          // CI already runs `npm run build`; start the prod server so minified
          // hydration throws (#418) surface the same way users see them.
          command: process.env.CI ? "npm run start" : "npm run dev",
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            ...process.env,
            AUTH_SECRET:
              process.env.AUTH_SECRET ?? "ci-build-secret-not-for-production",
            AUTH_ALLOW_DEMO_USERS: process.env.AUTH_ALLOW_DEMO_USERS ?? "true",
            NEXT_PUBLIC_DEMO_SITE: process.env.NEXT_PUBLIC_DEMO_SITE ?? "true",
            NEXT_PUBLIC_OFFICER_HUB_PUBLIC:
              process.env.NEXT_PUBLIC_OFFICER_HUB_PUBLIC ?? "true",
          },
        },
      }),
});
