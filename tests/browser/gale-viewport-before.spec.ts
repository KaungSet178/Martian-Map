import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("capture baseline Gale canvas and Jezero reference", async ({ page }) => {
  test.skip(process.env.CAPTURE_GALE_BASELINE !== "1", "Explicit baseline audit only");
  test.setTimeout(120_000);
  const out = "team/gale/viewport/screenshots";
  await mkdir(out, { recursive: true });
  const measurements = [];
  for (const [region, port] of [["gale", 3118], ["jezero", 3119]] as const) {
    for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto(`http://127.0.0.1:${port}/?region=${region}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);
      const dimensions = await page.evaluate(() => {
        const rect = (selector: string) => {
          const r = document.querySelector(selector)!.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        };
        return { workspace: rect(".map-workspace"), container: rect(".map-canvas"), canvas: rect(".map-canvas canvas"),
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      const frame = await page.locator(".map-canvas canvas").screenshot();
      const pixels = await page.evaluate(async (base64) => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
        const canvas = document.createElement("canvas"); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d")!; ctx.drawImage(bitmap, 0, 0); bitmap.close();
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let dark = 0;
        for (let i = 0; i < data.length; i += 4)
          if (Math.abs(data[i]-13)+Math.abs(data[i+1]-25)+Math.abs(data[i+2]-40) < 10) dark++;
        return { dark_fraction: dark / (data.length / 4) };
      }, frame.toString("base64"));
      await page.screenshot({ path: `${out}/${region}-before-${width}.png` });
      await writeFile(`${out}/${region}-before-canvas-${width}.png`, frame);
      measurements.push({ region, width, height, ...dimensions, ...pixels });
    }
  }
  await writeFile("team/gale/viewport/before-measurements.json", JSON.stringify(measurements, null, 2)+"\n");
});
