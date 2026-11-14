/**
 * Automated test suite for M4.2 Deterministic Mission Resource Budgeting Engine.
 *
 * Verifies calculation accuracy, reserve compliance, boundary conditions,
 * missing-input handling, timeline integrity, numerical overflow protection,
 * and immutability.
 *
 * NOTE ON TEST FIXTURES:
 * All numerical values used in these tests are purely HYPOTHETICAL planning
 * fixtures and do NOT represent certified NASA spacesuit (EMU/xEMU) specifications.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateResourceBudget,
  formatEnergyWattHours,
  formatMassGrams,
  formatPowerWatts,
  formatRateGramsPerHour,
  RESOURCE_BUDGET_DISCLAIMER,
  type OxygenBudgetAssumptions,
  type BatteryBudgetAssumptions,
  type ResourceBudgetInput,
} from "../lib/mission/resource-budget";
import {
  calculateMissionTimeline,
  type MissionTimelineResult,
  type TimelineRouteInput,
} from "../lib/mission/timeline";
import {
  createWaypoint,
  type MarsWaypoint,
} from "../lib/mission/waypoint-planning";

// ---------------------------------------------------------------------------
// Test Fixtures & Helpers
// ---------------------------------------------------------------------------

function makeWp(
  id: string,
  latitude: number,
  longitude_east: number,
  role: MarsWaypoint["role"] = "intermediate",
  label?: string,
): MarsWaypoint {
  return createWaypoint({
    id,
    coordinates: { latitude, longitude_east },
    role,
    label: label ?? id,
  });
}

/**
 * Creates a synthetic MissionTimelineResult for controlled unit testing.
 */
function createSyntheticTimeline(overrides: Partial<MissionTimelineResult> = {}): MissionTimelineResult {
  return {
    status: "COMPLETE_SCENARIO",
    assumptions: {
      walking_speed_m_per_hour: 3600, // 1 m/s = 3600 m/h
      start_elapsed_seconds: 0,
      default_science_stop_duration_seconds: 1800,
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 1800,
      final_destination_duration_seconds: 1800,
    },
    timeline: [
      {
        step_index: 0,
        waypoint_id: "wp-base",
        role: "base",
        is_return: false,
        arrival_elapsed_seconds: 0,
        departure_elapsed_seconds: 1800,
        stop_duration_seconds: 1800,
      },
      {
        step_index: 1,
        waypoint_id: "wp-science",
        role: "science_stop",
        is_return: false,
        arrival_elapsed_seconds: 5400, // 1800 + 3600 (1 hr travel)
        departure_elapsed_seconds: 7200, // 5400 + 1800 (0.5 hr stop)
        stop_duration_seconds: 1800,
      },
      {
        step_index: 2,
        waypoint_id: "wp-dest",
        role: "destination",
        is_return: false,
        arrival_elapsed_seconds: 10800, // 7200 + 3600 (1 hr travel)
        departure_elapsed_seconds: 12600, // 10800 + 1800 (0.5 hr stop)
        stop_duration_seconds: 1800,
      },
    ],
    segments: [
      {
        segment_index: 0,
        from_waypoint_id: "wp-base",
        to_waypoint_id: "wp-science",
        distance_metres: 3600,
        travel_duration_seconds: 3600, // 1.0 hour
        status: "SUPPORTED",
        is_return_segment: false,
      },
      {
        segment_index: 1,
        from_waypoint_id: "wp-science",
        to_waypoint_id: "wp-dest",
        distance_metres: 3600,
        travel_duration_seconds: 3600, // 1.0 hour
        status: "SUPPORTED",
        is_return_segment: false,
      },
    ],
    total_distance_metres: 7200,
    total_travel_seconds: 7200, // 2.0 hours
    total_stop_seconds: 5400,   // 1.5 hours (3 stops * 1800s)
    total_mission_seconds: 12600, // 3.5 hours
    scientific_disclaimer: "Mock disclaimer",
    warnings: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Group A: Basic Resource Calculations
// ---------------------------------------------------------------------------

describe("M4.2 Group A: Basic Resource Calculations", () => {
  const timeline = createSyntheticTimeline();

  // Travel: 2.0 hours, Stop: 1.5 hours
  const hypotheticalOxygen: OxygenBudgetAssumptions = {
    capacity_g: 1000,
    travel_rate_g_per_hour: 60, // 2.0 h * 60 = 120 g
    stop_rate_g_per_hour: 40,   // 1.5 h * 40 = 60 g
    reserve_g: 200,
  };

  const hypotheticalBattery: BatteryBudgetAssumptions = {
    capacity_wh: 500,
    travel_power_w: 100, // 2.0 h * 100 W = 200 Wh
    stop_power_w: 50,    // 1.5 h * 50 W = 75 Wh
    reserve_wh: 100,
  };

  it("1. calculates correct oxygen consumption during travel", () => {
    const res = calculateResourceBudget({ timeline, oxygen: hypotheticalOxygen });
    assert.equal(res.oxygen.travel_used_g, 120);
  });

  it("2. calculates correct oxygen consumption during stops", () => {
    const res = calculateResourceBudget({ timeline, oxygen: hypotheticalOxygen });
    assert.equal(res.oxygen.stationary_used_g, 60);
  });

  it("3. calculates correct battery energy consumption during travel", () => {
    const res = calculateResourceBudget({ timeline, battery: hypotheticalBattery });
    assert.equal(res.battery.travel_used_wh, 200);
  });

  it("4. calculates correct battery energy consumption during stops", () => {
    const res = calculateResourceBudget({ timeline, battery: hypotheticalBattery });
    assert.equal(res.battery.stationary_used_wh, 75);
  });

  it("5. calculates correct combined consumption totals", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: hypotheticalOxygen,
      battery: hypotheticalBattery,
    });
    assert.equal(res.oxygen.total_used_g, 180); // 120 + 60
    assert.equal(res.battery.total_used_wh, 275); // 200 + 75
  });

  it("6. calculates correct remaining resource values", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: hypotheticalOxygen,
      battery: hypotheticalBattery,
    });
    assert.equal(res.oxygen.remaining_g, 820); // 1000 - 180
    assert.equal(res.battery.remaining_wh, 225); // 500 - 275
  });

  it("7. calculates correct reserve subtraction", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: hypotheticalOxygen,
      battery: hypotheticalBattery,
    });
    assert.equal(res.oxygen.remaining_after_reserve_g, 620); // 820 - 200
    assert.equal(res.battery.remaining_after_reserve_wh, 125); // 225 - 100
    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
  });
});

// ---------------------------------------------------------------------------
// Group B: Boundary Conditions
// ---------------------------------------------------------------------------

describe("M4.2 Group B: Boundary Conditions", () => {
  const timeline = createSyntheticTimeline(); // Travel: 2h, Stop: 1.5h

  it("8. verifies exactly sufficient oxygen capacity and reserve", () => {
    // Total used = 180 g. If capacity = 280 g and reserve = 100 g -> remaining_after_reserve = 0
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 280,
        travel_rate_g_per_hour: 60, // 120 g
        stop_rate_g_per_hour: 40,   // 60 g
        reserve_g: 100,
      },
    });
    assert.equal(res.oxygen.total_used_g, 180);
    assert.equal(res.oxygen.remaining_g, 100);
    assert.equal(res.oxygen.remaining_after_reserve_g, 0);
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
  });

  it("9. verifies exactly sufficient battery capacity and reserve", () => {
    // Total used = 275 Wh. If capacity = 375 Wh and reserve = 100 Wh -> remaining_after_reserve = 0
    const res = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: 375,
        travel_power_w: 100, // 200 Wh
        stop_power_w: 50,    // 75 Wh
        reserve_wh: 100,
      },
    });
    assert.equal(res.battery.total_used_wh, 275);
    assert.equal(res.battery.remaining_wh, 100);
    assert.equal(res.battery.remaining_after_reserve_wh, 0);
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
  });

  it("10. identifies when oxygen budget is exceeded", () => {
    // Total used = 180 g. Capacity = 200 g, reserve = 50 g.
    // Remaining = 20 g, after reserve = -30 g (reserve infringed!)
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 200,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 50,
      },
    });
    assert.equal(res.oxygen.remaining_g, 20);
    assert.equal(res.oxygen.remaining_after_reserve_g, -30);
    assert.equal(res.oxygen.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.equal(res.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.ok(res.warnings.some((w) => w.includes("reserve (50 g) is infringed")));
  });

  it("11. identifies when battery budget is exceeded", () => {
    // Total used = 275 Wh. Capacity = 250 Wh (capacity exceeded before reserve!)
    const res = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: 250,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(res.battery.remaining_wh, -25);
    assert.equal(res.battery.remaining_after_reserve_wh, -75);
    assert.equal(res.battery.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.equal(res.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.ok(res.warnings.some((w) => w.includes("capacity (250 Wh) is exceeded")));
  });

  it("12. identifies when both oxygen and battery budgets are exceeded", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 100, // used 180 -> remaining -80
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 50,
      },
      battery: {
        capacity_wh: 200, // used 275 -> remaining -75
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(res.oxygen.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.equal(res.battery.status, "EXCEEDS_CONFIGURED_BUDGET");
    assert.equal(res.status, "EXCEEDS_CONFIGURED_BUDGET");
  });

  it("13. handles zero consumption rates cleanly", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 500,
        travel_rate_g_per_hour: 0,
        stop_rate_g_per_hour: 0,
        reserve_g: 100,
      },
      battery: {
        capacity_wh: 300,
        travel_power_w: 0,
        stop_power_w: 0,
        reserve_wh: 50,
      },
    });
    assert.equal(res.oxygen.total_used_g, 0);
    assert.equal(res.oxygen.remaining_g, 500);
    assert.equal(res.oxygen.remaining_after_reserve_g, 400);
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");

    assert.equal(res.battery.total_used_wh, 0);
    assert.equal(res.battery.remaining_wh, 300);
    assert.equal(res.battery.remaining_after_reserve_wh, 250);
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
  });

  it("14. handles zero reserves cleanly", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 200,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 0,
      },
      battery: {
        capacity_wh: 300,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 0,
      },
    });
    assert.equal(res.oxygen.remaining_after_reserve_g, 20); // 200 - 180 - 0
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.remaining_after_reserve_wh, 25); // 300 - 275 - 0
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
  });

  it("15. calculates accurate fractional rates and durations", () => {
    // Travel: 1800 s (0.5 h), Stop: 900 s (0.25 h)
    const customTimeline = createSyntheticTimeline({
      total_travel_seconds: 1800,
      total_stop_seconds: 900,
    });
    const res = calculateResourceBudget({
      timeline: customTimeline,
      oxygen: {
        capacity_g: 100,
        travel_rate_g_per_hour: 45.5, // 0.5 * 45.5 = 22.75 g
        stop_rate_g_per_hour: 30.2,   // 0.25 * 30.2 = 7.55 g
        reserve_g: 20,
      },
    });
    assert.equal(res.oxygen.travel_used_g, 22.75);
    assert.equal(res.oxygen.stationary_used_g, 7.55);
    assert.ok(Math.abs((res.oxygen.total_used_g ?? 0) - 30.3) < 1e-9);
    assert.ok(Math.abs((res.oxygen.remaining_g ?? 0) - 69.7) < 1e-9);
    assert.ok(Math.abs((res.oxygen.remaining_after_reserve_g ?? 0) - 49.7) < 1e-9);
  });
});

// ---------------------------------------------------------------------------
// Group C: Missing Inputs
// ---------------------------------------------------------------------------

describe("M4.2 Group C: Missing Inputs", () => {
  const timeline = createSyntheticTimeline();

  it("16. leaves remaining amounts null when oxygen capacity is missing", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: null,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(res.oxygen.total_used_g, 180);
    assert.equal(res.oxygen.remaining_g, null);
    assert.equal(res.oxygen.remaining_after_reserve_g, null);
    assert.equal(res.oxygen.status, "INSUFFICIENT_DATA");
    assert.ok(res.warnings.some((w) => w.includes("Oxygen capacity was not configured")));
  });

  it("17. leaves total oxygen usage null when oxygen rate is missing", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: null, // missing rate
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(res.oxygen.travel_used_g, null);
    assert.equal(res.oxygen.stationary_used_g, 60);
    assert.equal(res.oxygen.total_used_g, null);
    assert.equal(res.oxygen.remaining_g, null);
    assert.equal(res.oxygen.status, "INSUFFICIENT_DATA");
  });

  it("18. leaves remaining battery null when battery capacity is missing", () => {
    const res = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: null,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(res.battery.total_used_wh, 275);
    assert.equal(res.battery.remaining_wh, null);
    assert.equal(res.battery.remaining_after_reserve_wh, null);
    assert.equal(res.battery.status, "INSUFFICIENT_DATA");
  });

  it("19. leaves total battery usage null when battery power is missing", () => {
    const res = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: 500,
        travel_power_w: null,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(res.battery.travel_used_wh, null);
    assert.equal(res.battery.stationary_used_wh, 75);
    assert.equal(res.battery.total_used_wh, null);
    assert.equal(res.battery.remaining_wh, null);
    assert.equal(res.battery.status, "INSUFFICIENT_DATA");
  });

  it("20. leaves remaining after reserve null when reserve is missing", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: null,
      },
    });
    assert.equal(res.oxygen.total_used_g, 180);
    assert.equal(res.oxygen.remaining_g, 820);
    assert.equal(res.oxygen.remaining_after_reserve_g, null);
    assert.equal(res.oxygen.status, "INSUFFICIENT_DATA");
    assert.ok(res.warnings.some((w) => w.includes("Oxygen reserve was not configured")));
  });

  it("21. preserves valid oxygen assessment when battery is unknown", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
      battery: null, // battery not configured
    });
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.remaining_after_reserve_g, 720);
    assert.equal(res.battery.status, "INSUFFICIENT_DATA");
    assert.equal(res.battery.total_used_wh, null);
    assert.equal(res.status, "INSUFFICIENT_DATA");
    assert.ok(res.warnings.some((w) => w.includes("Battery budget assumptions were not configured")));
  });

  it("22. preserves valid battery assessment when oxygen is unknown", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: null, // oxygen not configured
      battery: {
        capacity_wh: 500,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.remaining_after_reserve_wh, 175);
    assert.equal(res.oxygen.status, "INSUFFICIENT_DATA");
    assert.equal(res.oxygen.total_used_g, null);
    assert.equal(res.status, "INSUFFICIENT_DATA");
    assert.ok(res.warnings.some((w) => w.includes("Oxygen budget assumptions were not configured")));
  });
});

// ---------------------------------------------------------------------------
// Group D: Timeline Integrity
// ---------------------------------------------------------------------------

describe("M4.2 Group D: Timeline Integrity", () => {
  it("23. calculates full resource budget for a complete one-way mission", () => {
    const wBase = makeWp("wBase", 0, 100, "base");
    const wDest = makeWp("wDest", 0, 100.1, "destination");
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [wBase, wDest],
    };

    const timeline = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 3000,
      base_preparation_duration_seconds: 1800,
      final_destination_duration_seconds: 1800,
    });
    assert.equal(timeline.status, "COMPLETE_SCENARIO");

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 30,
        reserve_g: 100,
      },
      battery: {
        capacity_wh: 1000,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 100,
      },
    });

    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.stages.length, 3); // base stop + leg 0 + dest stop
    assert.equal(res.stages[0].stage_type, "STATIONARY");
    assert.equal(res.stages[1].stage_type, "TRAVEL");
    assert.equal(res.stages[2].stage_type, "STATIONARY");
  });

  it("24. calculates full resource budget for a complete round-trip mission", () => {
    const wBase = makeWp("wBase", 0, 100, "base");
    const wScience = makeWp("wScience", 0, 100.1, "science_stop");
    const route: TimelineRouteInput = {
      mode: "round_trip",
      waypoints: [wBase, wScience],
    };

    const timeline = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 3000,
      base_preparation_duration_seconds: 1800,
      default_science_stop_duration_seconds: 1800,
      final_destination_duration_seconds: 1800,
    });
    assert.equal(timeline.status, "COMPLETE_SCENARIO");
    assert.equal(timeline.segments.length, 2); // Outbound + return

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 2000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 200,
      },
      battery: {
        capacity_wh: 2000,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 200,
      },
    });

    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
    // Stages: Stop 0 (base prep) -> Travel 0 (outbound) -> Stop 1 (science) -> Travel 1 (return) -> Stop 2 (post-return base)
    assert.equal(res.stages.length, 5);
    assert.equal(res.stages[3].stage_type, "TRAVEL");
    assert.equal(res.stages[3].reference_id, "wScience->wBase");
    assert.equal(res.stages[4].stage_type, "STATIONARY");
    assert.equal(res.stages[4].reference_id, "wBase");
  });

  it("25. marks round-trip with missing return leg as INSUFFICIENT_DATA with null totals", () => {
    const wBase = makeWp("wBase", 0, 100, "base");
    const wScience = makeWp("wScience", 0, 100.1, "science_stop");
    // Only outbound segment supplied for a round-trip
    const route: TimelineRouteInput = {
      mode: "round_trip",
      waypoints: [wBase, wScience],
      segments: [
        { from_waypoint_id: "wBase", to_waypoint_id: "wScience", distance_metres: 2000, status: "SUPPORTED" },
      ],
    };

    const timeline = calculateMissionTimeline(route, { walking_speed_m_per_hour: 2000 });
    assert.equal(timeline.status, "INCOMPLETE_SCENARIO");

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });

    assert.equal(res.status, "INSUFFICIENT_DATA");
    assert.equal(res.oxygen.total_used_g, null);
    assert.equal(res.oxygen.remaining_g, null);
    assert.equal(res.oxygen.status, "INSUFFICIENT_DATA");
    assert.ok(res.warnings.some((w) => w.includes("Mission timeline is incomplete")));
  });

  it("26. truncates stage generation before an unsupported travel segment", () => {
    const timeline = createSyntheticTimeline({
      status: "INCOMPLETE_SCENARIO",
      segments: [
        {
          segment_index: 0,
          from_waypoint_id: "wp-base",
          to_waypoint_id: "wp-science",
          distance_metres: 3600,
          travel_duration_seconds: 3600,
          status: "SUPPORTED",
          is_return_segment: false,
        },
        {
          segment_index: 1,
          from_waypoint_id: "wp-science",
          to_waypoint_id: "wp-dest",
          distance_metres: null,
          travel_duration_seconds: null,
          status: "UNSUPPORTED",
          is_return_segment: false,
        },
      ],
      timeline: [
        {
          step_index: 0,
          waypoint_id: "wp-base",
          arrival_elapsed_seconds: 0,
          departure_elapsed_seconds: 1800,
          stop_duration_seconds: 1800,
        },
        {
          step_index: 1,
          waypoint_id: "wp-science",
          arrival_elapsed_seconds: 5400,
          departure_elapsed_seconds: 7200,
          stop_duration_seconds: 1800,
        },
        {
          step_index: 2,
          waypoint_id: "wp-dest",
          arrival_elapsed_seconds: null, // Indeterminate due to unsupported leg
          departure_elapsed_seconds: null,
          stop_duration_seconds: 1800,
        },
      ],
      total_travel_seconds: null,
      total_mission_seconds: null,
    });

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });

    assert.equal(res.status, "INSUFFICIENT_DATA");
    // Only stages up to the break are emitted: Stop 0 -> Travel 0 -> Stop 1
    assert.equal(res.stages.length, 3);
    assert.equal(res.stages[0].reference_id, "wp-base");
    assert.equal(res.stages[1].reference_id, "wp-base->wp-science");
    assert.equal(res.stages[2].reference_id, "wp-science");
    // wp-dest is NOT included
    assert.ok(!res.stages.some((s) => s.reference_id === "wp-dest"));
  });

  it("27. evaluates invalid timeline as INVALID_INPUT", () => {
    const invalidTimeline: MissionTimelineResult = {
      status: "INVALID_INPUT",
      assumptions: {
        walking_speed_m_per_hour: 1000,
        start_elapsed_seconds: 0,
        default_science_stop_duration_seconds: 0,
        waypoint_stop_durations_seconds: {},
        base_preparation_duration_seconds: 0,
        final_destination_duration_seconds: 0,
      },
      timeline: [],
      segments: [],
      total_distance_metres: null,
      total_travel_seconds: null,
      total_stop_seconds: 0,
      total_mission_seconds: null,
      scientific_disclaimer: "Mock disclaimer",
      warnings: ["Walking speed was invalid"],
    };

    const res = calculateResourceBudget({
      timeline: invalidTimeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });

    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.oxygen.status, "INVALID_INPUT");
    assert.equal(res.battery.status, "INVALID_INPUT");
    assert.equal(res.stages.length, 0);
    assert.ok(res.warnings.some((w) => w.includes("invalid mission timeline")));
  });

  it("28. preserves partial timeline stage consumption while full totals remain null", () => {
    const timeline = createSyntheticTimeline({
      status: "INCOMPLETE_SCENARIO",
      total_travel_seconds: null,
      total_mission_seconds: null,
    });

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });

    assert.equal(res.status, "INSUFFICIENT_DATA");
    assert.equal(res.oxygen.total_used_g, null);
    assert.equal(res.oxygen.remaining_g, null);
    // Verified prefix stages have valid stage consumption
    assert.ok(res.stages.length > 0);
    assert.equal(res.stages[0].oxygen_used_g, 20); // 0.5 h * 40 g/h = 20 g
    assert.equal(res.stages[1].oxygen_used_g, 60); // 1.0 h * 60 g/h = 60 g
  });

  it("29. accounts for return leg distance and travel time in travel consumption", () => {
    const wBase = makeWp("wBase", 0, 100, "base");
    const wFar = makeWp("wFar", 0, 100.2, "science_stop");
    const route: TimelineRouteInput = {
      mode: "round_trip",
      waypoints: [wBase, wFar],
    };

    const timeline = calculateMissionTimeline(route, { walking_speed_m_per_hour: 3000 });
    assert.equal(timeline.segments.length, 2);

    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 2000,
        travel_rate_g_per_hour: 100,
        stop_rate_g_per_hour: 50,
        reserve_g: 200,
      },
    });

    // Total travel seconds covers both outbound and return
    const expectedTravelO2 = ((timeline.total_travel_seconds ?? 0) / 3600) * 100;
    assert.equal(res.oxygen.travel_used_g, expectedTravelO2);
    // Both legs appear in stages
    const travelStages = res.stages.filter((s) => s.stage_type === "TRAVEL");
    assert.equal(travelStages.length, 2);
  });

  it("30. ensures stationary time is counted once per stop without double-counting", () => {
    const timeline = createSyntheticTimeline();
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });

    const sumStationaryStageO2 = res.stages
      .filter((s) => s.stage_type === "STATIONARY")
      .reduce((sum, s) => sum + (s.oxygen_used_g ?? 0), 0);

    assert.equal(res.oxygen.stationary_used_g, sumStationaryStageO2);
  });
});

// ---------------------------------------------------------------------------
// Group E: Numerical Protection
// ---------------------------------------------------------------------------

describe("M4.2 Group E: Numerical Protection", () => {
  const timeline = createSyntheticTimeline();

  it("31. rejects negative oxygen capacity as INVALID_INPUT", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: -500,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.oxygen.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("cannot be negative")));
  });

  it("32. rejects negative reserve as INVALID_INPUT", () => {
    const res = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: 500,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: -50,
      },
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.battery.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("cannot be negative")));
  });

  it("33. rejects negative consumption rate as INVALID_INPUT", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: -10,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.oxygen.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("cannot be negative")));
  });

  it("34. rejects non-finite input (NaN, Infinity) as INVALID_INPUT", () => {
    const resNaN = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: NaN,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(resNaN.status, "INVALID_INPUT");

    const resInf = calculateResourceBudget({
      timeline,
      battery: {
        capacity_wh: Infinity,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 50,
      },
    });
    assert.equal(resInf.status, "INVALID_INPUT");
  });

  it("35. rejects arithmetic values exceeding MAX_SAFE_INTEGER as INVALID_INPUT", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: Number.MAX_SAFE_INTEGER + 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("exceeds maximum safe representable integer")));
  });

  it("36. handles very small finite rates without underflow or precision failure", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 10,
        travel_rate_g_per_hour: 0.001, // 2.0 h * 0.001 = 0.002 g
        stop_rate_g_per_hour: 0.0005,  // 1.5 h * 0.0005 = 0.00075 g
        reserve_g: 1,
      },
      battery: {
        capacity_wh: 10,
        travel_power_w: 0.001,
        stop_power_w: 0.0005,
        reserve_wh: 1,
      },
    });
    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.ok(Math.abs((res.oxygen.total_used_g ?? 0) - 0.00275) < 1e-9);
  });

  it("37. computes large but valid scenario cleanly within safe integer limits", () => {
    const largeTimeline = createSyntheticTimeline({
      total_travel_seconds: 360000, // 100 hours
      total_stop_seconds: 180000,   // 50 hours
    });
    const res = calculateResourceBudget({
      timeline: largeTimeline,
      oxygen: {
        capacity_g: 100000,
        travel_rate_g_per_hour: 500, // 50,000 g
        stop_rate_g_per_hour: 300,   // 15,000 g
        reserve_g: 20000,            // Total used = 65,000 g
      },
      battery: {
        capacity_wh: 100000,
        travel_power_w: 500,
        stop_power_w: 300,
        reserve_wh: 20000,
      },
    });
    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.total_used_g, 65000);
    assert.equal(res.oxygen.remaining_g, 35000);
    assert.equal(res.oxygen.remaining_after_reserve_g, 15000);
  });
});

// ---------------------------------------------------------------------------
// Group F: Engineering Integrity & Verification
// ---------------------------------------------------------------------------

describe("M4.2 Group F: Engineering Integrity", () => {
  const timeline = createSyntheticTimeline();

  it("38. performs calculations region-independently without regional hardcoding", () => {
    // Gale, Jezero, and Oxia coordinates produce the same mathematical budget
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
      battery: {
        capacity_wh: 500,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 100,
      },
    });
    assert.equal(res.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.battery.status, "WITHIN_CONFIGURED_BUDGET");
    assert.equal(res.oxygen.total_used_g, 180);
    assert.equal(res.battery.total_used_wh, 275);
  });

  it("39. produces deterministic identical results across repeated invocations", () => {
    const input: ResourceBudgetInput = {
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
      battery: {
        capacity_wh: 500,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 100,
      },
    };

    const res1 = calculateResourceBudget(input);
    const res2 = calculateResourceBudget(input);

    assert.deepEqual(res1, res2);
  });

  it("40. preserves input objects without mutation", () => {
    const originalO2: OxygenBudgetAssumptions = {
      capacity_g: 1000,
      travel_rate_g_per_hour: 60,
      stop_rate_g_per_hour: 40,
      reserve_g: 100,
    };
    const o2Copy = JSON.parse(JSON.stringify(originalO2));

    const originalTimeline = createSyntheticTimeline();
    const timelineCopy = JSON.parse(JSON.stringify(originalTimeline));

    calculateResourceBudget({
      timeline: originalTimeline,
      oxygen: originalO2,
    });

    assert.deepEqual(originalO2, o2Copy);
    assert.deepEqual(originalTimeline, timelineCopy);
  });

  it("41. reconciles stage consumption totals exactly with mission-wide totals", () => {
    const res = calculateResourceBudget({
      timeline,
      oxygen: {
        capacity_g: 1000,
        travel_rate_g_per_hour: 60,
        stop_rate_g_per_hour: 40,
        reserve_g: 100,
      },
      battery: {
        capacity_wh: 500,
        travel_power_w: 100,
        stop_power_w: 50,
        reserve_wh: 100,
      },
    });

    const sumStageO2 = res.stages.reduce((acc, s) => acc + (s.oxygen_used_g ?? 0), 0);
    const sumStageBat = res.stages.reduce((acc, s) => acc + (s.battery_used_wh ?? 0), 0);

    assert.ok(
      Math.abs(sumStageO2 - (res.oxygen.total_used_g ?? 0)) < 1e-6,
      `Stage O2 total ${sumStageO2} does not match mission total ${res.oxygen.total_used_g}`,
    );
    assert.ok(
      Math.abs(sumStageBat - (res.battery.total_used_wh ?? 0)) < 1e-6,
      `Stage Battery total ${sumStageBat} does not match mission total ${res.battery.total_used_wh}`,
    );
  });

  it("42. attaches mandatory scientific disclaimer to every result", () => {
    const res = calculateResourceBudget({ timeline });
    assert.equal(res.scientific_disclaimer, RESOURCE_BUDGET_DISCLAIMER);
    assert.ok(res.scientific_disclaimer.includes("Hypothetical mission resource budget estimate"));
    assert.ok(res.scientific_disclaimer.includes("Does not account for astronaut metabolic exertion"));
    assert.ok(res.scientific_disclaimer.includes("does NOT certify operational EVA safety"));
  });

  it("43. formats physical units into human-readable strings correctly", () => {
    assert.equal(formatMassGrams(1250.5), "1,250.5 g");
    assert.equal(formatMassGrams(null), "-- g");

    assert.equal(formatEnergyWattHours(450), "450 Wh");
    assert.equal(formatEnergyWattHours(null), "-- Wh");

    assert.equal(formatPowerWatts(120), "120 W");
    assert.equal(formatPowerWatts(null), "-- W");

    assert.equal(formatRateGramsPerHour(65.2), "65.2 g/h");
    assert.equal(formatRateGramsPerHour(null), "-- g/h");
  });

  it("44. handles root input errors gracefully", () => {
    // @ts-expect-error Testing runtime invalid input
    const resNull = calculateResourceBudget(null);
    assert.equal(resNull.status, "INVALID_INPUT");

    // @ts-expect-error Testing runtime invalid input
    const resEmpty = calculateResourceBudget({});
    assert.equal(resEmpty.status, "INVALID_INPUT");
  });
});
