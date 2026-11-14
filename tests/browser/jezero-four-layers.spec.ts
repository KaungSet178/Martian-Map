import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

test("real Jezero scientific tiles, four controls, opacity and regional isolation", async ({ page }) => {
  test.setTimeout(120_000);
  const out = "team/jezero/screenshots/four-layers";
  mkdirSync(out, { recursive: true });
  const errors: string[] = [];
  const responses: { url: string; status: number }[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/maps/jezero/"))
      responses.push({ url: response.url().replace(/^https?:\/\/[^/]+/, ""), status: response.status() });
  });
  await page.goto("/?region=jezero");
  await expect(page.locator(".map-canvas canvas")).toBeVisible();
  await page.getByRole("button", { name: "Layers", exact: true }).first().click();
  for (const [label, id, directory, opacity] of [
    ["Elevation", "jezero-elevation", "terrain-tiles", "60"], ["Hillshade", "jezero-hillshade", "hillshade-tiles", "45"],
    ["Slope", "jezero-slope", "slope-tiles", "60"], ["Thermal (THEMIS daytime IR)", "jezero-thermal", "thermal-tiles", "60"],
  ]) {
    const control = page.getByRole("checkbox", { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`) });
    await control.check();
    await expect(control).toBeChecked();
    await expect(page.locator(`#opacity-${id}`)).toHaveValue(opacity);
    await expect.poll(() => responses.some((response) => response.url.includes(`/${directory}/`) && response.status === 200)).toBe(true);
    await control.scrollIntoViewIfNeeded();
    await page.waitForTimeout(700); // Allow raster fade to settle for the screenshot.
    await page.screenshot({ path: `${out}/${directory}-desktop.png` });
  }
  await page.getByRole("checkbox", { name: /^Hillshade( |$)/ }).check();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/hillshade-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByLabel("Mission region", { exact: true }).selectOption("gale");
  await expect(page.locator(".map-location")).toContainText("Gale");
  await expect(page.getByRole("checkbox", { name: /^Hillshade( |$)/ })).toHaveCount(0);
  await page.getByLabel("Mission region", { exact: true }).selectOption("jezero");
  await expect(page.locator(".map-location")).toContainText("Jezero");
  await expect(page.locator(".science-marker")).toHaveCount(0);
  writeFileSync(`${out}/browser-observations.json`, JSON.stringify({ errors, responses }, null, 2) + "\n");
  // Keep the baseline marker runtime defect visible as a failing browser gate.
  expect(errors, "Browser must be free of runtime errors; shared baseline marker fix is required").toEqual([]);
});
