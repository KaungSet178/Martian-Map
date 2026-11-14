import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("output/verify_fix", { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log("Navigating to http://127.0.0.1:3000/?region=gale...");
  await page.goto("http://127.0.0.1:3000/?region=gale");
  await page.waitForTimeout(4000);

  // 1. Baseline CTX
  await page.screenshot({ path: "output/verify_fix/1_baseline_ctx.png" });
  console.log("Saved 1_baseline_ctx.png");

  // Open Layers panel
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page.waitForTimeout(1000);

  // 2. Toggle Regional Elevation at 100% opacity in Mission View (Default)
  const elev = page.getByRole("checkbox", { name: /Regional HRSC elevation/ });
  await elev.check();
  const elevOpacity = page.getByLabel(/Regional HRSC elevation opacity/);
  await elevOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/2_regional_elevation_mission_view_100.png" });
  console.log("Saved 2_regional_elevation_mission_view_100.png");

  // 3. Switch to Full Data Coverage mode
  const fullCoverageRadio = page.getByRole("radio", { name: /Full Data Coverage/ });
  await fullCoverageRadio.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/3_regional_elevation_full_coverage_100.png" });
  console.log("Saved 3_regional_elevation_full_coverage_100.png");

  // 4. Switch back to Mission View (Default)
  const missionViewRadio = page.getByRole("radio", { name: /Mission View/ });
  await missionViewRadio.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/4_regional_elevation_restored_mission_view.png" });
  console.log("Saved 4_regional_elevation_restored_mission_view.png");

  // 5. Toggle Slope at 100% opacity in Mission View
  const slope = page.getByRole("checkbox", { name: /Regional HRSC slope/ });
  await slope.check();
  const slopeOpacity = page.getByLabel(/Regional HRSC slope.* opacity/);
  await slopeOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/5_regional_slope_mission_view_100.png" });
  console.log("Saved 5_regional_slope_mission_view_100.png");

  // 6. Toggle Hillshade at 100% opacity in Mission View
  const hillshade = page.getByRole("checkbox", { name: /Regional HRSC hillshade/ });
  await hillshade.check();
  const hillOpacity = page.getByLabel(/Regional HRSC hillshade opacity/);
  await hillOpacity.fill("100");
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/6_regional_hillshade_mission_view_100.png" });
  console.log("Saved 6_regional_hillshade_mission_view_100.png");

  // 7. Toggle Thermal at standard opacity (60%)
  const thermal = page.getByRole("checkbox", { name: /Thermal \(THEMIS daytime IR\)/ });
  await thermal.check();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: "output/verify_fix/7_thermal_mission_view_60.png" });
  console.log("Saved 7_thermal_mission_view_60.png");

  // 8. Zoom in to Arc Pass / Mount Sharp corridor
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(2500);

  await page.screenshot({ path: "output/verify_fix/8_zoomed_view_mission_view.png" });
  console.log("Saved 8_zoomed_view_mission_view.png");

  await browser.close();
  console.log("All verification screenshots captured successfully.");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
