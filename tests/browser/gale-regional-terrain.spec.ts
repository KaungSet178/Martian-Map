import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expand(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan \u00b7/ });
  if (await handle.isVisible()) await handle.click();
}

async function pixels(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({
    style: ".map-topline, .map-navigation, .map-bottomline, .map-attribution { visibility: hidden !important; }",
  });
  return page.evaluate(async (encoded) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    image.close();
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0, brightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += data[i] + data[i + 1] + data[i + 2];
      if (data[i] + data[i + 1] + data[i + 2] > 100 && Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) > 12) {
        colored++;
      }
    }
    return { colored, mean: brightness / (canvas.width * canvas.height * 3) };
  }, png.toString("base64"));
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`G4 regional and global terrain overlays, legends, and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    const requested: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/maps/gale/")) {
        requested.push(response.url());
        if (!response.ok()) errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto("/?region=gale");
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await expand(page);
    const baselinePixels = await pixels(page);

    // 1. Regional HRSC 30 m Elevation
    const regionalElev = page.getByRole("checkbox", { name: /Regional HRSC elevation/ });
    await expect(regionalElev).toBeVisible();
    await expect(regionalElev).not.toBeChecked();
    await regionalElev.check();

    const elevProduct = regionalElev.locator("xpath=ancestor::div[contains(@class,'data-product')]");
    await expect(elevProduct).toContainText("CTX alignment unverified");
    await expect(elevProduct).toContainText("30 m");
    await expect(elevProduct).toContainText("covers 100% of the Gale overview");
    await expect(elevProduct).toContainText("not for hazard routing");
    await expect(elevProduct.locator(".legend-detail")).toContainText("MOLA areoid");

    await expect.poll(() => requested.some((url) => url.includes("/terrain-regional/elevation/"))).toBe(true);
    await expect.poll(async () => (await pixels(page)).colored).toBeGreaterThan(baselinePixels.colored + 100);

    const elevOpacity = page.getByLabel(/Regional HRSC elevation opacity/);
    await expect(elevOpacity).toHaveValue("100");

    await page.screenshot({ path: `output/playwright/g4-regional-elevation-${width}.png` });

    // 2. Regional HRSC 30 m Slope
    const regionalSlope = page.getByRole("checkbox", { name: /Regional HRSC slope/ });
    await regionalSlope.check();
    // Regional elevation should now be unchecked
    await expect(regionalElev).not.toBeChecked();
    await expect(regionalSlope).toBeChecked();

    const slopeProduct = regionalSlope.locator("xpath=ancestor::div[contains(@class,'data-product')]");
    await expect(slopeProduct).toContainText("degrees (°), not safety classes");
    await expect(slopeProduct).toContainText("No astronaut safety threshold is assigned");
    await expect.poll(() => requested.some((url) => url.includes("/terrain-regional/slope/"))).toBe(true);

    await page.screenshot({ path: `output/playwright/g4-regional-slope-${width}.png` });

    // 3. Regional HRSC 30 m Hillshade
    const regionalShade = page.getByRole("checkbox", { name: /Regional HRSC hillshade/ });
    await regionalShade.check();
    await expect(regionalSlope).not.toBeChecked();
    await expect(regionalShade).toBeChecked();
    await expect.poll(() => requested.some((url) => url.includes("/terrain-regional/hillshade/"))).toBe(true);

    await page.screenshot({ path: `output/playwright/g4-regional-hillshade-${width}.png` });

    // 4. Global HRSC-MOLA 200 m Elevation Fallback
    const globalElev = page.getByRole("checkbox", { name: /Global HRSC–MOLA elevation/ });
    await globalElev.check();
    await expect(regionalShade).not.toBeChecked();
    await expect(globalElev).toBeChecked();

    const globalProduct = globalElev.locator("xpath=ancestor::div[contains(@class,'data-product')]");
    await expect(globalProduct).toContainText("200 m");
    await expect(globalProduct).toContainText("All 41,772 derived cells valid");
    await expect.poll(() => requested.some((url) => url.includes("/terrain-global/elevation/"))).toBe(true);

    await page.screenshot({ path: `output/playwright/g4-global-elevation-${width}.png` });

    // 5. Accessibility audit
    const a11y = await new AxeBuilder({ page }).include(".task-panel").analyze();
    expect(a11y.violations).toEqual([]);

    expect(errors).toEqual([]);
  });
}
