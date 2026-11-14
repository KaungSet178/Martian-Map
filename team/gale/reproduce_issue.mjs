import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("output/reproduce", { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://127.0.0.1:3000/?region=gale...");
  await page.goto("http://127.0.0.1:3000/?region=gale");
  await page.waitForTimeout(4000);

  // Baseline CTX
  await page.screenshot({ path: "output/reproduce/1_baseline_ctx.png" });
  console.log("Saved 1_baseline_ctx.png");

  // Open Layers panel
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.waitForTimeout(1000);

  // Toggle Regional Elevation
  const elev = page.getByRole("checkbox", { name: /Regional HRSC elevation/ });
  await elev.check();
  // Set opacity to 100%
  const elevOpacity = page.getByLabel(/Regional HRSC elevation opacity/);
  await elevOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/reproduce/2_regional_elevation_100.png" });
  console.log("Saved 2_regional_elevation_100.png");

  // Toggle Slope
  const slope = page.getByRole("checkbox", { name: /Regional HRSC slope/ });
  await slope.check();
  const slopeOpacity = page.getByLabel(/Regional HRSC slope.* opacity/);
  await slopeOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/reproduce/3_regional_slope_100.png" });
  console.log("Saved 3_regional_slope_100.png");

  // Toggle Hillshade
  const hillshade = page.getByRole("checkbox", { name: /Regional HRSC hillshade/ });
  await hillshade.check();
  const hillOpacity = page.getByLabel(/Regional HRSC hillshade opacity/);
  await hillOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/reproduce/4_regional_hillshade_100.png" });
  console.log("Saved 4_regional_hillshade_100.png");

  await browser.close();
  console.log("Reproduction screenshots captured successfully.");
}

run().catch((err) => {
  console.error("Error during reproduction:", err);
  process.exit(1);
});
