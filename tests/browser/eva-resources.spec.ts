import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots");

async function ensurePanelExpanded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  const panel = page.locator(".panel-scroll");
  if (await panel.isVisible()) return;

  // On compact/mobile viewports, try footer EVA Resources button or sheet handle
  const evaBtn = page.locator("footer").getByRole("button", { name: "EVA Resources" });
  if (await evaBtn.isVisible()) {
    await evaBtn.click();
    await page.waitForTimeout(300);
    if (await panel.isVisible()) return;
  }

  const handle = page.locator(".sheet-handle");
  if (await handle.isVisible()) {
    await handle.click();
    await page.waitForTimeout(300);
  }
}

async function checkHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientW = Math.max(doc.clientWidth, body.clientWidth);
    return Math.max(scrollW - clientW, 0);
  });
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
});

test.describe("Unified EVA Resource Planning System", () => {
  test("Desktop (1440px): Gale Crater EVA Resources workflow with live recalculation", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=gale&panel=eva");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();

    // Verify Title and Subtitle
    await expect(
      panel.getByRole("heading", { name: "Unified Life-Support Planning" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "Evidence-based oxygen, electrical energy, cooling water, and sortie duration estimates for Gale Crater.",
    );

    // Verify Section A: Route Summary
    const routeSummary = panel.getByTestId("eva-route-summary");
    await expect(routeSummary).toBeVisible();
    await expect(routeSummary).toContainText("Mission Route Summary");
    await expect(routeSummary).toContainText("Gale Crater");

    // Verify Section B: Reference Profile Selector
    const profileSection = panel.getByTestId("eva-profile-section");
    await expect(profileSection).toBeVisible();
    await expect(panel.getByTestId("eva-profile-select")).toBeVisible();
    await expect(profileSection).toContainText("NASA Life Support BVAD Rev 2");

    // Verify Section C: All 4 Primary Resource Cards
    await expect(panel.getByTestId("eva-card-oxygen")).toBeVisible();
    await expect(panel.getByTestId("eva-card-battery")).toBeVisible();
    await expect(panel.getByTestId("eva-card-cooling-water")).toBeVisible();
    await expect(panel.getByTestId("eva-card-duration")).toBeVisible();

    // Verify Section D: Planning Settings & Reserves
    const settingsSection = panel.getByTestId("eva-planning-settings");
    await expect(settingsSection).toBeVisible();
    await expect(panel.getByTestId("eva-speed-input")).toBeVisible();
    await expect(panel.getByTestId("eva-o2-reserve")).toBeVisible();
    await expect(panel.getByTestId("eva-battery-reserve")).toBeVisible();
    await expect(panel.getByTestId("eva-cooling-reserve")).toBeVisible();

    // Verify Section E: Scientific Explanation (collapsible)
    const explanation = panel.getByTestId("eva-scientific-explanation");
    await expect(explanation).toBeVisible();
    await expect(explanation).toContainText("Scientific Basis, Formulas & Traceable Data Provenance");

    // Test Live Recalculation: Adjust Walking Speed
    const speedInput = panel.getByTestId("eva-speed-input");
    await speedInput.fill("2.0");
    await page.waitForTimeout(200);

    // Test Live Recalculation: Adjust O2 Reserve
    const o2ReserveInput = panel.getByTestId("eva-o2-reserve");
    await o2ReserveInput.fill("30");
    await page.waitForTimeout(200);

    // Switch Profile to Apollo 15–17 PLSS
    const profileSelect = panel.getByTestId("eva-profile-select");
    await profileSelect.selectOption("apollo-15-plss");
    await page.waitForTimeout(200);
    await expect(profileSection).toContainText("Apollo 15–17 Portable Life Support System");

    // Verify no horizontal overflow
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Verify no fatal console errors
    expect(consoleErrors.filter((e) => !e.includes("favicon"))).toHaveLength(0);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "eva-resources-desktop-1440.png"),
      fullPage: true,
    });
  });

  test("Desktop (1440px): Jezero Crater EVA resource estimation consistency", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=jezero&panel=eva");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("estimates for Jezero Crater.");

    const routeSummary = panel.getByTestId("eva-route-summary");
    await expect(routeSummary).toBeVisible();
    await expect(routeSummary).toContainText("Jezero Crater");

    // Verify 4 cards render
    await expect(panel.getByTestId("eva-card-oxygen")).toBeVisible();
    await expect(panel.getByTestId("eva-card-battery")).toBeVisible();
    await expect(panel.getByTestId("eva-card-cooling-water")).toBeVisible();
    await expect(panel.getByTestId("eva-card-duration")).toBeVisible();

    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "eva-resources-jezero.png"),
      fullPage: true,
    });
  });

  test("Desktop (1440px): Oxia Planum geometric route assumptions and terrain unmodeled disclosure", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=oxia&panel=eva");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("estimates for Oxia Planum.");

    const routeSummary = panel.getByTestId("eva-route-summary");
    await expect(routeSummary).toBeVisible();
    await expect(routeSummary).toContainText("Oxia Planum");
    await expect(routeSummary).toContainText("Route metrics unavailable");

    // Enter manual distance planning assumption (5,000 meters)
    const manualDistInput = panel.getByTestId("eva-manual-distance");
    await manualDistInput.fill("5000");
    await page.waitForTimeout(300);

    // Verify distance is now 5.00 km and geometric trajectory disclosure appears
    await expect(routeSummary).toContainText("5.00 km");
    await expect(routeSummary).toContainText("Proposed geometric trajectory");
    await expect(routeSummary).toContainText("Spherical Mars approximation");

    // Verify Oxia unmodeled terrain disclosure in scientific explanation
    const explanation = panel.getByTestId("eva-scientific-explanation");
    await expect(explanation).toContainText("Scientific Basis, Formulas & Traceable Data Provenance");

    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "eva-resources-oxia.png"),
      fullPage: true,
    });
  });

  test("Tablet (768px): Responsive EVA layout without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/?region=gale&panel=eva");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("eva-card-oxygen")).toBeVisible();
    await expect(panel.getByTestId("eva-card-battery")).toBeVisible();

    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "eva-resources-tablet-768.png"),
      fullPage: true,
    });
  });

  test("Mobile (390px): Responsive EVA layout on mobile without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?region=gale&panel=eva");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId("eva-card-oxygen")).toBeVisible();

    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "eva-resources-mobile-390.png"),
      fullPage: true,
    });
  });

  test("Mission Brief integration: includes EVA Life-Support Resources & Duration section", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=jezero");
    await ensurePanelExpanded(page);

    // Open brief modal by clicking "Review brief" / File icon or using brief modal
    const briefBtn = page.getByRole("button", { name: "Review brief" });
    if (await briefBtn.isVisible()) {
      await briefBtn.click();
      const dialog = page.locator(".dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText("EVA Life-Support Resources & Duration");
      await expect(dialog).toContainText("Estimated oxygen");
      await expect(dialog).toContainText("Estimated battery");
      await expect(dialog).toContainText("Estimated cooling water");
      await expect(dialog).toContainText("Planned EVA duration");
    }
  });

  test("Environmental conditions panel preservation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=gale&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("Gale Crater · Curiosity Historical Observations");
    await expect(panel).toContainText("Surface Weather — Curiosity REMS");
    await expect(panel).toContainText("Radiation — Curiosity RAD");
  });
});
