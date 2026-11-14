import { test, expect, type Page } from "@playwright/test";

// Inspect the *rendered* grayscale orbital footprint, not private React/MapLibre
// internals or a production test hook. Pixel positions are display checks only.
async function rasterBox(page: Page) {
  const png = await page.locator(".map-canvas canvas").screenshot({
    // Element screenshots include overlapping siblings. Hide only furniture
    // during capture so its text cannot be mistaken for grayscale imagery.
    style: ".map-topline, .map-navigation, .map-bottomline, .map-attribution { visibility: hidden !important; }",
  });
  return page.evaluate(async (encoded) => {
    const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    image.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = 0, bottom = 0, count = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (pixels[i] > 30 && Math.abs(pixels[i] - pixels[i + 1]) < 4 && Math.abs(pixels[i] - pixels[i + 2]) < 4) {
          left = Math.min(left, x); right = Math.max(right, x);
          top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
        }
      }
    }
    return { left, top, right, bottom, count, width: right - left, height: bottom - top, canvasWidth: canvas.width, canvasHeight: canvas.height };
  }, png.toString("base64"));
}

async function overview(page: Page) {
  await page.getByRole("button", { name: "Fit exploration region", exact: true }).click();
  await completeOverview(page);
}

async function detailedMissionView(page: Page) {
  // The wider context intentionally fills the viewport now. Isolate the
  // unchanged detailed CTX crop when measuring its original aspect/position.
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();
  await page.getByRole("checkbox", { name: /Context CTX \(wider area\)/ }).uncheck();
  if (page.viewportSize()!.width <= 850)
    await page.getByRole("button", { name: "Collapse planning panel", exact: true }).click();
  else await page.getByRole("button", { name: "Science", exact: true }).click();
  await overview(page);
}

async function completeOverview(page: Page) {
  // Tile responses and fade-in can leave a partial rectangle for several
  // frames. Wait for the complete rendered footprint before measuring it.
  await expect.poll(async () => {
    const box = await rasterBox(page);
    return box.height / box.width > 1.9 && box.height / box.width < 2.4 &&
      box.count / (box.width * box.height) > .9;
  }).toBe(true);
}

async function contained(page: Page) {
  const canvas = await page.locator(".map-canvas canvas").boundingBox();
  const map = await page.locator(".map-workspace").boundingBox();
  const header = await page.locator(".app-header").boundingBox();
  const sheet = await page.locator(".task-panel").boundingBox();
  expect(Math.abs(canvas!.width - map!.width)).toBeLessThan(2);
  expect(Math.abs(canvas!.height - map!.height)).toBeLessThan(2);
  expect(map!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  if (page.viewportSize()!.width <= 850 && sheet) {
    expect(map!.y + map!.height).toBeLessThanOrEqual(sheet.y + 1);
  }
  for (const button of await page.locator(".map-navigation button").all()) {
    const box = await button.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(map!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(map!.y + map!.height + 1);
    await expect(button).toBeInViewport();
  }
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > innerWidth,
    vertical: document.documentElement.scrollHeight > innerHeight,
  }))).toEqual({ horizontal: false, vertical: false });
}

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`Gale fitted viewport, drag, wheel, controls and panel resize at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/maps/gale/") && !response.ok()) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto("/?region=gale");
    await expect(page.getByRole("button", { name: "Fit exploration region", exact: true })).toBeEnabled();
    await detailedMissionView(page);
    const initial = await rasterBox(page);
    expect(initial.left).toBeGreaterThan(10);
    expect(initial.right).toBeLessThan(initial.canvasWidth - 10);
    expect(initial.top).toBeGreaterThan(10);
    expect(initial.bottom).toBeLessThan(initial.canvasHeight - 10);
    // Complete reviewed footprint, with its tall aspect ratio, fits on screen.
    expect(initial.height / initial.width).toBeGreaterThan(1.9);
    expect(initial.height / initial.width).toBeLessThan(2.4);
    await contained(page);
    await page.screenshot({ path: `output/playwright/gale-viewport-after-${width}.png` });

    const canvas = await page.locator(".map-canvas canvas").boundingBox();
    const x = canvas!.x + (initial.left + initial.right) / 2;
    const y = canvas!.y + (initial.top + initial.bottom) / 2;
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, { x, y })).toBe("CANVAS");
    await page.mouse.move(x, y);
    await page.mouse.down({ button: "left" });
    await page.mouse.move(x + 50, y + 25, { steps: 16 });
    await page.mouse.up({ button: "left" });
    await expect.poll(async () => Math.abs((await rasterBox(page)).left - initial.left)).toBeGreaterThan(25);
    await overview(page);
    await expect.poll(async () => Math.abs((await rasterBox(page)).width - initial.width)).toBeLessThan(3);
    await expect.poll(async () => Math.abs((await rasterBox(page)).left - initial.left)).toBeLessThan(3);

    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -300);
    await expect.poll(async () => (await rasterBox(page)).width).toBeGreaterThan(initial.width * 1.15);
    await overview(page);
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await expect.poll(async () => (await rasterBox(page)).width).toBeGreaterThan(initial.width * 1.8);
    await page.getByRole("button", { name: "Zoom map out", exact: true }).click();
    await expect.poll(async () => Math.abs((await rasterBox(page)).width - initial.width)).toBeLessThan(3);

    if (width <= 850) {
      await page.getByRole("button", { name: /^Plan ·/ }).click();
      await expect(page.locator(".panel-scroll")).toBeVisible();
      await contained(page);
      await overview(page);
      await page.screenshot({ path: `output/playwright/gale-viewport-expanded-${width}.png` });
      await page.getByRole("button", { name: "Collapse planning panel", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Collapse planning panel", exact: true }).click();
      await expect(page.locator(".task-panel")).not.toBeVisible();
      await contained(page);
      await page.getByRole("button", { name: "Open planning panel", exact: true }).click();
    }
    await contained(page);
    await overview(page);
    await expect.poll(async () => Math.abs((await rasterBox(page)).width - initial.width)).toBeLessThan(3);
    await page.getByLabel("Mission region", { exact: true }).selectOption("oxia");
    await expect(page.locator(".map-empty")).toBeVisible();
    await page.getByLabel("Mission region", { exact: true }).selectOption("jezero");
    await expect(page.locator(".map-empty")).toBeVisible();
    await page.getByLabel("Mission region", { exact: true }).selectOption("gale");
    await detailedMissionView(page);
    expect(errors).toEqual([]);
  });
}

test("overview refits across viewport resize and keyboard navigation remains available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?region=gale");
  await detailedMissionView(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => (await rasterBox(page)).canvasWidth).toBe(390);
  await contained(page);
  const before = await rasterBox(page);
  expect(before.bottom).toBeLessThan(before.canvasHeight - 10);
  await page.locator(".map-canvas canvas").focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => Math.abs((await rasterBox(page)).left - before.left)).toBeGreaterThan(10);
  await page.setViewportSize({ width: 1440, height: 900 });
  // After a deliberate navigation, resizing must not replace the user's zoom
  // with a new overview. Its display-pixel scale stays the same.
  await expect.poll(async () => Math.abs((await rasterBox(page)).width - before.width)).toBeLessThan(3);
  await overview(page);
  expect((await rasterBox(page)).width).toBeGreaterThan(before.width * 1.5);
  await page.setViewportSize({ width: 1024, height: 768 });
  await contained(page);
});

test("touch drag and pinch zoom operate in the mobile canvas", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/?region=gale");
  await detailedMissionView(page);
  const initial = await rasterBox(page);
  const canvas = await page.locator(".map-canvas canvas").boundingBox();
  const x = canvas!.x + (initial.left + initial.right) / 2;
  const y = canvas!.y + (initial.top + initial.bottom) / 2;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  for (let step = 1; step <= 10; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + step * 5, y, id: 1 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => Math.abs((await rasterBox(page)).left - initial.left)).toBeGreaterThan(20);
  await overview(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - 20, y, id: 1 }, { x: x + 20, y, id: 2 }] });
  for (let step = 1; step <= 10; step++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - 20 - step * 3, y, id: 1 }, { x: x + 20 + step * 3, y, id: 2 }] });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(async () => (await rasterBox(page)).width).toBeGreaterThan(initial.width * 1.15);
  await contained(page);
  await context.close();
});
