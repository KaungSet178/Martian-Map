import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  WaypointItinerary,
  formatDistance,
  formatBearing,
  formatCoordinates,
  roleDisplay,
} from "../components/mission/waypoint-itinerary.js";
import { WaypointEditor } from "../components/mission/waypoint-editor.js";
import {
  createWaypoint,
  createWaypointPlan,
  addWaypoint,
  type WaypointPlan,
  type MarsWaypoint,
  GEOMETRIC_TRAJECTORY_LABEL,
} from "../lib/mission/waypoint-planning.js";

// ---------------------------------------------------------------------------
// Synthetic Test Fixtures (Identified as test-only)
// ---------------------------------------------------------------------------

function createTestPlan(): WaypointPlan {
  const base = createWaypoint({
    id: "test-base-1",
    coordinates: { latitude: -5.4, longitude_east: 137.8 },
    role: "base",
    label: "Gale Base Alpha",
    provenance: "user_planning_input",
    notes: "Hypothetical landing habitat for testing",
  });

  const stop1 = createWaypoint({
    id: "test-science-1",
    coordinates: { latitude: -5.42, longitude_east: 137.83 },
    role: "science_stop",
    label: "Pahrump Hills Sample Site",
    target_id: "target-pahrump-hills",
    provenance: "verified_science_target",
  });

  const stop2 = createWaypoint({
    id: "test-intermediate-1",
    coordinates: { latitude: -5.44, longitude_east: 137.85 },
    role: "intermediate",
    label: "Vera Rubin Turn Point",
    provenance: "user_planning_input",
  });

  let plan = createWaypointPlan({
    id: "plan-test-01",
    name: "Gale Excursion Test Plan",
    region_id: "gale",
    mode: "round_trip",
  });

  plan = addWaypoint(plan, base);
  plan = addWaypoint(plan, stop1);
  plan = addWaypoint(plan, stop2);
  return plan;
}

// ---------------------------------------------------------------------------
// Test Traversal Helper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findInTree(tree: any, predicate: (node: any) => boolean): any {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  if (!tree.props || !tree.props.children) return null;
  const children = React.Children.toArray(tree.props.children);
  for (const child of children) {
    const found = findInTree(child, predicate);
    if (found) return found;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Unit & Component Test Suites
// ---------------------------------------------------------------------------

describe("Waypoint Formatting Helpers", () => {
  test("formatDistance correctly formats sub-kilometer and multi-kilometer metrics", () => {
    assert.equal(formatDistance(0), "0 m");
    assert.equal(formatDistance(450.24), "450.2 m");
    assert.equal(formatDistance(999.9), "999.9 m");
    assert.equal(formatDistance(1000), "1.00 km (1,000 m)");
    assert.equal(formatDistance(12450.7), "12.45 km (12,451 m)");
    assert.equal(formatDistance(-10), "0 m");
  });

  test("formatBearing normalizes degrees to 3-digit zero-padded representations", () => {
    assert.equal(formatBearing(0), "000°");
    assert.equal(formatBearing(42), "042°");
    assert.equal(formatBearing(180), "180°");
    assert.equal(formatBearing(359.8), "000°"); // rounds to 360 -> 000
    assert.equal(formatBearing(270), "270°");
    assert.equal(formatBearing(NaN), "N/A");
  });

  test("formatCoordinates formats planetocentric lat and East lon with signs", () => {
    assert.equal(
      formatCoordinates({ latitude: -5.4, longitude_east: 137.8 }),
      "-5.4000°, 137.8000° E",
    );
    assert.equal(
      formatCoordinates({ latitude: 18.38, longitude_east: 77.58 }),
      "+18.3800°, 77.5800° E",
    );
    assert.equal(
      formatCoordinates({ latitude: 0, longitude_east: 0 }),
      "+0.0000°, 0.0000° E",
    );
  });

  test("roleDisplay returns human-readable labels and icons", () => {
    assert.equal(roleDisplay("base").label, "Origin Base Camp");
    assert.equal(roleDisplay("science_stop").label, "Science Investigation Stop");
    assert.equal(roleDisplay("intermediate").label, "Intermediate Turn Point");
    assert.equal(roleDisplay("destination").label, "Outbound Destination Terminus");
    assert.equal(roleDisplay("recovery_endpoint").label, "Pre-Planned Recovery Site");
  });
});

describe("WaypointItinerary Component Rendering", () => {
  test("renders empty state when plan has 0 waypoints", () => {
    const emptyPlan = createWaypointPlan({
      id: "empty-plan",
      name: "Empty Plan",
      mode: "round_trip",
    });

    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan: emptyPlan }),
    );

    assert.match(html, /No surface waypoints established/);
    assert.match(html, /data-testid="empty-itinerary"/);
  });

  test("renders ordered waypoint list with correct numbers, titles, and coordinates", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    // List structure
    assert.match(html, /data-testid="waypoint-itinerary"/);
    assert.match(html, /data-testid="waypoint-item-test-base-1"/);
    assert.match(html, /data-testid="waypoint-item-test-science-1"/);
    assert.match(html, /data-testid="waypoint-item-test-intermediate-1"/);

    // Stop labels
    assert.match(html, /Gale Base Alpha/);
    assert.match(html, /Pahrump Hills Sample Site/);
    assert.match(html, /Vera Rubin Turn Point/);

    // Formatted coordinates
    assert.match(html, /-5.4000°, 137.8000° E/);
    assert.match(html, /-5.4200°, 137.8300° E/);

    // Catalog ID display
    assert.match(html, /target-pahrump-hills/);
  });

  test("renders non-color-dependent provenance badges", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    // Verified NASA Target badge
    assert.match(html, /Observed · NASA Target/);
    // User planning input badge
    assert.match(html, /Scenario · User Waypoint/);
  });

  test("renders inter-segment leg distances and bearings", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    // Inter-segment leg cards
    assert.match(html, /data-testid="leg-connector-0"/);
    assert.match(html, /data-testid="leg-connector-1"/);
    assert.match(html, /Great-circle arc/);
    assert.match(html, /Bearing/);
  });

  test("renders closing return leg card in round-trip mode", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    assert.match(html, /data-testid="return-closure-leg"/);
    assert.match(html, /Return Leg to Base Camp \(Gale Base Alpha\)/);
    assert.match(html, /Closing loop/);
  });

  test("does NOT render return leg card in one-way mode", () => {
    let plan = createTestPlan();
    plan = { ...plan, mode: "one_way" };

    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    assert.doesNotMatch(html, /data-testid="return-closure-leg"/);
    assert.doesNotMatch(html, /Closing loop/);
  });

  test("renders distance summary with additive breakdown and mandatory scientific disclaimer", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointItinerary, { plan }),
    );

    assert.match(html, /data-testid="distance-summary"/);
    assert.match(html, /data-testid="outbound-distance"/);
    assert.match(html, /data-testid="return-distance"/);
    assert.match(html, /data-testid="total-distance"/);

    // Scientific label and non-assumptions
    assert.ok(html.includes(GEOMETRIC_TRAJECTORY_LABEL));
    assert.match(html, /Horizontal great-circle arc distance only/);
    assert.match(html, /Does not account for terrain slopes/);

    // Strict prohibition of forbidden terminology
    assert.doesNotMatch(html, /Safe route/i);
    assert.doesNotMatch(html, /Hazard-free/i);
    assert.doesNotMatch(html, /Optimized route/i);
    assert.doesNotMatch(html, /NASA-certified/i);
  });
});

describe("WaypointEditor Component Rendering & Validation", () => {
  test("renders plan title, mode selector, and origin status", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointEditor, {
        plan,
        regionName: "Gale Crater",
      }),
    );

    assert.match(html, /data-testid="waypoint-editor"/);
    assert.match(html, /Gale Excursion Test Plan/);
    assert.match(html, /Gale Crater/);
    assert.match(html, /Round trip to base/);
    assert.match(html, /One way traverse/);
    assert.match(html, /data-testid="origin-status"/);
    assert.match(html, /Gale Base Alpha/);
  });

  test("renders validation error notice when one-way mode is missing required destination and recovery note", () => {
    let plan = createTestPlan();
    // In one-way mode, last stop is intermediate (not destination) and recovery_assumption is empty
    plan = {
      ...plan,
      mode: "one_way",
      recovery_assumption: undefined,
    };

    const html = renderToStaticMarkup(
      React.createElement(WaypointEditor, { plan }),
    );

    assert.match(html, /data-testid="validation-errors"/);
    assert.match(html, /Plan validation issues/);
    assert.match(html, /recovery assumption/i);
    assert.match(html, /destination.*recovery_endpoint/i);
    assert.match(html, /data-testid="one-way-section"/);
  });

  test("renders advisory warnings when origin is not marked role=base", () => {
    let plan = createTestPlan();
    // Change first stop role to intermediate
    const nonBaseFirst = { ...plan.waypoints[0], role: "intermediate" as const };
    plan = {
      ...plan,
      waypoints: [nonBaseFirst, ...plan.waypoints.slice(1)],
    };

    const html = renderToStaticMarkup(
      React.createElement(WaypointEditor, { plan }),
    );

    assert.match(html, /data-testid="validation-warnings"/);
    assert.match(html, /first waypoint.*must have role.*base/i);
  });

  test("renders interactive placement button when onRequestMapPlacement is provided", () => {
    const plan = createTestPlan();
    const html = renderToStaticMarkup(
      React.createElement(WaypointEditor, {
        plan,
        onRequestMapPlacement: () => {},
        isPlacingOnMap: true,
      }),
    );

    assert.match(html, /data-testid="toggle-map-placement-btn"/);
    assert.match(html, /Cancel map placement/);
    assert.match(html, /active-placement/);
  });
});

describe("Waypoint Component Callback Interactions", () => {
  test("triggers onWaypointMove when move buttons are clicked", () => {
    const plan = createTestPlan();
    let movedId = "";
    let movedDelta = 0;

    const tree = WaypointItinerary({
      plan,
      onWaypointMove: (id, delta) => {
        movedId = id;
        movedDelta = delta;
      },
    });

    const moveUpBtn = findInTree(
      tree,
      (node) => node.props?.["aria-label"] === "Move Pahrump Hills Sample Site up",
    );
    assert.ok(moveUpBtn, "Move up button for stop 2 should exist");
    moveUpBtn.props.onClick();
    assert.equal(movedId, "test-science-1");
    assert.equal(movedDelta, -1);

    const moveDownBtn = findInTree(
      tree,
      (node) => node.props?.["aria-label"] === "Move Pahrump Hills Sample Site down",
    );
    assert.ok(moveDownBtn, "Move down button for stop 2 should exist");
    moveDownBtn.props.onClick();
    assert.equal(movedId, "test-science-1");
    assert.equal(movedDelta, 1);
  });

  test("triggers onWaypointRemove when delete button is clicked", () => {
    const plan = createTestPlan();
    let removedId = "";

    const tree = WaypointItinerary({
      plan,
      onWaypointRemove: (id) => {
        removedId = id;
      },
    });

    const deleteBtn = findInTree(
      tree,
      (node) => node.props?.["aria-label"] === "Remove Gale Base Alpha from itinerary",
    );
    assert.ok(deleteBtn, "Delete button for base should exist");
    deleteBtn.props.onClick();
    assert.equal(removedId, "test-base-1");
  });

  test("triggers onSetOrigin when Make Base button is clicked on a non-origin waypoint", () => {
    const plan = createTestPlan();
    let promotedWaypoint: MarsWaypoint | null = null;

    const tree = WaypointItinerary({
      plan,
      onSetOrigin: (wp) => {
        promotedWaypoint = wp;
      },
    });

    const makeBaseBtn = findInTree(
      tree,
      (node) =>
        node.props?.["aria-label"] ===
        "Promote Pahrump Hills Sample Site to origin base camp",
    );
    assert.ok(makeBaseBtn, "Make Base button should exist for non-origin stop");
    makeBaseBtn.props.onClick();
    const wp = promotedWaypoint as MarsWaypoint | null;
    assert.equal(wp?.id, "test-science-1");
  });

  test("triggers onModeChange in WaypointEditor when direction radio changes", () => {
    const plan = createTestPlan();
    let targetMode = "";

    const tree = WaypointEditor({
      plan,
      onModeChange: (mode) => {
        targetMode = mode;
      },
    });

    const oneWayRadio = findInTree(
      tree,
      (node) => node.type === "input" && node.props?.value === "one_way",
    );
    assert.ok(oneWayRadio, "One-way radio input should exist");
    oneWayRadio.props.onChange();
    assert.equal(targetMode, "one_way");
  });

  test("triggers onPlanNameChange in WaypointEditor when plan title is edited", () => {
    const plan = createTestPlan();
    let newName = "";

    const tree = WaypointEditor({
      plan,
      onPlanNameChange: (val) => {
        newName = val;
      },
    });

    const nameInput = findInTree(
      tree,
      (node) => node.props?.id === "waypoint-plan-name",
    );
    assert.ok(nameInput, "Plan name input should exist");
    nameInput.props.onChange({ target: { value: "Updated Excursion Name" } });
    assert.equal(newName, "Updated Excursion Name");
  });

  test("triggers onRecoveryAssumptionChange in WaypointEditor in one-way mode", () => {
    let plan = createTestPlan();
    plan = { ...plan, mode: "one_way" };
    let capturedAssumption = "";

    const tree = WaypointEditor({
      plan,
      onRecoveryAssumptionChange: (val) => {
        capturedAssumption = val;
      },
    });

    const textarea = findInTree(
      tree,
      (node) => node.props?.id === "recovery-assumption",
    );
    assert.ok(textarea, "Recovery assumption textarea should exist in one-way mode");
    textarea.props.onChange({
      target: { value: "Rover extraction team rendezvous at Sol 450" },
    });
    assert.equal(capturedAssumption, "Rover extraction team rendezvous at Sol 450");
  });
});
