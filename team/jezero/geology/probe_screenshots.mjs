// Headless visual-verification probe for the Jezero geology layer
// (Jezero region owner tool). Drives the real UI: opens ?region=jezero,
// opens the layers panel, enables "Geology (USGS SIM 3464)", waits for the
// MapLibre canvas to settle, and saves screenshots at 1440 px and 390 px.
// Software test/probe only - not scientific evidence.
import { chromium } from "playwright";

const base = "http://127.0.0.1:3000";
const out1440 = "team/jezero/screenshots/jezero-geology-1440.png";
const out390 = "team/jezero/screenshots/jezero-geology-390.png";

const browser = await chromium.launch();
try {
  // ---- 1440 px desktop
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`${base}/?region=jezero`, { waitUntil: "networkidle" });

  // open the layers panel from the map workspace (button labelled Layers)
  const layersButton = page.getByRole("button", { name: /layers/i }).first();
  await layersButton.click();
  const geoRow = page.locator("label.check-row", { hasText: "Geology (USGS SIM 3464)" });
  await geoRow.locator('input[type="checkbox"]').check();

  // let MapLibre fetch and paint the tiles
  await page.waitForTimeout(6000);
  await page.screenshot({ path: out1440 });
  console.log("saved", out1440);

  // ---- 390 px mobile
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mobile.on("pageerror", (e) => errors.push(String(e)));
  await mobile.goto(`${base}/?region=jezero`, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: /layers/i }).first().click();
  const mRow = mobile.locator("label.check-row", { hasText: "Geology (USGS SIM 3464)" });
  await mRow.locator('input[type="checkbox"]').check();
  await mobile.waitForTimeout(6000);
  await mobile.screenshot({ path: out390 });
  console.log("saved", out390);

  console.log("console/page errors:", errors.length ? errors.join(" | ") : "none");
} finally {
  await browser.close();
}
