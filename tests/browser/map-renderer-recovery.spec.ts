import { test, expect } from "@playwright/test";

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`one failed Jezero imagery tile preserves the renderer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const warnings: string[] = [], failures: string[] = [];
    page.on("console", m => { if (m.type() === "warning") warnings.push(m.text()); });
    page.on("pageerror", e => failures.push(e.message));
    let blocked = false;
    await page.route("**/maps/jezero/ctx-lvs-tiles/**", async route => {
      if (!blocked) {
        blocked = true;
        await route.fulfill({ status: 503, body: "Regression: one unavailable tile" });
      } else await route.continue();
    });
    await page.goto("/?region=jezero");
    await expect.poll(() => blocked).toBe(true);
    await expect(page.getByTestId("map-source-warning")).toContainText("CTX");
    await expect(page.getByTestId("map-source-warning")).toContainText("coverage may be incomplete");
    await expect(page.getByText("Map renderer unavailable.", { exact: false })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeEnabled();
    const canvas = page.locator(".map-canvas canvas");
    const before = await canvas.screenshot();
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await page.waitForTimeout(650);
    expect((await canvas.screenshot()).equals(before)).toBe(false);
    expect(warnings.some(m => m.includes("Map source unavailable") && m.includes("region-jezero-optical"))).toBe(true);
    expect(failures).toEqual([]);
  });
}

test("an unavailable optional GeoJSON source does not disable the Oxia map", async ({ page }) => {
  await page.route("**/maps/oxia/candidate-traverse.geojson", route => route.fulfill({ status: 503, body: "Regression: source unavailable" }));
  await page.goto("/?region=oxia");
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Candidate traverse \(Modeled\)/ }).check();
  await expect(page.getByTestId("map-source-warning")).toContainText("Candidate traverse (Modeled)");
  await expect(page.getByText("Map renderer unavailable.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeEnabled();
  await page.getByRole("checkbox", { name: /^Candidate traverse \(Modeled\)/ }).uncheck();
  await expect(page.getByTestId("map-source-warning")).toHaveCount(0);
});

test("genuine WebGL initialization failure still reports renderer unavailability", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(getContext, this, [type, ...args]);
    } as typeof getContext;
  });
  await page.goto("/?region=jezero");
  await expect(page.getByText("Map renderer unavailable.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeDisabled();
});
