import { test, expect } from "@playwright/test";

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`Railway F2/science integration smoke at ${width}px`, async ({ page, request }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const colorTile = page.waitForResponse(response => response.url().includes("/maps/gale/usgs-color/") && response.ok());
    await page.goto("/?region=gale");
    await colorTile;
    expect((await request.get("/api/health")).status()).toBe(200);
    await expect(page.getByTestId("basemap-fallback-notice")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Basemap", exact: true })).toHaveCount(0);
    const body = page.locator("#task-content");
    if (width < 850) await page.locator(".sheet-handle").click();
    await expect(body).toBeVisible();
    if (width > 850) {
      const before = (await page.locator(".task-panel").boundingBox())!.width;
      await page.getByRole("button", { name: "Expand mission console" }).click();
      expect((await page.locator(".task-panel").boundingBox())!.width).toBeGreaterThan(before);
    }
    await expect(body).toContainText("2 associated sites");
    await expect(body).toContainText("unlocated context");
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.locator(".layers-window");
    await expect(layers).toBeVisible();
    for (const category of ["Elevation", "Hillshade", "Slope", "Thermal"]) {
      await expect(layers.getByRole("heading", { name: category, exact: true })).toHaveCount(1);
    }
    await expect(layers.getByRole("checkbox", { name: /Regional HRSC/ })).toHaveCount(3);
    await expect(layers.getByRole("checkbox", { name: /THEMIS/ })).toHaveCount(1);
    await expect(layers).not.toContainText("Geological units");
    for (const button of await page.locator(".map-navigation button").all()) {
      expect(await button.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
      })).toBe(true);
    }
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await page.screenshot({ path: `output/playwright/integration-gale-${width}.png` });
    await layers.getByRole("button", { name: "Close layers window" }).click();
    await expect(layers).toHaveCount(0);
    await page.getByLabel("Mission region", { exact: true }).selectOption("jezero");
    if (width < 850) await page.locator(".sheet-handle").click();
    await expect(body).toContainText("11 associated sites");
    await expect(body).toContainText("Source coordinates verified (11 sites)");
    await page.getByRole("button", { name: "Add Sample caching for Mars Sample Return", exact: true }).click();
    await page.getByRole("button", { name: "Sample caching for Mars Sample Return", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Registration unverified");
    await expect(dialog).toContainText("18.45262651");
    await expect(dialog).toContainText("77.40775601");
    await dialog.getByTestId("site-jezero-depot-rover-malay").locator("summary").click();
    await expect(dialog.getByRole("button", { name: "Add terrain waypoint (unavailable)" }).first()).toBeDisabled();
    await page.screenshot({ path: `output/playwright/integration-sites-${width}.png` });
    await page.keyboard.press("Escape");
    const markers = page.locator('.science-marker[aria-label*="source-located"]');
    await expect(markers).toHaveCount(11);
    await expect(markers.first()).toBeVisible();
    await page.getByRole("tab", { name: /^Plan/ }).click();
    await page.getByRole("tab", { name: /Surface Waypoints/ }).click();
    await expect(page.getByRole("button", { name: /Place.*map/i }).first()).toBeVisible();
    await page.screenshot({ path: `output/playwright/integration-plan-${width}.png` });
    if (width > 850) {
      await page.getByRole("button", { name: "Collapse planning panel", exact: true }).click();
      await expect(body).toBeHidden();
      await page.getByRole("button", { name: "Open planning panel", exact: true }).click();
    } else {
      await page.locator(".sheet-handle").click();
      await expect(body).toBeHidden();
      await page.locator(".sheet-handle").click();
    }
    await expect(body).toBeVisible();
    expect(errors).toEqual([]);
  });
}
