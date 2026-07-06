/**
 * MishiPass visual-audit screenshot harness.
 *
 * Requires wrangler dev running on http://localhost:8787 with the local-visual-qa seed applied.
 * Seeds: dev@mishipass.local / devpass123 (owner id 900, cats MP-QA-T001-A001 through MP-QA-T006-S001)
 *
 * Run: npx playwright test e2e/visual-audit.spec.ts --reporter=line
 *
 * Screenshots land in: artifacts/browser-audit/current/<page-slug>.<viewport>.png
 */

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// ── Setup ──────────────────────────────────────────────────────────────────

const OUT_DIR = path.resolve(__dirname, "../artifacts/browser-audit/current");

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
} as const;

type ViewportName = keyof typeof VIEWPORTS;

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function loginAndGetCookies(
  context: BrowserContext,
): Promise<void> {
  // POST to the login API to establish a session cookie
  const res = await context.request.post("/api/auth/login", {
    data: { email: "dev@mishipass.local", password: "devpass123" },
    headers: { "Content-Type": "application/json" },
  });
  // 200 = login succeeded (cookie set in context automatically)
  // If it returns 401, the seed owner is not present — fail clearly.
  if (res.status() !== 200) {
    const body = await res.text();
    throw new Error(
      `Login failed with status ${res.status()}: ${body}. ` +
        "Ensure the local-visual-qa seed has been applied.",
    );
  }
}

async function screenshot(
  page: Page,
  slug: string,
  viewport: ViewportName,
): Promise<void> {
  ensureOutDir();
  await page.setViewportSize(VIEWPORTS[viewport]);
  const filename = `${slug}.${viewport}.png`;
  await page.screenshot({
    path: path.join(OUT_DIR, filename),
    fullPage: false,
  });
}

// ── Test suite ─────────────────────────────────────────────────────────────

test.describe("visual-audit — unauthenticated public pages", () => {
  for (const viewport of ["desktop", "mobile"] as ViewportName[]) {
    test(`root landing page [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "root", viewport);
    });

    test(`public profile active MP-QA-T001-A001 [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/c/MP-QA-T001-A001");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "public-profile-active", viewport);
    });

    test(`missing alert public MP-QA-T002-M001 [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/c/MP-QA-T002-M001");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "missing-alert-public", viewport);
    });

    test(`recovery board [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/recovery-board");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "recovery-board", viewport);
    });

    test(`sighting report form MP-QA-T006-S001 [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/c/MP-QA-T006-S001/sighting");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "sighting-report", viewport);
    });

    test(`invalid QR MP-XX-0000-0000 [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/c/MP-XX-0000-0000");
      // Expect 404
      expect(res?.status()).toBe(404);
      await screenshot(page, "invalid-qr", viewport);
    });
  }
});

test.describe("visual-audit — authenticated pages", () => {
  let authContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    authContext = await browser.newContext({
      baseURL: "http://localhost:8787",
    });
    await loginAndGetCookies(authContext);
  });

  test.afterAll(async () => {
    await authContext.close();
  });

  for (const viewport of ["desktop", "mobile"] as ViewportName[]) {
    test(`dashboard [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "dashboard", viewport);
      await page.close();
    });

    test(`cat registration (dashboard/register) [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/register");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "cat-registration", viewport);
      await page.close();
    });

    test(`settings [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/settings");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "settings", viewport);
      await page.close();
    });

    test(`cat detail MP-QA-T001-A001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T001-A001");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "cat-detail", viewport);
      await page.close();
    });

    test(`qr card MP-QA-T001-A001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T001-A001/qr");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "qr-card", viewport);
      await page.close();
    });

    test(`digital cartilla MP-QA-T005-C001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T005-C001/cartilla");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "digital-cartilla", viewport);
      await page.close();
    });

    test(`public profile settings MP-QA-T001-A001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T001-A001/public-profile");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "public-profile-settings", viewport);
      await page.close();
    });

    test(`missing card MP-QA-T002-M001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T002-M001/missing-card");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "missing-card", viewport);
      await page.close();
    });

    test(`sighting inbox MP-QA-T006-S001 [${viewport}]`, async () => {
      const page = await authContext.newPage();
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/dashboard/cats/MP-QA-T006-S001/sightings");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "sighting-inbox", viewport);
      await page.close();
    });
  }

  // Pages noted as not existing or not applicable
  // medical-record: no standalone route (part of cartilla page) — not captured separately
  // vaccine-portal: no standalone route (part of cartilla page) — not captured separately
  // vet-portal: no standalone dashboard route for vet-mode view (vet acts via public QR scan)
  //   Capturing public vet-mode QR profile instead:
  for (const viewport of ["desktop", "mobile"] as ViewportName[]) {
    test(`vet portal (public vet-mode profile) MP-QA-T003-V001 [${viewport}]`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const res = await page.goto("/c/MP-QA-T003-V001");
      expect(res?.status()).toBeLessThan(500);
      await screenshot(page, "vet-portal", viewport);
    });
  }
});
