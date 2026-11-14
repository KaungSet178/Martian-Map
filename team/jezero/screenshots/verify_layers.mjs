// Jezero layer visual verification (region owner helper, not a test gate).
// Captures the scientific map with each data layer enabled at 1440 px and a
// mobile 390 px pass, after zooming to the z13 ceiling. Requires a dev server
// on 127.0.0.1:3000 and Playwright browsers (`npx playwright install`).
//
// usage: node team/jezero/screenshots/verify_layers.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.argv[2] ?? "http://127.0.0.1:3000";
const OUT = "team/jezero/screenshots";
mkdirSync(OUT, { recursive: true });

const checkbox = (page, label) =>
  page.getByRole("checkbox", {
    name: new RegExp(
      "^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)",
    ),
  });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("console: " + m.text());
});

await page.goto(`${BASE}/?region=jezero`, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForSelector(".map-canvas canvas", { timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: `${OUT}/jezero-layers-1440.png` });

// Zoom to the new zoom ceiling (three steps: 10 -> 13).
for (let i = 0; i < 3; i++) {
  await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
  await page.waitForTimeout(2500);
}
await page.screenshot({ path: `${OUT}/jezero-layers-zoom13-1440.png` });

// Reset, then toggle each data layer and capture panel + map.
const shots = [
  ["Elevation", "jezero-elevation"],
  ["Slope", "jezero-slope"],
  ["Geology (USGS SIM 3464)", "jezero-geology"],
  ["Thermal (THEMIS daytime IR)", "jezero-thermal"],
];
await page.getByRole("button", { name: "Reset map view", exact: true }).click();
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Layers", exact: true }).first().click();
await page.waitForTimeout(600);
for (const [label, id] of shots) {
  await checkbox(page, label).check();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${id}-1440.png` });
  await checkbox(page, label).uncheck();
  await page.waitForTimeout(800);
}

// Mobile pass with the thermal layer enabled.
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
await checkbox(page, "Thermal (THEMIS daytime IR)").check();
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/jezero-layers-390.png` });

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
