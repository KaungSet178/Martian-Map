import { test, expect } from "@playwright/test";

for (const [width, height] of [[1440, 900], [390, 844]]) {
  test(`restored Oxia color, CRISM stop and modeled traverse ${width}px`, async ({ page }) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    const errors: string[] = [], colorTiles: number[] = [], traverseResponses: number[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (response.url().includes("/maps/oxia/ctx-color-tiles/")) colorTiles.push(response.status());
      if (response.url().endsWith("/maps/oxia/candidate-traverse.geojson")) traverseResponses.push(response.status());
    });
    await page.goto("/?region=oxia");
    await expect(page.locator(".map-canvas canvas")).toBeVisible();
    const handle = page.locator(".sheet-handle");
    if (await handle.isVisible() && await handle.getAttribute("aria-expanded") === "false") await handle.click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: /^CTX colorized/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /^CTX basemap/ })).not.toBeChecked();
    await expect.poll(() => colorTiles.length).toBeGreaterThan(0);
    expect(colorTiles.every(status => status === 200)).toBe(true);
    const overlay = page.getByRole("checkbox", { name: /^Candidate traverse \(Modeled\)/ });
    await expect(overlay).not.toBeChecked();
    await overlay.scrollIntoViewIfNeeded();
    const canvasStyle = ".task-panel,.map-topline,.map-navigation,.map-bottomline,.map-attribution,.basemap-control{visibility:hidden!important}";
    const before = await page.locator(".map-canvas canvas").screenshot({ style: canvasStyle });
    await overlay.check();
    await expect.poll(() => traverseResponses.length).toBeGreaterThan(0);
    expect(traverseResponses.every(status => status === 200)).toBe(true);
    await expect(page.locator(".panel-scroll")).toContainText("Not safety-validated; not live routing");
    await page.waitForTimeout(700);
    const after = await page.locator(".map-canvas canvas").screenshot({ style: canvasStyle, path: `output/playwright/oxia-traverse-${width}.png` });
    expect(after.equals(before)).toBe(false);
    const cyanPixels = await page.evaluate(async encoded => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${encoded}`)).blob());
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0); image.close();
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] > 150 && pixels[i + 2] > 180 && pixels[i] < pixels[i + 1] - 60) count++;
      return count;
    }, after.toString("base64"));
    expect(cyanPixels).toBeGreaterThan(3);
    await overlay.uncheck();
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await expect(page.locator(".target-list .target-row")).toHaveCount(4);
    for (const [id, title] of [[1, "Clay-rich bedrock study"], [4, "Hydrous mineral detection (CRISM)"]] as const) {
      await page.getByRole("button", { name: title, exact: true }).click();
      const site = page.getByTestId(`site-oxia-mineral-${id}`);
      await site.locator("summary").click();
      await expect(site).toContainText("Geometric planning only");
      await site.getByRole("button", { name: "Add geometric stop", exact: true }).click();
      await page.keyboard.press("Escape");
    }
    const north = page.getByRole("button", { name: "Inspect Clay-rich bedrock study, verified location", exact: true });
    const south = page.getByRole("button", { name: "Inspect Hydrous mineral detection (CRISM), verified location", exact: true });
    await expect(north).toHaveCount(1); await expect(south).toHaveCount(1);
    expect((await south.boundingBox())!.y).toBeGreaterThan((await north.boundingBox())!.y);
    await page.getByRole("button", { name: "Save mission", exact: true }).click();
    const stops = await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("marswalk.missions.v1")!);
      return saved.find((m: { region: string }) => m.region === "oxia").waypoint_plan.waypoints;
    });
    expect(stops).toHaveLength(2);
    expect(stops.find((s: { target_id: string }) => s.target_id === "oxia-objective-4").coordinates).toEqual({ latitude: 18.17, longitude_east: 335.82 });
    expect(errors).toEqual([]);
    await page.screenshot({ path: `output/playwright/oxia-restoration-${width}.png` });
  });
}
