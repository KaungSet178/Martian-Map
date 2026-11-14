import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const out = "team/gale/focused-view/screenshots-before";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });
for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  const responses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/maps/")) {
      responses.push({ url: new URL(response.url()).pathname, status: response.status() });
      if (!response.ok()) errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("http://127.0.0.1:3100/?region=gale");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/gale-default-${width}.png` });
  const measurement = await page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    };
    return { workspace: rect(".map-workspace"), canvas: rect(".map-canvas canvas"), body: rect("body") };
  });
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const expand = page.getByRole("button", { name: /^Plan ·/ });
  if (await expand.isVisible().catch(() => false)) await expand.click();
  const context = page.getByRole("checkbox", { name: /^Context CTX/ });
  const contextChecked = await context.isChecked().catch(() => null);
  const fit = page.getByRole("button", { name: /^(Fit complete mission area|Fit exploration region)$/ });
  await fit.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/gale-complete-mission-${width}.png` });
  if (contextChecked === false) {
    await context.check();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/gale-wider-context-${width}.png` });
    await context.uncheck();
  } else {
    await page.screenshot({ path: `${out}/gale-wider-context-${width}.png` });
  }
  await writeFile(`${out}/gale-before-${width}.json`, JSON.stringify({
    width, height, measurement, context_visible_default: contextChecked, errors,
    context_tiles_requested: responses.some((item) => item.url.includes("/context-tiles/")),
    detailed_tiles_requested: responses.some((item) => item.url.includes("/ctx-tiles/")),
    responses,
  }, null, 2) + "\n");
  await page.close();
}
await browser.close();
