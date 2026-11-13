import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const VIEWPORTS = [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
] as const;

for (const [width, height] of VIEWPORTS) {
  test(`M3 interactive waypoint placement, trajectory visualization, and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=gale");

    // Wait for the map canvas to mount
    const mapCanvas = page.locator(".map-canvas");
    await expect(mapCanvas).toBeVisible();

    // Open planning panel if mobile/collapsed
    const handle = page.getByRole("button", { name: /^Plan ·/ });
    if (await handle.isVisible()) await handle.click();

    // Navigate to Plan -> Surface Waypoints tab
    await page.getByRole("button", { name: /^Plan/ }).click();
    const waypointsTab = page.getByRole("tab", { name: /Surface Waypoints/ });
    await expect(waypointsTab).toBeVisible();
    await waypointsTab.click();

    // Verify Waypoint Editor is rendered
    await expect(page.getByTestId("waypoint-editor")).toBeVisible();

    // Check "Place waypoint on map" button is present and enabled in Gale
    const placeBtn = page.getByTestId("toggle-map-placement-btn");
    await expect(placeBtn).toBeVisible();
    await expect(placeBtn).toBeEnabled();
    await expect(placeBtn).toContainText("Place waypoint on map");

    // Arm map placement mode
    await placeBtn.click();

    // Verify placement mode state
    await expect(placeBtn).toContainText("Cancel map placement");
    const banner = page.getByTestId("placement-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Waypoint placement active");

    // Wait for resize / layout to settle after panel toggle
    await page.waitForTimeout(400);

    // Get the map canvas bounding box
    const canvas = page.locator(".map-canvas canvas");
    await expect(canvas).toBeVisible();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Click 25px north of center for Base Camp
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width * 0.5;
      const centerY = canvasBox.y + canvasBox.height * 0.5;
      await page.mouse.click(centerX, centerY - 25);
    }

    // Verify Base Camp marker appeared on map
    const markers = page.getByTestId("map-waypoint-marker");
    await expect(markers.first()).toBeVisible({ timeout: 7000 });
    await expect(markers).toHaveCount(1);
    await expect(markers.first()).toHaveAttribute("data-role", "base");

    // Click 25px south of center for Intermediate Waypoint
    if (canvasBox) {
      const centerX = canvasBox.x + canvasBox.width * 0.5;
      const centerY = canvasBox.y + canvasBox.height * 0.5;
      await page.mouse.click(centerX, centerY + 25);
    }

    // Now we should have 2 waypoints
    await expect(markers).toHaveCount(2);

    // Trajectory disclaimer on map bottomline should now be visible (2+ waypoints)
    const trajectoryLegend = page.getByTestId("trajectory-legend");
    await expect(trajectoryLegend).toBeVisible();
    await expect(trajectoryLegend).toContainText(
      "Proposed geometric trajectory — spherical Mars approximation (R = 3,396,190 m)",
    );

    // Disarm placement mode using the Cancel button in the placement banner
    const cancelPlacementBtn = page.getByTestId("cancel-placement-btn");
    await expect(cancelPlacementBtn).toBeVisible();
    await cancelPlacementBtn.click();
    await expect(banner).toHaveCount(0);

    // Test Escape key cancellation
    const isMobile = width <= 900;
    if (isMobile) {
      const handleBtn = page.getByRole("button", { name: /^Plan ·/ });
      if (await handleBtn.isVisible()) await handleBtn.click();
    }
    await expect(placeBtn).toBeVisible();
    await placeBtn.click();
    await expect(banner).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(banner).toHaveCount(0);

    // Test selecting a marker on the map
    await markers.first().click({ force: true });
    await expect(markers.first()).toHaveClass(/selected/);

    // On selection, itinerary opens (even on mobile) and displays Base Camp
    await expect(page.getByTestId("origin-status")).toBeVisible();
    await expect(page.getByTestId("origin-status")).toContainText("Base Camp");

    // Test manual coordinate entry form (accessibility feature)
    const manualCard = page.getByTestId("manual-coordinates-card");
    await expect(manualCard).toBeVisible();
    // Open the details element
    await manualCard.locator("summary").click();

    // Fill in manual coordinates
    await page.locator("#manual-coord-lat").fill("-4.6700");
    await page.locator("#manual-coord-lon").fill("137.4100");
    await page.locator("#manual-coord-label").fill("Manual Outpost Gamma");
    await page.getByTestId("add-manual-waypoint-btn").click();

    // Verify 3rd waypoint marker is added
    await expect(markers).toHaveCount(3);

    // Save screenshot for deliverables
    await page.screenshot({
      path: `output/playwright/interactive-waypoints-${width}.png`,
    });

    // Run Axe accessibility scan
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}

test("Jezero Crater disables interactive map placement with clear explanation", async ({
  page,
}) => {
  await page.goto("/?region=jezero");

  // Open planning panel if needed
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();

  // Navigate to Plan -> Surface Waypoints
  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByRole("tab", { name: /Surface Waypoints/ }).click();

  // "Place waypoint on map" button should be disabled
  const placeBtn = page.getByTestId("toggle-map-placement-btn");
  await expect(placeBtn).toBeVisible();
  await expect(placeBtn).toBeDisabled();

  // Explanatory note should be visible
  const note = page.getByTestId("placement-unavailable-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText(
    "Map placement requires georeferenced scientific map coverage",
  );

  // Manual coordinate entry should still be available
  const manualCard = page.getByTestId("manual-coordinates-card");
  await expect(manualCard).toBeVisible();
});

test("placement safeguards: dragging, zooming, marker clicks, and controls do not create waypoints", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?region=gale");

  const mapCanvas = page.locator(".map-canvas");
  await expect(mapCanvas).toBeVisible();

  // Navigate to Plan -> Surface Waypoints tab
  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByRole("tab", { name: /Surface Waypoints/ }).click();

  const placeBtn = page.getByTestId("toggle-map-placement-btn");
  await expect(placeBtn).toBeVisible();
  await placeBtn.click();

  const banner = page.getByTestId("placement-banner");
  await expect(banner).toBeVisible();

  const canvas = page.locator(".map-canvas canvas");
  await expect(canvas).toBeVisible();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) return;

  const markers = page.getByTestId("map-waypoint-marker");
  await expect(markers).toHaveCount(0);

  // 1. Mouse Dragging Safeguard: dragging the map must NOT place a waypoint
  const startX = canvasBox.x + canvasBox.width * 0.4;
  const startY = canvasBox.y + canvasBox.height * 0.4;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 80, startY + 80, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  await expect(markers).toHaveCount(0);

  // 2. Map Control Click Safeguard: clicking navigation controls must NOT place a waypoint
  const zoomIn = page.locator(".maplibregl-ctrl-zoom-in");
  if (await zoomIn.isVisible()) {
    await zoomIn.click();
    await page.waitForTimeout(200);
    await expect(markers).toHaveCount(0);
  }

  // 3. Normal Click: Places exactly 1 waypoint
  const clickX = canvasBox.x + canvasBox.width * 0.5;
  const clickY = canvasBox.y + canvasBox.height * 0.5 - 25;
  await page.mouse.click(clickX, clickY);
  await expect(markers).toHaveCount(1);

  // 4. Marker Click Safeguard: Clicking the existing marker must select it, NOT create a second waypoint
  await markers.first().click({ force: true });
  await page.waitForTimeout(200);
  await expect(markers).toHaveCount(1);
  await expect(markers.first()).toHaveClass(/selected/);

  // 5. Escape Key Safeguard: Pressing Escape disarms placement mode
  await page.keyboard.press("Escape");
  await expect(banner).toHaveCount(0);
});

test("mobile touch safeguards at 390px: touch tap places waypoint within footprint", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/?region=gale");

  const mapCanvas = page.locator(".map-canvas");
  await expect(mapCanvas).toBeVisible();

  // Open planning panel
  const handle = page.getByRole("button", { name: /^Plan ·/ });
  if (await handle.isVisible()) await handle.click();

  await page.getByRole("button", { name: /^Plan/ }).click();
  await page.getByRole("tab", { name: /Surface Waypoints/ }).click();

  const placeBtn = page.getByTestId("toggle-map-placement-btn");
  await expect(placeBtn).toBeVisible();
  await placeBtn.click();

  const banner = page.getByTestId("placement-banner");
  await expect(banner).toBeVisible();

  const canvas = page.locator(".map-canvas canvas");
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (!canvasBox) return;

  const markers = page.getByTestId("map-waypoint-marker");
  await expect(markers).toHaveCount(0);

  // Touch tap on mobile canvas places 1 waypoint
  const startX = canvasBox.x + canvasBox.width * 0.5;
  const startY = canvasBox.y + canvasBox.height * 0.5 - 25;
  await page.touchscreen.tap(startX, startY);
  await expect(markers).toHaveCount(1);
  await context.close();
});
