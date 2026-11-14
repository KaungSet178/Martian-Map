import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const out = "team/gale/focused-view/screenshots-after";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ args: ["--enable-unsafe-swiftshader"] });

for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
  console.log(`Testing viewport ${width}x${height}...`);
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

  // 1. Fresh entry into Gale
  await page.goto("http://127.0.0.1:3100/?region=gale");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Measure initial state
  const initialContextRequested = responses.some((r) => r.url.includes("/context-tiles/"));
  const initialDetailedRequested = responses.some((r) => r.url.includes("/ctx-tiles/"));

  // Screenshot 1: Gale initial focused view
  await page.screenshot({ path: `${out}/gale-default-${width}.png` });

  const measurement = await page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
    };
    return { workspace: rect(".map-workspace"), canvas: rect(".map-canvas canvas"), body: rect("body") };
  });

  // Calculate dark fraction on initial canvas
  const canvasShot = await page.locator(".map-canvas canvas").screenshot();
  const darkFraction = await page.evaluate(async (base64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let dark = 0;
    for (let p = 0; p < data.length; p += 4) {
      if (Math.abs(data[p] - 13) + Math.abs(data[p + 1] - 25) + Math.abs(data[p + 2] - 40) < 12) dark++;
    }
    return dark / (data.length / 4);
  }, canvasShot.toString("base64"));

  // 2. Click "Fit complete mission area"
  const fitComplete = page.getByRole("button", { name: "Fit complete mission area", exact: true });
  await fitComplete.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/gale-complete-mission-${width}.png` });

  // 3. Toggle optional wider context via BasemapControl or Layers
  const contextToggle = page.getByRole("checkbox", { name: "Show wider Gale context" });
  if (await contextToggle.isVisible().catch(() => false)) {
    await contextToggle.check();
  } else {
    // Open Layers if collapsed
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const handle = page.getByRole("button", { name: /^Plan ·/ });
    if (await handle.isVisible().catch(() => false)) await handle.click();
    const contextCheck = page.getByRole("checkbox", { name: /^Context CTX/ });
    await contextCheck.check();
  }
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  const widerContextRequested = responses.some((r) => r.url.includes("/context-tiles/"));
  await page.screenshot({ path: `${out}/gale-wider-context-${width}.png` });

  // Disable wider context again
  if (await contextToggle.isVisible().catch(() => false)) {
    await contextToggle.uncheck();
  } else {
    const contextCheck = page.getByRole("checkbox", { name: /^Context CTX/ });
    if (await contextCheck.isVisible().catch(() => false)) await contextCheck.uncheck();
  }
  await page.waitForTimeout(300);

  // 4. Test "Explore Curiosity area"
  const exploreArea = page.getByRole("button", { name: "Explore Curiosity area", exact: true });
  await exploreArea.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  // 5. Test Elevation in Mission View
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  const expand = page.getByRole("button", { name: /^Plan ·/ });
  if (await expand.isVisible().catch(() => false)) await expand.click();
  const elevCheck = page.getByRole("checkbox", { name: /Regional HRSC elevation/ });
  await elevCheck.check();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/gale-mission-view-elevation-${width}.png` });

  // 6. Test Full Data Coverage with Elevation
  const fullCoverageRadio = page.getByRole("radio", { name: "Full Data Coverage", exact: true });
  await fullCoverageRadio.check();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/gale-full-coverage-elevation-${width}.png` });

  // Reset display mode and layer
  const missionViewRadio = page.getByRole("radio", { name: "Mission View (Default)", exact: true });
  await missionViewRadio.check();
  await elevCheck.uncheck();
  await page.waitForTimeout(300);

  // 7. Jezero untouched check
  await page.getByLabel("Mission region", { exact: true }).selectOption("jezero");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/jezero-default-${width}.png` });

  // 8. Oxia untouched check
  await page.getByLabel("Mission region", { exact: true }).selectOption("oxia");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/oxia-default-${width}.png` });

  await writeFile(
    `${out}/gale-after-${width}.json`,
    JSON.stringify(
      {
        width,
        height,
        measurement,
        darkFraction,
        initialContextRequested,
        initialDetailedRequested,
        widerContextRequested,
        errors,
        responses: responses.slice(-30),
      },
      null,
      2
    ) + "\n"
  );

  await page.close();
  console.log(`Viewport ${width}x${height} done.`);
}

await browser.close();
console.log("All after screenshots and measurements captured successfully.");
