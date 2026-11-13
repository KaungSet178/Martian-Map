import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  test(`registry-driven region switching keeps catalogs and evidence isolated at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=jezero");
    await expand(page);
    await page
      .getByRole("button", { name: "Add Delta sediment exposure", exact: true })
      .click();
    await page
      .getByLabel("Mission region", { exact: true })
      .selectOption("gale");
    await expand(page);
    await expect(page.locator(".target-list")).toContainText(
      "Layered sedimentary unit",
    );
    await expect(page.locator(".target-list")).not.toContainText(
      "Delta sediment exposure",
    );
    await expect(page.locator(".mission-summary")).toContainText(
      "0 objectives",
    );
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page
      .getByRole("button", {
        name: "View scientific data register",
        exact: true,
      })
      .click();
    await expect(page.locator(".panel-scroll")).toContainText(
      "Gale Crater mission context",
    );
    await expect(
      page.getByRole("heading", { name: "Scientific products", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".panel-scroll")).not.toContainText(
      "Jezero Crater mission context",
    );
    await page
      .getByLabel("Mission region", { exact: true })
      .selectOption("oxia");
    await expect(page.locator(".map-location")).toContainText(
      "Planned mission area",
    );
    await expand(page);
    await expect(page.locator(".target-list")).toContainText(
      "Clay-rich bedrock study",
    );
    await expect(page.locator(".mission-summary")).toContainText(
      "0 objectives",
    );
    await page
      .getByLabel("Mission region", { exact: true })
      .selectOption("jezero");
    await expect(page.locator(".mission-summary")).toContainText("1 objective");
    await page.screenshot({
      path: `output/playwright/architecture-switch-${width}.png`,
    });
  });
}

test("mission JSON round trip preserves legacy v1 IDs and unknown URL region is safe", async ({
  page,
}) => {
  await page.goto("/?region=unknown");
  await expect(page.locator(".map-location h1")).toHaveText("Jezero Crater");
  await page
    .getByRole("button", { name: "Add Delta sediment exposure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open saved missions", exact: true })
    .click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export draft JSON", exact: true })
    .click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  const mission = JSON.parse(buffer.toString());
  expect(mission.schema_version).toBe(1);
  expect(mission.target_ids).toEqual(["jezero-objective-1"]);
  expect(mission.dataset_version).toBe("shared-ui-fixture-v1");
  await page
    .getByLabel("Import mission JSON", { exact: true })
    .setInputFiles({
      name: "roundtrip.json",
      mimeType: "application/json",
      buffer,
    });
  await expect(page.locator(".itinerary li")).toHaveCount(1);
  await expect(page.locator(".itinerary li")).toContainText(
    "Delta sediment exposure",
  );
});

async function expand(page: Page) {
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();
}
test("ordered objectives, one-way requirements, no fabricated paths, save/reopen", async ({
  page,
}) => {
  await page.goto("/?region=gale");
  await expect(
    page.getByRole("heading", { name: "Gale Crater", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add Layered sedimentary unit", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Add Clay-to-sulfate transition",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: /^Plan 2$/ }).click();
  await page
    .getByRole("button", { name: "Move Clay-to-sulfate transition up" })
    .click();
  await expect(page.locator(".itinerary li").first()).toContainText(
    "Clay-to-sulfate transition",
  );
  await page.getByLabel("One way", { exact: true }).check();
  await page
    .getByLabel("Recovery assumption", { exact: true })
    .fill("Proposed recovery team; location remains unverified.");
  await page
    .getByLabel("Mission name", { exact: true })
    .fill("Gale ordered field plan");
  await page
    .getByRole("button", { name: "Review mission", exact: true })
    .click();
  await expect(page.locator(".missing-list")).toContainText(
    "verified recovery endpoint",
  );
  await expect(page.locator(".feasibility dd")).toHaveText(
    Array(6).fill("Unverified"),
  );
  await expect(page.locator(".route-item")).toHaveCount(3);
  await expect(page.locator(".route-svg")).toHaveCount(0);
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Plan 2$/ }).click();
  await expect(page.getByLabel("Mission name", { exact: true })).toHaveValue(
    "Gale ordered field plan",
  );
  await expect(page.locator(".itinerary li").first()).toContainText(
    "Clay-to-sulfate transition",
  );
  await page
    .getByRole("button", { name: "Open saved missions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Gale ordered field plan", exact: true })
    .click();
  await expect(
    page.getByLabel("Recovery assumption", { exact: true }),
  ).toHaveValue("Proposed recovery team; location remains unverified.");
});

test("target dialogs support Escape/focus return and region-scoped selection", async ({
  page,
}) => {
  await page.goto("/");
  const target = page.getByRole("button", {
    name: "Delta sediment exposure",
    exact: true,
  });
  await target.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Add objective to mission", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(target).toBeFocused();
  await page.getByLabel("Mission region", { exact: true }).selectOption("oxia");
  await expect(
    page.getByRole("heading", { name: "Oxia Planum", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".map-location")).toContainText(
    "Planned mission area",
  );
  await expect(page.locator(".mission-summary")).toContainText("0 objectives");
  await page
    .getByLabel("Mission region", { exact: true })
    .selectOption("jezero");
  await expect(page.locator(".mission-summary")).toContainText("1 objective");
});

test("MapLibre preview, camera, layer visibility and opacity work without scientific claims", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "View interface preview", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Zoom map in", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".science-marker")).toHaveCount(3);
  const before = await page.locator(".science-marker").first().boundingBox();
  await page.getByRole("button", { name: "Zoom map in", exact: true }).click();
  const after = await page.locator(".science-marker").first().boundingBox();
  expect(after?.x).not.toBe(before?.x);
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await page.getByRole("button", { name: "Layers", exact: true }).click();
  await page
    .getByLabel("Scenario objective markers", { exact: true })
    .uncheck();
  await expect(page.locator(".science-marker")).toHaveCount(0);
  await page.getByLabel("Scenario objective markers", { exact: true }).check();
  await expect(page.locator(".science-marker")).toHaveCount(3);
  await page.getByLabel("Linework opacity", { exact: false }).fill("30");
  await expect(
    page.getByLabel("Linework opacity", { exact: false }),
  ).toHaveValue("30");
  await page.getByLabel("Schematic linework", { exact: true }).uncheck();
  await expect(
    page.getByLabel("Linework opacity", { exact: false }),
  ).toBeDisabled();
  await page.screenshot({ path: "output/playwright/redesign-layers-1440.png" });
  await expect(page.locator(".map-failure")).toHaveCount(0);
});

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  test(`responsive regions and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const region of ["jezero", "gale", "oxia"]) {
      await page.goto(`/?region=${region}`);
      if (region === "gale") {
        await expect(page.locator(".map-empty")).toHaveCount(0);
      } else {
        await expect(page.locator(".map-empty")).toBeVisible();
      }
      await expect(page.locator(".map-canvas canvas")).toBeAttached();
      await expect(
        page.getByRole("button", { name: "Review mission", exact: true }),
      ).toBeInViewport();
      await expect(
        page.getByRole("button", { name: "Save mission", exact: true }),
      ).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `output/playwright/redesign-${region}-${width}.png`,
      });
    }
    await page
      .getByRole("button", { name: "View interface preview", exact: false })
      .click();
    await expect(page.locator(".science-marker")).toHaveCount(3);
    for (const marker of await page.locator(".science-marker").all()) {
      const bounds = await marker.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.screenshot({
      path: `output/playwright/redesign-preview-${width}.png`,
    });
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page
      .getByRole("button", {
        name: "View scientific data register",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("button", {
        name: "View scientific data register",
        exact: true,
      }),
    ).toBeInViewport();
    await page.screenshot({
      path: `output/playwright/redesign-panel-${width}.png`,
    });
    await expand(page);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("invalid imports preserve drafts; stale mission versions require revalidation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open saved missions", exact: true })
    .click();
  await page.getByLabel("Import mission JSON", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schema_version":900}'),
  });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "not a supported Marswalk mission",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  await page.evaluate(() => {
    const plans = JSON.parse(localStorage.getItem("marswalk.missions.v1")!);
    plans[0].dataset_version = "historical-v0";
    localStorage.setItem("marswalk.missions.v1", JSON.stringify(plans));
  });
  await page.reload();
  await expect(page.locator(".panel-scroll")).toContainText(
    "Revalidation required",
  );
});

test("keyboard focus, native dialog trapping and core view accessibility", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".map-empty")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to planning controls" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#task-content")).toBeFocused();
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page
    .getByRole("button", { name: "Collapse planning panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open planning panel", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".panel-tabs")).not.toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".panel-tabs")).toBeVisible();
  await page
    .getByRole("button", { name: "Delta sediment exposure", exact: true })
    .click();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
  }
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile selection, review action and collapsed sheet remain reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "View interface preview", exact: false })
    .click();
  await page
    .getByRole("button", {
      name: "Inspect Delta sediment exposure, schematic location",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Add objective to mission", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".mission-summary")).toContainText(
    "Selected: Delta sediment exposure",
  );
  await expect(page.locator(".mission-summary")).toContainText(
    "Return margin unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Review mission", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: "output/playwright/redesign-selected-390.png",
  });
  await page
    .getByRole("button", { name: "Review mission", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Collapse planning panel", exact: true })
    .click();
  await expect(page.locator(".panel-scroll")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit mission plan", exact: true }),
  ).toBeInViewport();
});

test("offline saved plans and downloadable brief remain useful", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Add Delta sediment exposure", exact: true })
    .click();
  await page.getByRole("button", { name: "Save mission", exact: true }).click();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Review mission", exact: true })
    .click();
  await expect(page.locator(".missing-list")).toContainText("offline");
  await page
    .getByRole("button", { name: "Open saved missions", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export draft JSON", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/mission.json$/);
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Open mission brief", exact: true })
    .click();
  const brief = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download brief", exact: true })
    .click();
  expect((await brief).suggestedFilename()).toMatch(/brief.html$/);
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: "output/playwright/mission-brief.pdf", format: "A4" });
  await context.setOffline(false);
});

for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  test(`Gale G1 imagery, recorded traverse, evidence and layer controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const failures: string[] = [];
    const assets: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/maps/gale/")) {
        assets.push(response.url());
        if (!response.ok()) failures.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/?region=gale");
    await expect(page.locator(".map-location h1")).toHaveText("Gale Crater");
    await expect(page.locator(".map-empty")).toHaveCount(0);
    await expect(page.getByLabel("Zoom map in", { exact: true })).toBeEnabled();
    await expect.poll(() => assets.some((url) => url.endsWith("curiosity-traverse.geojson"))).toBe(true);
    await expect.poll(() => assets.some((url) => url.includes("ctx-tiles"))).toBe(true);
    await expect(page.locator(".map-attribution")).toContainText("NASA/JPL-Caltech/MSSS");
    await expect(page.locator(".science-marker")).toHaveCount(0);
    await expect(page.locator(".map-scale")).toContainText("Source footprint only");
    await page.getByLabel("Zoom map in", { exact: true }).click();
    await page.getByLabel("Fit exploration region", { exact: true }).click();
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await expand(page);
    const optical = page.getByRole("checkbox", { name: /Gale CTX orbital mosaic/ });
    const traverse = page.getByRole("checkbox", { name: /Recorded Curiosity traverse/ });
    await expect(optical).toBeChecked();
    await expect(traverse).toBeChecked();
    await page.getByLabel(/Gale CTX orbital mosaic opacity/).fill("55");
    await expect(page.getByLabel(/Gale CTX orbital mosaic opacity/)).toHaveValue("55");
    await traverse.uncheck();
    await expect(page.locator(".map-attribution")).not.toContainText("PDS localization");
    await traverse.check();
    await page.getByLabel(/Gale CTX orbital mosaic opacity/).fill("100");
    await page.getByRole("button", { name: "View scientific data register", exact: true }).click();
    await expect(page.locator(".panel-scroll")).toContainText("gale-g2-v1");
    await expect(page.locator(".panel-scroll")).toContainText("1 m output grid does not imply uniform 1 m");
    await page.getByRole("button", { name: "Science", exact: true }).click();
    await page.getByRole("button", { name: "Glen Torridon", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Location unverified");
    await expect(page.getByRole("dialog").getByRole("link", { name: "NASA - Curiosity on the Clay Unit" })).toHaveAttribute("href", "https://science.nasa.gov/photojournal/curiosity-on-the-clay-unit/");
    await page.keyboard.press("Escape");
    if (width < 768) await page.getByRole("button", { name: "Collapse planning panel", exact: true }).click();
    await expect(page.locator(".map-failure")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `output/playwright/gale-g1-${width}.png` });
    expect(failures).toEqual([]);
  });
}
