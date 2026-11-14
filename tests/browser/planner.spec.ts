import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { jezero } from "@/regions/jezero";

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
      .getByRole("button", { name: "Add Jezero geology and climate record", exact: true })
      .click();
    await page
      .getByLabel("Mission region", { exact: true })
      .selectOption("gale");
    await expand(page);
    await expect(page.locator(".target-list")).toContainText(
      "Layered sedimentary unit",
    );
    await expect(page.locator(".target-list")).not.toContainText(
      "Jezero geology and climate record",
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
    .getByRole("button", { name: "Add Jezero geology and climate record", exact: true })
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
  expect(mission.dataset_version).toBe(jezero.dataset_version);
  await page
    .getByLabel("Import mission JSON", { exact: true })
    .setInputFiles({
      name: "roundtrip.json",
      mimeType: "application/json",
      buffer,
    });
  await expect(page.locator(".itinerary li")).toHaveCount(1);
  await expect(page.locator(".itinerary li")).toContainText(
    "Jezero geology and climate record",
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
    name: "Jezero geology and climate record",
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
  // Gale still presents the schematic empty state; Jezero now has a live
  // scientific map and offers no interface preview.
  await page.goto("/?region=gale");
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
      if (region === "jezero") {
        // Jezero presents the live scientific map (recorded traverse);
        // the schematic empty state is expected only for the other regions.
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

test("imported route candidates draw only reviewed geometry and invalidate on edit", async ({
  page,
}) => {
  const assessments = Object.fromEntries(
    ["Terrain", "Oxygen", "Battery", "EVA time", "Radiation", "Return / recovery"].map(
      (name) => [
        name,
        { status: "Unverified", reason: "Not evaluated", value: null, unit: null },
      ],
    ),
  );
  const model = {
    id: "synthetic-route-model",
    version: "1",
    source_ids: ["synthetic-route-source"],
    assumptions: [],
    limitations: [],
  };
  const result = {
    status: "candidates",
    region: "jezero",
    input_revision: "rev-1",
    dataset_version: jezero.dataset_version,
    coverage: {
      status: "audited",
      source_ids: ["synthetic-route-source"],
      limitations: [],
    },
    candidates: [
      {
        id: "candidate-safest",
        objective: "safest",
        validation: "experimental",
        geometry: [
          { body: "Mars", crs: "IAU_2015", easting_m: 0, northing_m: 0 },
          { body: "Mars", crs: "IAU_2015", easting_m: 100, northing_m: 100 },
        ],
        display_geometry: [
          { latitude: 18.4, longitude_east: 77.5 },
          { latitude: 18.45, longitude_east: 77.6 },
          { latitude: 18.5, longitude_east: 77.7 },
        ],
        identical_to: null,
        omitted_target_ids: [],
        models: [model],
        limitations: [],
        assessments,
      },
      {
        id: "candidate-fastest",
        objective: "fastest",
        validation: "scientifically_reviewed",
        geometry: [
          { body: "Mars", crs: "IAU_2015", easting_m: 0, northing_m: 0 },
          { body: "Mars", crs: "IAU_2015", easting_m: 100, northing_m: 100 },
        ],
        identical_to: null,
        omitted_target_ids: [],
        models: [model],
        limitations: [],
        assessments,
      },
      {
        id: "candidate-science",
        objective: "science",
        validation: "scientifically_reviewed",
        geometry: [
          { body: "Mars", crs: "IAU_2015", easting_m: 0, northing_m: 0 },
          { body: "Mars", crs: "IAU_2015", easting_m: 150, northing_m: 120 },
        ],
        display_geometry: [
          { latitude: 18.42, longitude_east: 77.55 },
          { latitude: 18.48, longitude_east: 77.68 },
        ],
        identical_to: null,
        omitted_target_ids: [],
        models: [model],
        limitations: [],
        assessments,
      },
    ],
  };

  await page.goto("/?region=jezero");
  await expand(page);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByLabel("Import route result JSON").setInputFiles({
    name: "route-result.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(result)),
  });

  await expect(page.locator(".route-candidates")).toContainText("Safest");
  await expect(page.locator(".route-candidates")).toContainText(
    "No display geometry · not plotted",
  );
  await expect(page.locator(".map-route-status")).toContainText("Safest");
  await expect(page.locator(".map-route-status")).toContainText("Experimental");
  await expect(page.locator(".map-route-status")).toContainText("1 alternate");

  await page.getByLabel("Select Fastest route candidate").check();
  await expect(page.locator(".map-route-status")).toContainText(
    "No plotted route candidate selected",
  );
  await page.getByLabel("Select Science-focused route candidate").check();
  await expect(page.locator(".map-route-status")).toContainText(
    "Science-focused",
  );

  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByLabel("Mission name").fill("Edited field plan");
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.locator(".route-candidates")).toHaveCount(0);
  await expect(page.locator(".map-route-status")).toHaveCount(0);
  await expect(page.locator(".panel-scroll")).toContainText(
    "Detailed routing unavailable",
  );
});

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
  // Region-agnostic flows run against gale (schematic state); Jezero now
  // presents the live scientific map instead of the empty state.
  await page.goto("/?region=gale");
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
    .getByRole("button", { name: "Layered sedimentary unit", exact: true })
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
  // Region-agnostic selection flow against gale (schematic preview state).
  await page.goto("/?region=gale");
  await page
    .getByRole("button", { name: "View interface preview", exact: false })
    .click();
  await page
    .getByRole("button", {
      name: "Inspect Layered sedimentary unit, schematic location",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Add objective to mission", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".mission-summary")).toContainText(
    "Selected: Layered sedimentary unit",
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
    .getByRole("button", { name: "Add Jezero geology and climate record", exact: true })
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
