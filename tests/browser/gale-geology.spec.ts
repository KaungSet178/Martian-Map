import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expand(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan \u00b7/ });
  if (await handle.isVisible()) await handle.click();
}

// Counts color introduced by the classified overlay over grayscale CTX.
// Canvas screenshots use rendered pixels, not private renderer state/hooks.
async function coloredPixels(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({
    style: ".map-topline, .map-navigation, .map-bottomline, .map-attribution { visibility: hidden !important; }",
  });
  return page.evaluate(async (encoded) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0); image.close();
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]+data[i+1]+data[i+2] > 100 && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]) > 12) count++;
    }
    return count;
  }, png.toString("base64"));
}

for (const [width, height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
  test(`registered Arc Pass geology, legend, opacity and regional isolation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [], requested: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/maps/gale/")) {
        requested.push(response.url());
        if (!response.ok()) errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/?region=gale");
    await page.getByRole("button", { name: "Layers", exact: true }).click(); await expand(page);
    const geology = page.getByRole("checkbox", { name: /Arc Pass geological units/ });
    await expect(geology).not.toBeChecked();
    await geology.check();
    await expect(page.getByRole("checkbox", { name: /Recorded Curiosity traverse/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Gale CTX orbital mosaic/ })).toBeChecked();
    await expect.poll(() => requested.some((url) => url.endsWith("arc-pass-geology.geojson"))).toBe(true);
    await expect.poll(() => requested.some((url) => url.includes("ctx-tiles"))).toBe(true);
    const product = geology.locator("xpath=ancestor::div[contains(@class,'data-product')]");
    await expect(product).toContainText("Arc Pass only");
    await expect(product).toContainText("not terrain safety");
    await expect(product).toContainText("1:250");
    for (const code of ["F1","F2","F3","mF1R","MSg","R","S"])
      await expect(product.locator(".legend-detail p").filter({ hasText: new RegExp(`^${code}$`) })).toHaveCount(1);
    const opacity = page.getByLabel(/Arc Pass geological units opacity/);
    await expect(opacity).toHaveValue("45");
    await opacity.fill("0");
    const uncolored = await coloredPixels(page);
    await opacity.fill("75");
    await expect.poll(() => coloredPixels(page)).toBeGreaterThan(uncolored + 100);
    const accessibility = await new AxeBuilder({ page }).include(".task-panel").analyze();
    expect(accessibility.violations).toEqual([]);
    await product.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `output/playwright/gale-g3-geology-${width}.png` });
    await geology.uncheck();
    await expect.poll(() => coloredPixels(page)).toBeLessThanOrEqual(uncolored + 100);
    await page.getByRole("button", { name: "Fit exploration region", exact: true }).click();
    await expect(page.locator(".map-failure")).toHaveCount(0);
    for (const region of ["jezero","oxia"]) {
      await page.getByLabel("Mission region", { exact: true }).selectOption(region); await expand(page);
      await page.getByRole("button", { name: "Layers", exact: true }).click();
      await expect(page.getByRole("checkbox", { name: /Arc Pass/ })).toHaveCount(0);
      await expect(page.locator(".map-attribution")).not.toContainText("Joel Davis");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
