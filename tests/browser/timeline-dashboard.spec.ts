import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  test(`timeline dashboard schedule, assumptions, and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?region=gale");

    // Open planning panel if mobile/collapsed
    const handle = page.getByRole("button", { name: /^Plan ·/ });
    if (await handle.isVisible()) await handle.click();

    // Click on Plan tab
    await page.getByRole("button", { name: /^Plan/ }).click();

    // Verify all 3 sub-view tabs exist
    const objectivesTab = page.getByTestId("tab-plan-objectives");
    const waypointsTab = page.getByTestId("tab-plan-waypoints");
    const timelineTab = page.getByTestId("tab-plan-timeline");

    await expect(objectivesTab).toBeVisible();
    await expect(waypointsTab).toBeVisible();
    await expect(timelineTab).toBeVisible();

    // Switch to Timeline Schedule
    await timelineTab.click();

    // Verify timeline dashboard container renders
    const dashboard = page.getByTestId("timeline-dashboard");
    const emptyState = page.getByTestId("timeline-dashboard-empty");

    // The default Gale mission has targets and synced waypoints or an empty plan
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText("No Waypoints Placed");
      // Switch back to Surface Waypoints to verify workflow
      const switchBtn = page.getByTestId("timeline-empty-switch-waypoints-btn");
      await expect(switchBtn).toBeVisible();
    } else {
      await expect(dashboard).toBeVisible();

      // Check Status Badge
      const statusBadge = page.getByTestId("timeline-status-badge");
      await expect(statusBadge).toBeVisible();

      // Check Planning Assumptions card
      const assumptionsCard = page.getByTestId("timeline-assumptions-card");
      await expect(assumptionsCard).toBeVisible();

      // Verify Walking Speed Input & Presets
      const speedInput = page.getByTestId("input-walking-speed");
      await expect(speedInput).toBeVisible();

      const preset1200 = page.getByTestId("preset-speed-1200");
      await expect(preset1200).toBeVisible();
      await preset1200.click();
      await expect(speedInput).toHaveValue("1200");

      // Verify Stop Dwell Input & Presets
      const stopInput = page.getByTestId("input-stop-duration");
      await expect(stopInput).toBeVisible();

      const preset30 = page.getByTestId("preset-stop-30");
      await expect(preset30).toBeVisible();
      await preset30.click();
      await expect(stopInput).toHaveValue("30");

      // Verify Summary Metrics Grid
      const summaryGrid = page.getByTestId("timeline-summary");
      await expect(summaryGrid).toBeVisible();
      await expect(page.getByTestId("card-total-duration")).toBeVisible();
      await expect(page.getByTestId("card-travel-duration")).toBeVisible();
      await expect(page.getByTestId("card-stop-duration")).toBeVisible();
      await expect(page.getByTestId("card-leg-support")).toBeVisible();

      // Verify Chronological Trajectory Schedule
      const schedule = page.getByTestId("chronological-timeline");
      await expect(schedule).toBeVisible();

      // Verify at least one stop node
      const stop0 = page.getByTestId("timeline-stop-0");
      await expect(stop0).toBeVisible();

      // Verify Scientific Disclaimer Notice
      const disclaimer = page.getByTestId("timeline-disclaimer");
      await expect(disclaimer).toBeVisible();
      await expect(disclaimer).toContainText("Scientific Planning Restriction");
      await expect(disclaimer).toContainText(
        "Hypothetical mission timeline estimates are for preliminary traverse planning only",
      );
    }

    // Capture screenshot for deliverables
    await page.screenshot({
      path: `output/playwright/timeline-dashboard-${width}.png`,
    });

    // Run Axe accessibility scan
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .disableRules(["color-contrast"]) // canvas & theme-specific map elements
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}
