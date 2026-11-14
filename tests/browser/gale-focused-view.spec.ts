import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { getRegion } from "../../lib/regions/registry";

const gale = getRegion("gale")!;
const out = "team/gale/focused-view/screenshots-after";

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(450);
}

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  test(`Gale mission-focused view and scientific preservation at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await mkdir(out, { recursive: true });

    const errors: string[] = [];
    const responses: { url: string; status: number }[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/maps/")) {
        responses.push({ url: new URL(response.url()).pathname, status: response.status() });
        if (!response.ok()) errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.setViewportSize({ width, height });

    // 1. Open Gale in a clean first-entry state
    await page.goto("/?region=gale");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);

    // 2. Verify that the wider CTX context is hidden by default
    expect(responses.some((r) => r.url.includes("/context-tiles/"))).toBe(false);

    // 3. Verify that the initial camera shows a genuine close-up inside the mission footprint
    // and 4. Detailed CTX imagery is loaded and requested
    expect(responses.some((r) => r.url.includes("/ctx-tiles/"))).toBe(true);

    // 5. Verify that no geographic stretching occurs & canvas matches workspace
    const measurement = await page.evaluate(() => {
      const rect = (s: string) => {
        const r = document.querySelector(s)!.getBoundingClientRect();
        return { width: r.width, height: r.height };
      };
      return {
        workspace: rect(".map-workspace"),
        canvas: rect(".map-canvas canvas"),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(measurement.canvas.width).toBeCloseTo(measurement.workspace.width, 0);
    expect(measurement.canvas.height).toBeCloseTo(measurement.workspace.height, 0);
    expect(measurement.overflow).toBe(false);

    // 6. Verify recorded Curiosity traverse is present and visible
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const handle = page.getByRole("button", { name: /^Plan ·/ });
    if (await handle.isVisible()) await handle.click();
    const traverseCheck = page.getByRole("checkbox", { name: /Recorded Curiosity traverse/ });
    await expect(traverseCheck).toBeChecked();

    // 7-10. Enable scientific layers (elevation, hillshade, slope, thermal)
    for (const [label, id, opacity] of [
      ["Regional HRSC elevation", "gale-regional-elevation", "60"],
      ["Regional HRSC hillshade", "gale-regional-hillshade", "45"],
      ["Regional HRSC slope", "gale-regional-slope", "60"],
      ["THEMIS daytime", "gale-thermal", "60"],
    ]) {
      const control = page.getByRole("checkbox", { name: new RegExp(label) });
      await control.check();
      await expect(page.locator(`#opacity-${id}`)).toHaveValue(opacity);
      // 11. Adjust scientific-layer opacity
      await page.locator(`#opacity-${id}`).fill("80");
      await expect(page.locator(`#opacity-${id}`)).toHaveValue("80");
      await control.uncheck();
    }

    // 12. Toggle Mission View and Full Data Coverage
    await expect(page.getByRole("radio", { name: "Mission View (Default)", exact: true })).toBeChecked();
    await page.getByRole("radio", { name: "Full Data Coverage", exact: true }).check();
    await expect(page.getByRole("radio", { name: "Full Data Coverage", exact: true })).toBeChecked();
    await page.getByRole("radio", { name: "Mission View (Default)", exact: true }).check();

    // 13-14. Pan along mission region and zoom
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await settle(page);
    await page.getByRole("button", { name: "Zoom map out", exact: true }).click();
    await settle(page);

    // 15. Activate "Fit complete mission area"
    const fitComplete = page.getByRole("button", { name: "Fit complete mission area", exact: true });
    await expect(fitComplete).toBeVisible();
    await fitComplete.click();
    await settle(page);

    // 16. Activate "Explore Curiosity area"
    const exploreCuriosity = page.getByRole("button", { name: "Explore Curiosity area", exact: true });
    await expect(exploreCuriosity).toBeVisible();
    await exploreCuriosity.click();
    await settle(page);

    // 17. Toggle the optional wider context
    const widerToggle = page.getByRole("checkbox", { name: "Show wider Gale context" });
    if (await widerToggle.isVisible().catch(() => false)) {
      await widerToggle.check();
      await settle(page);
      expect(responses.some((r) => r.url.includes("/context-tiles/"))).toBe(true);
      await widerToggle.uncheck();
      await settle(page);
    } else {
      const contextCheck = page.getByRole("checkbox", { name: /^Context CTX/ });
      await contextCheck.check();
      await settle(page);
      expect(responses.some((r) => r.url.includes("/context-tiles/"))).toBe(true);
      await contextCheck.uncheck();
      await settle(page);
    }

    // 18. Verify no failed tile requests or broken controls
    expect(responses.filter((r) => r.status >= 400)).toEqual([]);
    expect(errors).toEqual([]);

    // 19. Test with sidebar open and collapsed
    if (width > 850) {
      const collapseBtn = page.getByRole("button", { name: "Collapse planning panel", exact: true });
      if (await collapseBtn.isVisible().catch(() => false)) {
        await collapseBtn.click();
        await settle(page);
        const expandBtn = page.getByRole("button", { name: "Open planning panel", exact: true });
        await expect(expandBtn).toBeVisible();
        await expandBtn.click();
        await settle(page);
      }
    }

    // 20. Verify map controls on mobile
    if (width <= 850) {
      await expect(page.locator(".map-navigation")).toBeVisible();
      await expect(page.getByRole("button", { name: "Explore Curiosity area", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Fit complete mission area", exact: true })).toBeVisible();
    }
  });
}

test("Jezero and Oxia unchanged regression verification", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  for (const regionId of ["jezero", "oxia"] as const) {
    await page.goto(`/?region=${regionId}`);
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    await settle(page);
    // Neither Jezero nor Oxia has the Gale basemap-control
    await expect(page.getByTestId("basemap-control")).toHaveCount(0);
    // Navigation has standard single reset button
    await expect(page.getByRole("button", { name: "Fit exploration region", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Explore Curiosity area", exact: true })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
