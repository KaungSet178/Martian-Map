import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sizes = [[1440, 900], [1024, 768], [768, 1024], [390, 844]] as const;

async function openSheet(page: Page, width: number) {
  if (width <= 850) await page.locator(".sheet-handle").click();
  await expect(page.locator("#task-content")).toBeVisible();
}

async function unobstructed(page: Page, selector: string) {
  expect(await page.locator(selector).evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return hit === element || element.contains(hit);
  })).toBe(true);
}

for (const [width, height] of sizes) {
  test(`console, tabs, layers and map remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=jezero");
    await openSheet(page, width);
    const tabs = page.getByRole("tablist", { name: "Planning views", exact: true });
    const science = tabs.getByRole("tab", { name: "Science", exact: true });
    await science.focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "Environment" })).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: "Environment", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tabpanel", { name: /^Plan/ })).toBeVisible();
    const subTabs = page.getByRole("tablist", { name: "Planning views sub-navigation" });
    await subTabs.getByRole("tab").first().focus();
    await page.keyboard.press("End");
    await expect(subTabs.getByRole("tab").last()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(subTabs.getByRole("tab").first()).toHaveAttribute("aria-selected", "true");
    await page.screenshot({ path: `output/playwright/f2-plan-${width}.png` });
    await tabs.getByRole("tab", { name: "Review", exact: true }).click();
    await expect(page.getByRole("tabpanel", { name: "Review", exact: true })).toBeVisible();
    await page.screenshot({ path: `output/playwright/f2-review-${width}.png` });
    await tabs.getByRole("tab", { name: "Review", exact: true }).focus();
    await page.keyboard.press("Home");
    await expect(science).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.getByRole("tab", { name: "Review", exact: true })).toBeFocused();
    await science.click();
    await page.getByRole("button", { name: "Review mission", exact: true }).click();
    await expect(tabs.getByRole("tab", { name: "Review", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Edit mission plan", exact: true }).click();
    await expect(tabs.getByRole("tab", { name: /^Plan/ })).toHaveAttribute("aria-selected", "true");
    await science.click();
    const footer = await page.locator(".mission-summary").boundingBox();
    expect(footer!.height).toBeLessThanOrEqual(100);
    expect((await page.locator("#task-content").boundingBox())!.height).toBeGreaterThan(100);
    if (width > 850) {
      const before = (await page.locator(".task-panel").boundingBox())!.width;
      await page.getByRole("button", { name: "Expand mission console" }).click();
      expect((await page.locator(".task-panel").boundingBox())!.width).toBeGreaterThan(before);
      await page.getByRole("button", { name: "Reduce mission console" }).click();
    }
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.locator(".layers-window");
    await expect(layers).toBeFocused();
    if (width > 850) await page.getByRole("button", { name: "Expand mission console" }).click();
    for (const button of await page.locator(".map-navigation button").all()) {
      await unobstructed(page, `[aria-label="${await button.getAttribute("aria-label")}"]`);
    }
    await expect(page.getByRole("button", { name: "Zoom map in", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
    await layers.getByRole("button", { name: "View scientific data register", exact: true }).click();
    await expect(layers).toHaveAccessibleName("Scientific data register");
    await expect(layers.getByRole("heading", { name: "Scientific products", exact: true })).toBeVisible();
    await page.screenshot({ path: `output/playwright/f2-layers-${width}.png` });
    await layers.focus();
    await page.keyboard.press("Escape");
    await expect(layers).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Layers", exact: true })).toBeFocused();
    await science.focus();
    await page.keyboard.press("Escape");
    if (width > 850) {
      const opener = page.getByRole("button", { name: "Open planning panel" });
      await expect(opener).toBeFocused();
      await expect(page.locator(".task-panel")).toBeHidden();
      await opener.click();
    } else {
      await expect(page.locator(".sheet-handle")).toBeFocused();
      await expect(page.locator("#task-content")).toBeHidden();
      await page.locator(".sheet-handle").click();
    }
    await expect(page.locator("#task-content")).toBeVisible();
    if (width <= 850) {
      await page.locator(".sheet-handle").click();
      await expect(page.locator("#task-content")).toBeHidden();
      await page.locator(".sheet-handle").click();
      await expect(page.locator("#task-content")).toBeVisible();
    }
    await page.screenshot({ path: `output/playwright/f2-science-${width}.png` });
  });

  for (const region of ["gale", "jezero"] as const) {
    test(`${region} measurements fit the actual console at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`/?region=${region}&panel=environment`);
      const body = page.locator("#task-content");
      await expect(body).toBeVisible();
      const environment = page.getByTestId("environmental-conditions-panel");
      await expect(environment).toBeVisible();
      const overflowing = await environment.evaluate(root => Array.from(root.querySelectorAll<HTMLElement>("div, p, span, dl, dd, pre"))
        .filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2)
        .map(el => ({ className: el.className, text: el.textContent?.slice(0, 80) })));
      expect(overflowing).toEqual([]);
      const metric = region === "jezero" ? page.locator(".jz-card").first() : environment.locator("section .grid").nth(1);
      await metric.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/playwright/f2-${region}-metrics-${width}.png` });
      if (width > 850) {
        await page.getByRole("button", { name: "Expand mission console" }).click();
        await page.screenshot({ path: `output/playwright/f2-${region}-expanded-${width}.png` });
      }
      await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
      expect(await body.evaluate(el => Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight))).toBeLessThanOrEqual(1);
      await unobstructed(page, ".mission-summary button");
      await page.screenshot({ path: `output/playwright/f2-${region}-footer-${width}.png` });
      await page.getByRole("button", { name: "Layers", exact: true }).click();
      for (const button of await page.locator(".map-navigation button").all()) {
        await unobstructed(page, `[aria-label="${await button.getAttribute("aria-label")}"]`);
      }
      const canvas = page.locator(".map-canvas canvas");
      const before = await canvas.screenshot();
      await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
      await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);
      await page.screenshot({ path: `output/playwright/f2-${region}-layers-map-${width}.png` });
    });
  }
}

test("console tabs and environmental content have no serious accessibility violations", async ({ page }) => {
  for (const region of ["jezero", "gale"]) {
    await page.goto(`/?region=${region}&panel=environment`);
    await expect(page.getByTestId("environmental-conditions-panel")).toBeVisible();
    const results = await new AxeBuilder({ page }).include(".task-panel").analyze();
    expect(results.violations.filter(v => ["critical", "serious"].includes(v.impact ?? ""))).toEqual([]);
  }
});
