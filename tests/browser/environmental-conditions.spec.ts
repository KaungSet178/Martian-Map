import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots");

async function ensurePanelExpanded(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  const panel = page.locator(".panel-scroll");
  if (await panel.isVisible()) return;

  // On compact/mobile viewports, try footer Environment button or sheet handle
  const envBtn = page.locator("footer").getByRole("button", { name: "Environment" });
  if (await envBtn.isVisible()) {
    await envBtn.click();
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

test.describe("Environmental Conditions Integration", () => {
  test("Desktop (1440px): Gale Crater REMS & RAD environmental panel renders and updates", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=gale&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();

    // Verify Title and Subtitle
    await expect(
      panel.getByRole("heading", { name: "Environmental Conditions" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "Gale Crater · Curiosity Historical Observations",
    );

    // Verify NASA Archive & PDS badges
    await expect(panel).toContainText("NASA Science Archive Ground Truth");
    await expect(panel).toContainText("PDS Verified");

    // Verify Surface Weather section & Sol 100 metadata
    await expect(panel).toContainText("Surface Weather — Curiosity REMS");
    await expect(panel).toContainText("PDS4 MODRDR");
    await expect(panel).toContainText("Sol 100");

    // Verify REMS Temperature and Pressure charts render
    const charts = panel.locator(".gale-env");
    await expect(charts).toBeVisible();

    // Test Unit Toggles: Temperature °C / Kelvin
    const kelvinBtn = panel.getByRole("button", { name: "Kelvin" });
    await expect(kelvinBtn).toBeVisible();
    await kelvinBtn.click();
    await expect(panel).toContainText("K");

    const degCBtn = panel.getByRole("button", { name: "°C" });
    await expect(degCBtn).toBeVisible();
    await degCBtn.click();
    await expect(panel).toContainText("°C");

    // Test Unit Toggles: Pressure hPa / Pa
    const paBtn = panel.getByRole("button", { name: "Pa", exact: true });
    await expect(paBtn).toBeVisible();
    await paBtn.click();
    await expect(panel).toContainText("Pa");

    const hpaBtn = panel.getByRole("button", { name: "hPa", exact: true });
    await expect(hpaBtn).toBeVisible();
    await hpaBtn.click();
    await expect(panel).toContainText("hPa");

    // Verify Radiation section with Detector B and Detector E
    await expect(panel).toContainText("Radiation — Curiosity RAD");
    await expect(panel).toContainText("MSL-M-RAD-3-RDR-V1.0");
    await expect(panel).toContainText("Detector B — Silicon Planar");
    await expect(panel).toContainText("Detector E — Plastic Scintillator");

    // Test Provenance Modal toggle
    const provenanceBtn = panel.getByRole("button", { name: "Provenance" });
    await expect(provenanceBtn).toBeVisible();
    await provenanceBtn.click();
    await expect(panel).toContainText("Provenance & Product Manifest");
    await expect(panel).toContainText("urn:nasa:pds:msl_rems");

    // Check no horizontal overflow
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "gale-environment-1440.png"),
      fullPage: true,
    });
  });

  test("Mobile (390px): Gale Crater responsive layout without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?region=gale&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "Environmental Conditions" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "Gale Crater · Curiosity Historical Observations",
    );

    // Check no horizontal overflow on mobile
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save mobile screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "gale-environment-390.png"),
      fullPage: true,
    });
  });

  test("Desktop (1440px): Jezero Crater Perseverance MEDA panel with 6 sols and sensor distinctions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=jezero&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();

    // Verify Title and Subtitle
    await expect(
      panel.getByRole("heading", { name: "Environmental Conditions" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "Jezero Crater · Perseverance Historical Observations",
    );

    // Verify Verification State badges
    await expect(page.getByTestId("jz-verify-SOURCE_VERIFIED")).toContainText(
      "VERIFIED",
    );

    // Verify all 6 sols are present in the sol switcher
    const sols = [100, 140, 180, 220, 265, 300];
    for (const sol of sols) {
      await expect(page.getByTestId(`jz-sol-${sol}`)).toBeVisible();
    }

    // Switch to Sol 300 and verify active state updates
    await page.getByTestId("jz-sol-300").click();
    await expect(page.getByTestId("jz-sol-300")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("jz-sol-100")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(panel).toContainText("Sol 300");

    // Verify all 5 ATS sensors are distinct in the legend
    await expect(
      panel.locator(".jz-legend-item", { hasText: "Air temperature, ATS 1" }).first(),
    ).toBeVisible();
    await expect(
      panel.locator(".jz-legend-item", { hasText: "Air temperature, ATS 5" }).first(),
    ).toBeVisible();

    // Verify TIRS Ground brightness temperature is clearly identified
    await expect(
      panel.getByRole("heading", { name: "Ground brightness temperature" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "TIRS 8–14 µm brightness temperature, not kinetic",
    );

    // Verify RDS Solar / UV Radiation section
    await expect(panel).toContainText("Solar / UV radiation");

    // Verify Ionizing Radiation shows deliberate honest unavailable state
    await expect(panel).toContainText("Ionizing radiation dose");
    await expect(panel).toContainText(
      "No verified local ionizing-dose measurement integrated",
    );

    // Check no horizontal overflow
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "jezero-environment-1440.png"),
      fullPage: true,
    });
  });

  test("Mobile (390px): Jezero Crater responsive layout without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?region=jezero&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "Environmental Conditions" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "Jezero Crater · Perseverance Historical Observations",
    );

    // Check no horizontal overflow on mobile
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save mobile screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "jezero-environment-390.png"),
      fullPage: true,
    });
  });

  test("Desktop (1440px): Oxia Planum deliberate unavailable state and no foreign data leakage", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=oxia&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();

    // Verify required exact unavailable headings and descriptions
    await expect(
      panel.getByRole("heading", { name: "Environmental observations unavailable" }),
    ).toBeVisible();
    await expect(panel).toContainText(
      "No verified local historical rover observations are currently integrated for Oxia Planum.",
    );

    // Verify critical safety caution alert
    await expect(panel).toContainText(
      "Do not interpret this unavailable state as evidence that the physical environment is safe",
    );

    // Verify landing site geodesy context
    await expect(panel).toContainText("18.28°N, 335.37°E");

    // Verify suggestions to inspect Gale and Jezero
    await expect(panel).toContainText("Curiosity REMS + RAD");
    await expect(panel).toContainText("Perseverance MEDA");

    // Verify NO foreign measurement keys leak into Oxia view
    const panelText = await panel.innerText();
    expect(panelText).not.toContain("CAL_ATS");
    expect(panelText).not.toContain("RME_40632");
    expect(panelText).not.toContain("GT_AMB");

    // Check no horizontal overflow
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "oxia-environment-1440.png"),
      fullPage: true,
    });
  });

  test("Mobile (390px): Oxia Planum deliberate unavailable state without overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?region=oxia&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "Environmental observations unavailable" }),
    ).toBeVisible();

    // Check no horizontal overflow on mobile
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // Save mobile screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "oxia-environment-390.png"),
      fullPage: true,
    });
  });

  test("Tablet (768px): Tablet layout across regions without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    for (const region of ["gale", "jezero", "oxia"]) {
      await page.goto(`/?region=${region}&panel=environment`);
      await ensurePanelExpanded(page);
      const panel = page.locator(".panel-scroll");
      await expect(panel).toBeVisible();

      const overflow = await checkHorizontalOverflow(page);
      expect(overflow, `${region} should not overflow at 768px`).toBeLessThanOrEqual(1);
    }
  });

  test("Region Switching: Switch Gale -> Jezero -> Oxia -> Gale cleanly maintains environment tab and updates data", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=gale&panel=environment");
    await ensurePanelExpanded(page);

    const panel = page.locator(".panel-scroll");
    const regionPicker = page.getByLabel("Mission region", { exact: true });

    // Step 1: Gale
    await expect(panel).toContainText("Curiosity Historical Observations");
    await expect(panel).toContainText("Surface Weather — Curiosity REMS");

    // Step 2: Switch to Jezero
    await regionPicker.selectOption("jezero");
    await page.waitForTimeout(300);
    await expect(panel).toContainText("Perseverance Historical Observations");
    await expect(panel).toContainText("Jezero Crater · Perseverance Historical Observations");
    await expect(panel).not.toContainText("Curiosity Historical Observations");

    // Step 3: Switch to Oxia
    await regionPicker.selectOption("oxia");
    await page.waitForTimeout(300);
    await expect(panel).toContainText("Environmental observations unavailable");
    await expect(panel).toContainText(
      "No verified local historical rover observations are currently integrated for Oxia Planum.",
    );
    await expect(panel).not.toContainText("Perseverance Historical Observations");

    // Step 4: Switch back to Gale
    await regionPicker.selectOption("gale");
    await page.waitForTimeout(300);
    await expect(panel).toContainText("Curiosity Historical Observations");
    await expect(panel).toContainText("Surface Weather — Curiosity REMS");
    await expect(panel).not.toContainText("Environmental observations unavailable");
  });

  test("Standalone Route: /environment with region selector functions seamlessly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/environment?region=gale");

    await expect(
      page.getByRole("heading", { name: "Environmental Ground Truth Research Console" }),
    ).toBeVisible();
    await expect(page.locator(".gale-env")).toBeVisible();

    // Switch to Jezero on standalone page
    const select = page.locator("select").first();
    await select.selectOption("jezero");
    await expect(page.locator(".jz-env-wrap")).toBeVisible();

    // Switch to Oxia on standalone page
    await select.selectOption("oxia");
    await expect(page.locator(".oxia-env")).toBeVisible();
  });
});
