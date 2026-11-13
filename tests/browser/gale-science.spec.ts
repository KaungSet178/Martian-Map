import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openScience(page: Page) {
  await page.goto("/?region=gale");
  const handle = page.getByRole("button", { name: /^Plan \u00b7/ });
  if (await handle.isVisible()) await handle.click();
  await page.getByRole("button", { name: "Science", exact: true }).click();
}

const observations = [
  ["Glen Torridon", "PIA23047", "2019-02-10", "2316"],
  ["Vera Rubin Ridge", "PIA21851", "2017-08-19", "1790"],
  ["Sulfate-bearing geological units", "PIA26551", "2025-02-07", "4447"],
  ["Gediz Vallis", "NLB_781532029EDR_F1091446NCAM00379M_", "2024-10-07", "4326"],
];

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`G2 area evidence, NASA photographs and region isolation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await openScience(page);
    for (const [title, product, date, sol] of observations) {
      const button = page.getByRole("button", { name: title, exact: true });
      await button.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText("Geological area");
      await expect(dialog).toContainText("Location unverified");
      await expect(dialog).toContainText("Boundary unavailable");
      await expect(dialog).toContainText("Photographic association does not verify a target location");
      const figure = dialog.locator("figure");
      await expect(figure).toContainText(product);
      await expect(figure).toContainText(date);
      await expect(figure).toContainText(`Sol ${sol}`);
      await expect(figure).toContainText("NASA/JPL-Caltech");
      const image = figure.getByRole("img");
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
      await figure.getByText("Photo provenance and limitations", { exact: true }).click();
      await expect(figure).toContainText("not a georeferenced map");
      await expect(figure.getByRole("link", { name: "Source and original imagery" })).toHaveAttribute("href", /^https:\/\/science.nasa.gov\//);
      expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      if (title === "Glen Torridon") {
        await dialog.locator(".dialog-content").evaluate((node) => { node.scrollTop = 0; });
        await page.screenshot({ path: `output/playwright/gale-g2-${width}.png` });
        await image.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `output/playwright/gale-g2-photo-${width}.png` });
        const accessibility = await new AxeBuilder({ page }).include("dialog").analyze();
        expect(accessibility.violations).toEqual([]);
      }
      await page.keyboard.press("Escape");
      await expect(button).toBeFocused();
      await expect(page.locator(".science-marker")).toHaveCount(0);
    }
    for (const region of ["jezero", "oxia", "gale"]) {
      await page.getByLabel("Mission region", { exact: true }).selectOption(region);
      const handle = page.getByRole("button", { name: /^Plan \u00b7/ });
      if (await handle.isVisible()) await handle.click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator(".target-photograph")).toHaveCount(0);
      if (region !== "gale") {
        await expect(page.locator(".target-list")).not.toContainText("Glen Torridon");
        await page.locator(".target-title").first().click();
        await expect(page.getByRole("dialog")).not.toContainText("PIA23047");
        await page.keyboard.press("Escape");
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(failures).toEqual([]);
  });
}

test("a missing photograph preserves scientific metadata and NASA source access", async ({ page }) => {
  await page.route("**/photos/gale/PIA23047.jpg", (route) => route.fulfill({ status: 404, body: "Unavailable" }));
  await openScience(page);
  await page.getByRole("button", { name: "Glen Torridon", exact: true }).click();
  const figure = page.getByRole("dialog").locator("figure");
  await figure.scrollIntoViewIfNeeded();
  await expect(figure.getByRole("status")).toContainText("Photograph unavailable");
  await expect(figure).toContainText("PIA23047");
  await expect(figure).toContainText("Sol 2316");
  await figure.getByText("Photo provenance and limitations", { exact: true }).click();
  await expect(figure.getByRole("link", { name: "Source and original imagery" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByLabel("Zoom map in", { exact: true }).click();
  await expect(page.locator(".map-failure")).toHaveCount(0);
});
