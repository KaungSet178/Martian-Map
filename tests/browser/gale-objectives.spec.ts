import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const outDir = "docs/screenshots/gale-objectives";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

test.describe("G-S2: Gale Scientific Objective Cleanup and Geographic Verification", () => {
  test.beforeAll(async () => {
    await mkdir(outDir, { recursive: true });
  });

  test("Desktop 1440x900: Scenario objectives absent, 4 interpreted areas present and interactive", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Open Gale
    await page.goto("/?region=gale");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);

    // 2. Open Science tab / panel
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);

    // 3. Confirm scenario objectives banner is absent
    const scenarioNotice = page.locator("text=Hypothetical activities are labeled Scenario");
    await expect(scenarioNotice).toHaveCount(0);

    // 4. Confirm exactly the 4 interpreted objectives are present
    const targetRows = page.locator(".target-row");
    await expect(targetRows).toHaveCount(4);

    await expect(page.getByRole("button", { name: "Gediz Vallis", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Glen Torridon", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vera Rubin Ridge", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sulfate-bearing geological units", exact: true })).toBeVisible();

    // 5. Confirm scenario objectives are absent from the active catalog
    await expect(targetRows.getByText("Layered sedimentary unit")).toHaveCount(0);
    await expect(targetRows.getByText("Clay-to-sulfate transition")).toHaveCount(0);
    await expect(targetRows.getByText("Sulfate-bearing outcrop")).toHaveCount(0);
    await expect(targetRows.getByText("Retired")).toHaveCount(0);

    // Capture scenario-free catalog screenshot
    await page.screenshot({ path: `${outDir}/gale-scenario-free-catalog.png` });

    // 6. Inspect Gediz Vallis (Mapped extent)
    await page.getByRole("button", { name: "Gediz Vallis", exact: true }).click();
    await settle(page);

    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Gediz Vallis" })).toBeVisible();

    // Badges in details
    await expect(dialog.getByText("Interpreted", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Geological area", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Mapped extent", { exact: true })).toBeVisible();

    // Verification dimensions
    await expect(dialog.getByText("Source verification")).toBeVisible();
    await expect(dialog.getByText("Processing verification")).toBeVisible();
    await expect(dialog.getByText("Registration verification")).toBeVisible();
    await expect(dialog.getByText("±5 m")).toBeVisible();

    // Not an automatic waypoint notice
    await expect(dialog.getByText("Not an automatic waypoint")).toBeVisible();

    // Capture objective details screenshot
    await page.screenshot({ path: `${outDir}/gale-objective-details.png` });

    // 7. Click Fit map to area
    const fitAreaBtn = dialog.getByRole("button", { name: /Fit map to.*area/i });
    await expect(fitAreaBtn).toBeVisible();
    await fitAreaBtn.click();
    await settle(page);

    // Verify dialog closed and map zoomed to area
    await expect(dialog).toHaveCount(0);
    await page.screenshot({ path: `${outDir}/gale-mapped-area-gediz.png` });

    // 8. Test Toggle Objective Areas visibility button
    const toggleAreasBtn = page.getByRole("button", { name: /Hide objective areas|Show objective areas/i });
    await expect(toggleAreasBtn).toBeVisible();
    await toggleAreasBtn.click();
    await settle(page);
    await toggleAreasBtn.click();
    await settle(page);

    // 9. Inspect Glen Torridon (Approximate area)
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await page.getByRole("button", { name: "Glen Torridon", exact: true }).click();
    await settle(page);

    const glenDialog = page.locator(".dialog");
    await expect(glenDialog.getByText("Approximate area", { exact: true })).toBeVisible();
    await expect(glenDialog.getByText(/Operations CTX alignment pending/i)).toBeVisible();
    await expect(glenDialog.getByText("±50 m")).toBeVisible();
    await page.keyboard.press("Escape");
    await settle(page);

    // 10. Inspect Sulfate units (Candidate search region)
    await page.getByRole("button", { name: "Sulfate-bearing geological units", exact: true }).click();
    await settle(page);
    const sulfateDialog = page.locator(".dialog");
    await expect(sulfateDialog.getByText("Candidate search region", { exact: true })).toBeVisible();
    await expect(sulfateDialog.getByText("±100 m")).toBeVisible();
    await page.keyboard.press("Escape");
    await settle(page);

    // 11. Add stop and check itinerary safety
    await page.getByRole("button", { name: "Add Glen Torridon", exact: true }).click();
    await settle(page);

    // Check Plan tab itinerary displays unverified coordinate status
    await page.getByRole("button", { name: /^Plan/ }).click();
    await settle(page);
    await expect(page.getByText("Location unverified")).toBeVisible();

    // Check Review tab displays routing guard issue
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await settle(page);
    await expect(page.getByText("Selected objectives need verified target coordinates")).toBeVisible();

    // Switch back to Science and capture Gale overview with area
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await page.screenshot({ path: `${outDir}/gale-overview-objectives.png` });

    expect(errors).toEqual([]);
  });

  test("Region switching: Gale -> Jezero -> Oxia -> Gale preserves isolation without stale overlays", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?region=gale");
    await settle(page);

    // Open sites modal
    await page.getByRole("button", { name: /Region overview/i }).click();
    await settle(page);

    // Switch to Jezero
    await page.locator(".region-cards").getByRole("button", { name: /Jezero Crater/i }).click();
    await settle(page);
    await expect(page.locator("select#region")).toHaveValue("jezero");

    // Verify Jezero objectives
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await expect(page.getByText("Gediz Vallis")).toHaveCount(0);
    await expect(page.getByText("Glen Torridon")).toHaveCount(0);

    // Switch to Oxia
    await page.getByRole("button", { name: /Region overview/i }).click();
    await settle(page);
    await page.locator(".region-cards").getByRole("button", { name: /Oxia Planum/i }).click();
    await settle(page);
    await expect(page.locator("select#region")).toHaveValue("oxia");

    // Verify Oxia objectives
    await expect(page.getByText("Clay-rich bedrock study")).toBeVisible();
    await expect(page.getByText("Gediz Vallis")).toHaveCount(0);

    // Switch back to Gale
    await page.getByRole("button", { name: /Region overview/i }).click();
    await settle(page);
    await page.locator(".region-cards").getByRole("button", { name: /Gale Crater/i }).click();
    await settle(page);

    await expect(page.locator("select#region")).toHaveValue("gale");
    await expect(page.getByRole("button", { name: "Gediz Vallis", exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("Mobile 390x844: Objective catalog, details, and navigation function responsively", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?region=gale");
    await settle(page);

    // Expand bottom sheet on mobile to reveal panel tabs and content
    await page.locator(".sheet-handle").click();
    await settle(page);

    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);

    // Verify 4 objectives in mobile view
    await expect(page.locator(".target-row")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Gediz Vallis", exact: true })).toBeVisible();

    // Capture mobile screenshot
    await page.screenshot({ path: `${outDir}/gale-mobile-objectives.png` });

    expect(errors).toEqual([]);
  });
});
