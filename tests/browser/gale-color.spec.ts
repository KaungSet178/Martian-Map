import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

async function openWaypoints(page: Page) {
  const opener = page.getByRole("button", { name: "Open planning panel", exact: true });
  if (await opener.isVisible()) await opener.click();
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();
  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByRole("tab", { name: /Surface Waypoints/ }).click();
}

async function collapse(page: Page) {
  const button = page.getByRole("button", { name: "Collapse planning panel", exact: true });
  if (await button.isVisible()) await button.click();
  await expect(page.getByLabel("Basemap", { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
}

async function markerState(page: Page) {
  return page.getByTestId("map-waypoint-marker").evaluateAll((nodes) => nodes.map((node) => ({
    title: node.getAttribute("title"), label: node.getAttribute("aria-label"),
    transform: (node as HTMLElement).style.transform,
  })));
}

async function colorPixelCount(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({ style: ".basemap-control,.map-topline,.map-navigation,.map-bottomline,.map-attribution,.map-waypoint-marker {visibility:hidden!important}" });
  return page.evaluate(async (encoded) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    // Actual warm processed terrain pixels; excludes the dark blue background.
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 65 && pixels[i] > pixels[i+2]+12 && pixels[i+1] > 45) count++;
    return count;
  }, png.toString("base64"));
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`G5 real color, stable M3 geometry, navigation and accessibility at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const tileResponses: number[] = [];
    let tileBytes = 0;
    page.on("response", (response) => {
      if (/usgs-color\/.*webp/.test(response.url())) {
        tileResponses.push(response.status());
        tileBytes += Number(response.headers()["content-length"] ?? 0);
      }
    });
    await page.goto("/?region=gale");
    await openWaypoints(page);
    // Existing M3 placement engine, first on CTX.
    await page.getByTestId("toggle-map-placement-btn").click();
    await page.waitForTimeout(500);
    const canvas = page.locator(".map-canvas canvas");
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width*.5, box.y + box.height*.5 - 25);
    await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(1);
    await page.mouse.click(box.x + box.width*.5, box.y + box.height*.5 + 25);
    await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(2);
    await page.getByTestId("cancel-placement-btn").click();
    await collapse(page);
    const select = page.getByLabel("Basemap", { exact: true });
    await expect(select).toHaveValue("ctx");
    await expect.poll(() => colorPixelCount(page)).toBeLessThan(100);
    const before = await markerState(page);
    await page.screenshot({ path: `output/playwright/g5-ctx-${width}.png` });
    const switchStarted = Date.now();
    await select.selectOption("color");
    await expect(page.getByTestId("basemap-control")).toContainText("Alignment unverified");
    await expect.poll(() => colorPixelCount(page)).toBeGreaterThan(1500);
    await page.waitForLoadState("networkidle");
    const firstColorMs = Date.now() - switchStarted;
    const cdp = await page.context().newCDPSession(page);
    const heap = await cdp.send("Runtime.getHeapUsage");
    await cdp.detach();
    await mkdir("output/playwright", { recursive: true });
    await writeFile(`output/playwright/g5-performance-${width}.json`, JSON.stringify({ width, firstColorMs, tileRequests: tileResponses.length, tileBytes, jsHeapUsedBytes: heap.usedSize, jsHeapTotalBytes: heap.totalSize, caveat: "Localhost, one Chromium run; screenshot polling included in timing. JS heap excludes GPU textures, native image decoding and worker heaps." }, null, 2));
    expect(tileResponses.length).toBeGreaterThan(0);
    expect(tileResponses.every((status) => status === 200)).toBe(true);
    expect(await markerState(page)).toEqual(before);
    await expect(page.getByTestId("trajectory-legend")).toBeVisible();
    await page.screenshot({ path: `output/playwright/g5-color-${width}.png` });
    await select.selectOption("ctx");
    await expect.poll(() => colorPixelCount(page)).toBeLessThan(100);
    expect(await markerState(page)).toEqual(before);
    await select.selectOption("color");
    await expect.poll(() => colorPixelCount(page)).toBeGreaterThan(1500);
    const audit = await new AxeBuilder({ page }).include(".basemap-control").analyze();
    expect(audit.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await page.waitForTimeout(400);
    expect(await markerState(page)).not.toEqual(before);
    if (width === 1440) {
      const zoomed = await markerState(page);
      await select.selectOption("ctx");
      await expect.poll(() => colorPixelCount(page)).toBeLessThan(100);
      await page.screenshot({ path: "output/playwright/g5-closeup-ctx.png" });
      await select.selectOption("color");
      await expect.poll(() => colorPixelCount(page)).toBeGreaterThan(1500);
      expect(await markerState(page)).toEqual(zoomed);
      await page.screenshot({ path: "output/playwright/g5-closeup-color.png" });
    }
    await page.getByRole("button", { name: "Fit exploration region", exact: true }).click();
    await page.waitForTimeout(500);
    await expect(page.locator(".map-failure")).toHaveCount(0);
    // Place on color too; selector events must not create waypoints.
    await openWaypoints(page);
    await page.getByTestId("toggle-map-placement-btn").click();
    await page.waitForTimeout(500);
    const secondBox = (await canvas.boundingBox())!;
    await page.mouse.click(secondBox.x + secondBox.width*.5, secondBox.y + secondBox.height*.5 + 55);
    await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(3);
    await page.keyboard.press("Escape");
  });
}

test("G5 missing tiles restore CTX and retain controls, camera and waypoints", async ({ page }) => {
  await page.route("**/usgs-color/**/*.webp", (route) => route.fulfill({ status: 404, body: "Unavailable" }));
  await page.goto("/?region=gale");
  await openWaypoints(page);
  await page.getByTestId("toggle-map-placement-btn").click();
  await page.waitForTimeout(500);
  const box = (await page.locator(".map-canvas canvas").boundingBox())!;
  await page.mouse.click(box.x+box.width*.5, box.y+box.height*.5);
  await expect(page.getByTestId("map-waypoint-marker")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await collapse(page);
  const before = await markerState(page);
  const select = page.getByLabel("Basemap", { exact: true });
  await expect(select).toBeEnabled();
  await select.selectOption("color");
  await expect(select).toHaveValue("ctx");
  await expect(page.getByTestId("basemap-control")).toContainText("Original CTX restored");
  await expect(page.locator(".map-failure")).toHaveCount(0);
  expect(await markerState(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeEnabled();
});

test("G5 color preserves mission save/open and terrain visibility/opacity", async ({ page }) => {
  await page.goto("/?region=gale");
  const select = page.getByLabel("Basemap", { exact: true });
  await select.selectOption("color");
  await expect.poll(() => colorPixelCount(page)).toBeGreaterThan(1500);
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const terrain = page.getByRole("checkbox", { name: /Elevation · MOLA areoid/ });
  await terrain.check();
  const product = terrain.locator("xpath=ancestor::div[contains(@class,'data-product')]");
  const opacity = product.getByRole("slider");
  await opacity.fill("47");
  await select.selectOption("ctx");
  await select.selectOption("color");
  await expect(terrain).toBeChecked();
  await expect(opacity).toHaveValue("47");
  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByLabel("Mission name", { exact: true }).fill("G5 color persistence");
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  await page.getByRole("button", { name: "Open saved missions", exact: true }).click();
  await page.getByRole("button", { name: "Open G5 color persistence", exact: true }).click();
  await expect(select).toHaveValue("color");
  await expect(page.getByLabel("Mission name", { exact: true })).toHaveValue("G5 color persistence");
  await page.reload();
  await expect(page.getByLabel("Basemap", { exact: true })).toHaveValue("ctx");
  await page.getByRole("button", { name: /^Plan/ }).click();
  await expect(page.getByLabel("Mission name", { exact: true })).toHaveValue("G5 color persistence");
});

test("G5 source is isolated across regions and resets to CTX on return", async ({ page }) => {
  await page.goto("/?region=gale");
  await page.getByLabel("Basemap", { exact: true }).selectOption("color");
  for (const region of ["jezero", "oxia", "gale"]) {
    await page.getByLabel("Mission region", { exact: true }).selectOption(region);
    if (region === "gale") await expect(page.getByLabel("Basemap", { exact: true })).toHaveValue("ctx");
    else await expect(page.getByTestId("basemap-control")).toHaveCount(0);
  }
});
