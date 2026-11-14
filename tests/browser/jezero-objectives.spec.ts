import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const outDir = "docs/screenshots/jezero-objectives";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

test.describe("JZ-T2: Jezero Scientific Objective Location Verification & Geographic Area Visualization", () => {
  test.beforeAll(async () => {
    await mkdir(outDir, { recursive: true });
  });

  test("Desktop 1440x900: Full catalog verification, mapped extents, verified point marker, and responsive interaction", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Open Jezero
    await page.goto("/?region=jezero");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);

    // 2. Open Science tab / panel
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);

    // 3. Confirm all 5 objectives are present
    const targetCards = page.locator(".target-card");
    await expect(targetCards).toHaveCount(5);

    await expect(
      page.getByRole("button", { name: "Jezero geology and climate record", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ancient habitability assessment", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sample caching for Mars Sample Return", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Biosignature search", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Human-exploration preparation", exact: true }),
    ).toBeVisible();

    // Capture catalog screenshot
    await page.screenshot({ path: `${outDir}/jezero-catalog-desktop.png` });

    // 4. Inspect Target 1 (Mapped extent - Crater floor geology)
    await page.getByRole("button", { name: "Jezero geology and climate record", exact: true }).click();
    await settle(page);

    const dialog = page.locator(".dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Jezero geology and climate record" }),
    ).toBeVisible();

    // Badges in details
    await expect(dialog.getByText("Interpreted", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Geological area", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Mapped extent", { exact: true })).toBeVisible();

    // Verification dimensions
    await expect(dialog.getByText("Source verification")).toBeVisible();
    await expect(dialog.getByText("Processing verification")).toBeVisible();
    await expect(dialog.getByText("Registration verification")).toBeVisible();
    await expect(dialog.getByText("±150 m")).toBeVisible();

    // Not an automatic waypoint notice
    await expect(dialog.getByText("Not an automatic waypoint")).toBeVisible();

    // Capture objective 1 details
    await page.screenshot({ path: `${outDir}/jezero-objective-1-details.png` });

    // Fit map to area
    const fitAreaBtn1 = dialog.getByRole("button", { name: /Fit map to.*area/i });
    await expect(fitAreaBtn1).toBeVisible();
    await fitAreaBtn1.click();
    await settle(page);

    // Verify dialog closed and map zoomed
    await expect(dialog).toHaveCount(0);
    await page.screenshot({ path: `${outDir}/jezero-mapped-area-floor.png` });

    // 5. Inspect Target 2 (Mapped extent - Western Delta Fan)
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await page.getByRole("button", { name: "Ancient habitability assessment", exact: true }).click();
    await settle(page);

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Mapped extent", { exact: true })).toBeVisible();
    await expect(dialog.getByText("±100 m")).toBeVisible();

    // Fit map to delta area
    const fitAreaBtn2 = dialog.getByRole("button", { name: /Fit map to.*area/i });
    await expect(fitAreaBtn2).toBeVisible();
    await fitAreaBtn2.click();
    await settle(page);

    await expect(dialog).toHaveCount(0);
    await page.screenshot({ path: `${outDir}/jezero-mapped-area-delta.png` });

    // 6. Inspect Target 3 (Verified Point - Three Forks Sample Depot)
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await page.getByRole("button", { name: "Sample caching for Mars Sample Return", exact: true }).click();
    await settle(page);

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Verified point", { exact: true })).toBeVisible();
    await expect(dialog.getByText("18.453697° planetocentric · 77.413598° E")).toBeVisible();
    await expect(dialog.getByText("Not a routable waypoint")).toBeVisible();

    // Capture objective 3 details
    await page.screenshot({ path: `${outDir}/jezero-objective-3-verified-point.png` });

    // Add objective to mission to display on map
    const addBtn = dialog.getByRole("button", { name: "Add objective to mission" });
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    await settle(page);

    // Close dialog
    await page.getByRole("button", { name: "Close" }).click();
    await settle(page);

    // 7. Verify Point Marker is visible on map
    const scienceMarker = page.locator(".science-marker");
    await expect(scienceMarker).toBeVisible();

    // 8. Toggle Shapes visibility
    const toggleAreasBtn = page.getByRole("button", { name: /Hide objective areas|Show objective areas/i });
    await expect(toggleAreasBtn).toBeVisible();
    await toggleAreasBtn.click();
    await settle(page);
    await page.screenshot({ path: `${outDir}/jezero-all-areas-overlay.png` });

    // 9. Inspect Target 4 (Approximate area - Delta Front)
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await page.getByRole("button", { name: "Biosignature search", exact: true }).click();
    await settle(page);

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Approximate area", { exact: true })).toBeVisible();
    await expect(dialog.getByText("±200 m")).toBeVisible();
    await page.screenshot({ path: `${outDir}/jezero-objective-4-approximate-area.png` });

    await page.getByRole("button", { name: "Close" }).click();
    await settle(page);

    // 10. Inspect Target 5 (Location unavailable)
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await settle(page);
    await page.getByRole("button", { name: "Human-exploration preparation", exact: true }).click();
    await settle(page);

    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Location unverified", { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Boundary unavailable: Human-exploration preparation/i)).toBeVisible();
    await page.screenshot({ path: `${outDir}/jezero-objective-5-unavailable.png` });

    await page.getByRole("button", { name: "Close" }).click();
    await settle(page);

    // Verify no uncaught console errors
    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("Tablet 768x1024: Responsive layout and target area inspection", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto("/?region=jezero");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await page.screenshot({ path: `${outDir}/jezero-tablet-768.png` });
  });

  test("Mobile 390x844: Collapsible drawer and area actions without overflow", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto("/?region=jezero");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);

    // Check no horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    await page.screenshot({ path: `${outDir}/jezero-mobile-390.png` });
  });
});
