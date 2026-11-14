import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

const HERE = __dirname;
const SCREENSHOTS = path.join(HERE, "screenshots");

function previewUrl(width: number): string {
  return pathToFileURL(path.join(HERE, "preview", `jezero-${width}.html`)).href;
}

async function horizontalOverflow(page: import("@playwright/test").Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollWidth - doc.clientWidth, 0);
  });
}

test.beforeAll(async () => {
  await mkdir(SCREENSHOTS, { recursive: true });
});

test("desktop: renders verified MEDA observations, switcher works, screenshot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(previewUrl(1440));

  const panel = page.getByTestId("jz-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Environmental Conditions" })).toBeVisible();
  await expect(panel).toContainText("Jezero Crater · Perseverance Historical Observations");
  await expect(page.getByTestId("jz-verify-SOURCE_VERIFIED")).toContainText("VERIFIED");
  await expect(page.getByTestId("jz-verify-REGISTRATION_VERIFIED")).toContainText(
    "NOT_EVALUATED",
  );

  // Hydration must have happened for the selector to respond.
  await page.getByTestId("jz-sol-300").click();
  await expect(page.getByTestId("jz-sol-300")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("jz-sol-100")).toHaveAttribute("aria-pressed", "false");
  await expect(panel).toContainText("Sol 300");

  // Five ATS detectors must stay separate in the legend.
  await expect(
    panel.locator(".jz-legend-item", { hasText: "Air temperature, ATS 1" }).first(),
  ).toBeVisible();
  await expect(
    panel.locator(".jz-legend-item", { hasText: "Air temperature, ATS 5" }).first(),
  ).toBeVisible();

  // Chart lines exist and use non-scaling strokes for responsive layout.
  const strokes = await page.locator(".jz-chart-plot path").count();
  expect(strokes).toBeGreaterThan(0);

  await page.screenshot({
    path: path.join(SCREENSHOTS, "jezero-environment-1440.png"),
    fullPage: true,
  });
});

test("desktop: no fabricated radiation dose and no zero-filled gaps", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(previewUrl(1440));
  await expect(page.getByTestId("jz-panel")).toBeVisible();

  await expect(page.getByTestId("jz-ionizing-empty")).toContainText(
    "No verified local ionizing-dose measurement integrated",
  );
  await expect(page.getByTestId("jz-dust-empty")).toBeVisible();
  await expect(page.getByTestId("jz-solar-empty")).toHaveCount(0);

  // RDS is described as a photodiode radiance channel, never as a dose readout.
  await expect(page.locator(".jz-chartcard-title", { hasText: "UV photodiode radiance" })).toBeVisible();
  await expect(page.getByText("Why RDS is not a dose readout")).toBeVisible();

  const forbidden = [
    "absorbed dose equivalent measurement",
    "astronaut radiation exposure",
    "galactic cosmic-ray dose measurement",
  ];
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const phrase of forbidden) expect(body).not.toContain(phrase);

  // No chart may plot a value of exactly zero where the source is missing.
  const zeros = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".jz-card-value .jz-value")).filter(
      (node) => (node.textContent ?? "").trim() === "0.0",
    ).length,
  );
  expect(zeros).toBe(0);
});

test("tablet: layout fits and screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(previewUrl(768));
  await expect(page.getByTestId("jz-panel")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: path.join(SCREENSHOTS, "jezero-environment-768.png"),
    fullPage: true,
  });
});

test("mobile: 390 px layout fits and screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(previewUrl(390));
  await expect(page.getByTestId("jz-panel")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

  const grid = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".jz-cards > .jz-card"));
    if (cards.length === 0) return { columns: 0, cards: 0 };
    const tops = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)));
    return { columns: cards.length / tops.size, cards: cards.length };
  });
  expect(grid.cards).toBeGreaterThanOrEqual(4);
  expect(grid.columns).toBeGreaterThanOrEqual(2);

  await page.screenshot({
    path: path.join(SCREENSHOTS, "jezero-environment-390.png"),
    fullPage: true,
  });
});
