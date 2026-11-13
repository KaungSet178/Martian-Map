import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [width, height] of [
  [1440, 900],
  [768, 1024],
  [390, 844],
]) {
  test(`surface waypoint planning view, validation, and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=gale");

    // Open planning panel if mobile/collapsed
    const handle = page.getByRole("button", { name: /^Plan ·/ });
    if (await handle.isVisible()) await handle.click();

    // Click on Plan tab
    await page.getByRole("button", { name: /^Plan/ }).click();

    // Verify sub-view tabs exist
    const objectivesTab = page.getByRole("tab", { name: /Science Objectives/ });
    const waypointsTab = page.getByRole("tab", { name: /Surface Waypoints/ });
    await expect(objectivesTab).toBeVisible();
    await expect(waypointsTab).toBeVisible();

    // Switch to Surface Waypoints
    await waypointsTab.click();

    // Waypoint Editor should be visible
    await expect(page.getByTestId("waypoint-editor")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Surface Waypoint Plan" }),
    ).toBeVisible();

    // Check Plan identifier / Title input
    const titleInput = page.getByLabel("Plan identifier / Title");
    await expect(titleInput).toBeVisible();

    // Check Trajectory traversal mode radios
    const roundTripRadio = page.getByRole("radio", {
      name: "Round trip to base",
    });
    const oneWayRadio = page.getByRole("radio", { name: "One way traverse" });
    await expect(roundTripRadio).toBeChecked();

    // Switch to One Way traverse
    await oneWayRadio.check();
    await expect(oneWayRadio).toBeChecked();

    // One-way requirements section should become visible
    await expect(page.getByTestId("one-way-section")).toBeVisible();
    await expect(page.getByTestId("one-way-section")).toContainText(
      "Missing required destination terminus",
    );
    await expect(page.getByLabel(/Recovery assumption/)).toBeVisible();

    // Check plan validation notice for empty plan
    await expect(page.getByTestId("validation-errors")).toBeVisible();
    await expect(page.getByTestId("validation-errors")).toContainText(
      "The plan contains no waypoints",
    );

    // Switch back to Round Trip
    await roundTripRadio.check();
    await expect(roundTripRadio).toBeChecked();
    await expect(page.getByTestId("one-way-section")).toHaveCount(0);

    // Verify empty itinerary state
    await expect(page.getByTestId("empty-itinerary")).toBeVisible();
    await expect(page.getByTestId("empty-itinerary")).toContainText(
      "No surface waypoints established",
    );

    // Verify scientific limitations and geometric trajectory notice in WaypointEditor
    await expect(page.locator(".panel-scroll")).toContainText(
      "Proposed geometric trajectory",
    );
    await expect(page.locator(".panel-scroll")).toContainText(
      "spherical Mars approximation (R = 3,396,190 m)",
    );
    await expect(page.locator(".panel-scroll")).toContainText(
      "Traversal feasibility remains Unverified",
    );

    // Capture screenshot for deliverables
    await page.screenshot({
      path: `output/playwright/waypoint-plan-${width}.png`,
    });

    // Run Axe accessibility scan
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
