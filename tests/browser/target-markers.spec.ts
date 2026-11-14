import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

test("Jezero objectives have no geographic markers, retain draft selection, and survive region switching", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  // Sparse checkout omits bulk assets. Transparent test tiles isolate marker behavior.
  await page.route("**/maps/**/*.png", route => route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=", "base64") }));
  await page.route("**/maps/**/*.geojson", route => route.fulfill({ json: { type: "FeatureCollection", features: [] } }));
  await page.goto("/?region=jezero");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  // Wait for actual map initialization rather than passing while the dynamic import is pending.
  await expect(page.locator(".maplibregl-canvas")).toHaveAttribute("aria-label", /Jezero/);
  const expand = page.getByRole("button", { name: /^Plan ?/ });
  if (await expand.isVisible()) await expand.click();
  await page.getByRole("button", { name: "Science", exact: true }).click();
  await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeEnabled();
  await expect(page.locator(".target-row")).toHaveCount(5);
  await expect(page.locator(".target-actions")).toContainText(["Location not verified", "Location not verified", "Location not verified", "Location not verified", "Location not verified"]);
  await expect(page.locator(".science-marker")).toHaveCount(0);
  await page.getByRole("button", { name: "Jezero geology and climate record", exact: true }).click();
  await expect(page.getByText("This scientific objective has no verified map location yet.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /focus.*map|zoom.*target/i })).toHaveCount(0);
  await expect(page.locator(".science-marker")).toHaveCount(0);
  await page.getByRole("button", { name: "Add objective to mission", exact: true }).click();
  await expect(page.locator(".mission-summary")).toContainText("1 objective");
  mkdirSync("docs/diagnostics/jz-t1a", { recursive: true });
  await page.screenshot({ path: "docs/diagnostics/jz-t1a/inspector.png", fullPage: true });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "docs/diagnostics/jz-t1a/after.png", fullPage: true });
  for (const id of ["gale", "oxia", "jezero"]) {
    await page.getByLabel("Mission region", { exact: true }).selectOption(id);
    await expect(page.locator(".science-marker")).toHaveCount(0);
  }
  await expect(page.locator(".mission-summary")).toContainText("1 objective");
  expect(errors).toEqual([]);
});
