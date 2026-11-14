import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  formatElapsedSeconds,
  formatMissionClock,
  formatDurationHuman,
  formatTimelineDistance,
  MissionTimelineDashboard,
} from "../components/mission/timeline-dashboard.js";
import {
  createWaypoint,
  createWaypointPlan,
  addWaypoint,
  type WaypointPlan,
} from "../lib/mission/waypoint-planning.js";
import {
  calculateMissionTimeline,
  TIMELINE_DISCLAIMER,
  type TimelineAssumptions,
} from "../lib/mission/timeline.js";
import { regions } from "../lib/regions/registry.js";
import {
  syncMissionWithWaypointPlan,
  initWaypointPlanFromMission,
} from "../lib/mission/waypoint-bridge.js";
import { newMission, parseMission } from "../lib/mission/model.js";

// ---------------------------------------------------------------------------
// Standard Test Assumptions
// ---------------------------------------------------------------------------

const DEFAULT_TEST_ASSUMPTIONS: TimelineAssumptions = {
  walking_speed_m_per_hour: 1000,
  default_science_stop_duration_seconds: 900,
  waypoint_stop_durations_seconds: {},
  base_preparation_duration_seconds: 0,
  final_destination_duration_seconds: 0,
};

// ---------------------------------------------------------------------------
// Synthetic Fixture Generators (Test-Only)
// ---------------------------------------------------------------------------

function makeSyntheticGalePlan(mode: "round_trip" | "one_way" = "round_trip"): WaypointPlan {
  const base = createWaypoint({
    id: "gale-base",
    coordinates: { latitude: -4.5895, longitude_east: 137.4417 },
    role: "base",
    label: "Bradbury Landing Base",
  });
  const stop1 = createWaypoint({
    id: "gale-stop-1",
    coordinates: { latitude: -4.605, longitude_east: 137.455 },
    role: "science_stop",
    label: "Yellowknife Bay",
  });
  const stop2 = createWaypoint({
    id: "gale-stop-2",
    coordinates: { latitude: -4.62, longitude_east: 137.47 },
    role: "science_stop",
    label: "Pahrump Hills",
  });

  let plan = createWaypointPlan({
    name: "Gale Traverse Plan",
    waypoints: [base],
    mode,
    region_id: "gale",
  });
  plan = addWaypoint(plan, stop1);
  plan = addWaypoint(plan, stop2);
  return plan;
}

function makeSyntheticJezeroPlan(): WaypointPlan {
  const base = createWaypoint({
    id: "jezero-base",
    coordinates: { latitude: 18.38, longitude_east: 77.58 },
    role: "base",
    label: "Octavia E. Butler Landing",
  });
  const stop1 = createWaypoint({
    id: "jezero-stop-1",
    coordinates: { latitude: 18.42, longitude_east: 77.62 },
    role: "science_stop",
    label: "Kodiak Mesa Delta",
  });

  let plan = createWaypointPlan({
    name: "Jezero Delta Transect",
    waypoints: [base],
    mode: "one_way",
    region_id: "jezero",
  });
  plan = addWaypoint(plan, stop1);
  return plan;
}

function makeSyntheticOxiaPlan(): WaypointPlan {
  const base = createWaypoint({
    id: "oxia-base",
    coordinates: { latitude: 18.2, longitude_east: 335.5 },
    role: "base",
    label: "Oxia Habitat Alpha",
  });
  const stop1 = createWaypoint({
    id: "oxia-stop-1",
    coordinates: { latitude: 18.25, longitude_east: 335.55 },
    role: "science_stop",
    label: "Oxia Clay Outcrop",
  });

  let plan = createWaypointPlan({
    name: "Oxia Planum Survey",
    waypoints: [base],
    mode: "round_trip",
    region_id: "oxia",
  });
  plan = addWaypoint(plan, stop1);
  return plan;
}

// ---------------------------------------------------------------------------
// GROUP A: Pure Formatting Helper Tests
// ---------------------------------------------------------------------------

describe("Group A: Pure Formatting Helpers", () => {
  describe("formatElapsedSeconds", () => {
    test("handles null, undefined, negative, and non-finite values safely", () => {
      assert.equal(formatElapsedSeconds(null), "--:--:--");
      assert.equal(formatElapsedSeconds(undefined), "--:--:--");
      assert.equal(formatElapsedSeconds(-1), "--:--:--");
      assert.equal(formatElapsedSeconds(NaN), "--:--:--");
      assert.equal(formatElapsedSeconds(Infinity), "--:--:--");
      assert.equal(formatElapsedSeconds(-Infinity), "--:--:--");
    });

    test("formats 0 seconds correctly as 00:00:00", () => {
      assert.equal(formatElapsedSeconds(0), "00:00:00");
    });

    test("formats seconds within an hour correctly", () => {
      assert.equal(formatElapsedSeconds(45), "00:00:45");
      assert.equal(formatElapsedSeconds(125), "00:02:05");
      assert.equal(formatElapsedSeconds(3599), "00:59:59");
    });

    test("formats hours, minutes, and seconds with rollover", () => {
      assert.equal(formatElapsedSeconds(3600), "01:00:00");
      assert.equal(formatElapsedSeconds(3661), "01:01:01");
      assert.equal(formatElapsedSeconds(7325), "02:02:05");
      assert.equal(formatElapsedSeconds(86400), "24:00:00");
      assert.equal(formatElapsedSeconds(90061), "25:01:01");
    });
  });

  describe("formatMissionClock", () => {
    test("handles non-finite, negative, and missing inputs", () => {
      assert.equal(formatMissionClock(null), "Unavailable");
      assert.equal(formatMissionClock(undefined), "Unavailable");
      assert.equal(formatMissionClock(-10), "Unavailable");
      assert.equal(formatMissionClock(NaN), "Unavailable");
    });

    test("prepends T+ and formats standard timestamps", () => {
      assert.equal(formatMissionClock(0), "T+00:00:00");
      assert.equal(formatMissionClock(1800), "T+00:30:00");
      assert.equal(formatMissionClock(3661), "T+01:01:01");
      assert.equal(formatMissionClock(12345), "T+03:25:45");
    });
  });

  describe("formatDurationHuman", () => {
    test("handles non-finite, negative, and missing values safely", () => {
      assert.equal(formatDurationHuman(null), "Unavailable");
      assert.equal(formatDurationHuman(undefined), "Unavailable");
      assert.equal(formatDurationHuman(-5), "Unavailable");
      assert.equal(formatDurationHuman(NaN), "Unavailable");
    });

    test("formats zero seconds as 0m", () => {
      assert.equal(formatDurationHuman(0), "0m");
    });

    test("formats sub-minute seconds cleanly", () => {
      assert.equal(formatDurationHuman(45), "45s");
    });

    test("formats minutes and hours appropriately", () => {
      assert.equal(formatDurationHuman(60), "1m");
      assert.equal(formatDurationHuman(300), "5m");
      assert.equal(formatDurationHuman(3600), "1h");
      assert.equal(formatDurationHuman(5400), "1h 30m");
      assert.equal(formatDurationHuman(5415), "1h 30m");
      assert.equal(formatDurationHuman(90000), "25h");
    });
  });

  describe("formatTimelineDistance", () => {
    test("handles non-finite, negative, and missing values", () => {
      assert.equal(formatTimelineDistance(null), "Unavailable");
      assert.equal(formatTimelineDistance(undefined), "Unavailable");
      assert.equal(formatTimelineDistance(-100), "Unavailable");
      assert.equal(formatTimelineDistance(NaN), "Unavailable");
    });

    test("formats zero meters as 0 m", () => {
      assert.equal(formatTimelineDistance(0), "0 m");
    });

    test("formats short distances in meters (< 1000 m)", () => {
      assert.equal(formatTimelineDistance(450), "450 m");
      assert.equal(formatTimelineDistance(999.4), "999 m");
    });

    test("formats long distances in kilometers and rounded meters", () => {
      assert.equal(formatTimelineDistance(1000), "1.00 km (1,000 m)");
      assert.equal(formatTimelineDistance(1234.56), "1.23 km (1,235 m)");
      assert.equal(formatTimelineDistance(15000), "15.00 km (15,000 m)");
    });
  });
});

// ---------------------------------------------------------------------------
// GROUP B: Timeline Trajectory Math & Chronological Integrity Tests
// ---------------------------------------------------------------------------

describe("Group B: Timeline Trajectory Math & Chronological Integrity", () => {
  test("two-waypoint one-way transect calculates accurate transit and dwell", () => {
    const base = createWaypoint({
      id: "base",
      coordinates: { latitude: 0, longitude_east: 0 },
      role: "base",
      label: "Equatorial Base",
    });
    const stop = createWaypoint({
      id: "target",
      coordinates: { latitude: 0, longitude_east: 0.05 },
      role: "science_stop",
      label: "Sample Site",
    });

    let plan = createWaypointPlan({
      name: "Equatorial Transect",
      waypoints: [base],
      mode: "one_way",
    });
    plan = addWaypoint(plan, stop);

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 900, // 15 min
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    };

    const result = calculateMissionTimeline(plan, assumptions);
    assert.equal(result.status, "COMPLETE_SCENARIO");
    assert.equal(result.timeline.length, 2);
    assert.equal(result.segments.length, 1);

    // Stop 0: Base
    const entry0 = result.timeline[0];
    assert.equal(entry0.arrival_elapsed_seconds, 0);
    assert.equal(entry0.stop_duration_seconds, 0);
    assert.equal(entry0.departure_elapsed_seconds, 0);

    // Segment 0
    const leg0 = result.segments[0];
    assert.equal(leg0.from_waypoint_id, "base");
    assert.equal(leg0.to_waypoint_id, "target");
    assert.ok(leg0.travel_duration_seconds !== null && leg0.travel_duration_seconds > 0);

    // Stop 1: Science Stop
    const entry1 = result.timeline[1];
    assert.equal(entry1.arrival_elapsed_seconds, leg0.travel_duration_seconds);
    assert.equal(entry1.stop_duration_seconds, 900);
    assert.equal(entry1.departure_elapsed_seconds, entry1.arrival_elapsed_seconds + 900);

    // Total mission equals travel + stop
    assert.equal(result.total_travel_seconds, leg0.travel_duration_seconds);
    assert.equal(result.total_stop_seconds, 900);
    assert.equal(
      result.total_mission_seconds,
      result.total_travel_seconds! + result.total_stop_seconds,
    );

    // Render component and verify markup contains timing values
    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, { plan }),
    );
    assert.ok(markup.includes("Route Timeline Dashboard"));
    assert.ok(markup.includes("Complete Scenario"));
    assert.ok(markup.includes("Equatorial Base"));
    assert.ok(markup.includes("Sample Site"));
    assert.ok(markup.includes(TIMELINE_DISCLAIMER));
  });

  test("three-waypoint round-trip mission verifies loop closure and chronological ordering", () => {
    const plan = makeSyntheticGalePlan("round_trip");
    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 1200,
      default_science_stop_duration_seconds: 1800, // 30 min
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    };

    const result = calculateMissionTimeline(plan, assumptions);
    assert.equal(result.status, "COMPLETE_SCENARIO");

    // 3 waypoints in round-trip mode produce 4 timeline entries (Base, S1, S2, Return to Base)
    assert.equal(result.timeline.length, 4);
    assert.equal(result.segments.length, 3);

    // Verify chronological order: arrival[i] <= departure[i] <= arrival[i+1]
    for (let i = 0; i < result.timeline.length - 1; i++) {
      const cur = result.timeline[i];
      const next = result.timeline[i + 1];
      assert.ok(cur.arrival_elapsed_seconds! <= cur.departure_elapsed_seconds!);
      assert.ok(cur.departure_elapsed_seconds! <= next.arrival_elapsed_seconds!);
    }

    // Verify return leg
    const returnLeg = result.segments[2];
    assert.equal(returnLeg.is_return_segment, true);
    assert.equal(returnLeg.from_waypoint_id, "gale-stop-2");
    assert.equal(returnLeg.to_waypoint_id, "gale-base");

    // Verify final entry is return to base
    const finalEntry = result.timeline[3];
    assert.equal(finalEntry.is_return, true);
    assert.equal(finalEntry.waypoint_id, "gale-base");
    assert.equal(
      finalEntry.arrival_elapsed_seconds,
      result.timeline[2].departure_elapsed_seconds! + returnLeg.travel_duration_seconds!,
    );

    // Render component and verify return closure card exists
    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, { plan, walkingSpeedMPerHour: 1200 }),
    );
    assert.ok(markup.includes("Return to Base Camp (Bradbury Landing Base)"));
    assert.ok(markup.includes("Return Transit to Base Camp"));
  });

  test("walking speed changes scale travel times inversely", () => {
    const plan = makeSyntheticGalePlan("one_way");

    const resultSlow = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 500,
      default_science_stop_duration_seconds: 0,
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    });

    const resultFast = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 0,
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    });

    assert.ok(resultSlow.total_travel_seconds !== null);
    assert.ok(resultFast.total_travel_seconds !== null);
    // Doubling speed should exactly halve travel duration
    const ratio = resultSlow.total_travel_seconds / resultFast.total_travel_seconds;
    assert.ok(Math.abs(ratio - 2.0) < 0.001);
  });

  test("dwell duration changes scale total stop time linearly", () => {
    const plan = makeSyntheticGalePlan("one_way"); // 2 science stops

    const result0 = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 0,
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    });

    const result30 = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 1800, // 30 min each
      waypoint_stop_durations_seconds: {},
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    });

    assert.equal(result0.total_stop_seconds, 0);
    assert.equal(result30.total_stop_seconds, 3600); // 2 stops * 1800s
    assert.equal(
      result30.total_mission_seconds! - result0.total_mission_seconds!,
      3600,
    );
  });
});

// ---------------------------------------------------------------------------
// GROUP C: Incomplete Scenarios and Edge Cases
// ---------------------------------------------------------------------------

describe("Group C: Incomplete Scenarios and Edge Cases", () => {
  test("empty waypoint plan renders empty state notice cleanly", () => {
    const emptyPlan: WaypointPlan = {
      schema_version: 1,
      id: "empty-plan",
      name: "Empty Mission",
      mode: "round_trip",
      recovery_assumption: "test",
      waypoints: [],
      updated_at: new Date().toISOString(),
    };

    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, { plan: emptyPlan }),
    );
    assert.ok(markup.includes('data-testid="timeline-dashboard-empty"'));
    assert.ok(markup.includes("No Waypoints Placed"));
  });

  test("single-waypoint plan renders single-waypoint incomplete state", () => {
    const base = createWaypoint({
      id: "lone-base",
      coordinates: { latitude: -4.5, longitude_east: 137.4 },
      role: "base",
      label: "Solitary Base",
    });
    const singlePlan = createWaypointPlan({
      name: "Single Stop Plan",
      waypoints: [base],
      mode: "round_trip",
    });

    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, { plan: singlePlan }),
    );
    assert.ok(markup.includes('data-testid="timeline-dashboard-single"'));
    assert.ok(markup.includes("Single Waypoint — Traverse Incomplete"));
    assert.ok(markup.includes("Solitary Base"));
  });

  test("unsupported segment marks downstream stops as Unavailable while keeping prefix", () => {
    // Create a plan with an unsupported segment using explicit route input
    const base = createWaypoint({
      id: "wp-0",
      coordinates: { latitude: 0, longitude_east: 0 },
      role: "base",
      label: "Base Camp",
    });
    const stop1 = createWaypoint({
      id: "wp-1",
      coordinates: { latitude: 0, longitude_east: 0.1 },
      role: "science_stop",
      label: "Valid Stop 1",
    });
    const stop2 = createWaypoint({
      id: "wp-2",
      coordinates: { latitude: 0, longitude_east: 0.2 },
      role: "science_stop",
      label: "Downstream Stop 2",
    });

    const route = {
      name: "Degraded Route",
      mode: "one_way" as const,
      waypoints: [base, stop1, stop2],
      segments: [
        {
          from_waypoint_id: "wp-0",
          to_waypoint_id: "wp-1",
          distance_metres: 1000,
          status: "SUPPORTED" as const,
        },
        {
          from_waypoint_id: "wp-1",
          to_waypoint_id: "wp-2",
          distance_metres: null,
          status: "UNSUPPORTED" as const,
        },
      ],
    };

    const result = calculateMissionTimeline(route, DEFAULT_TEST_ASSUMPTIONS);
    assert.equal(result.status, "INCOMPLETE_SCENARIO");
    assert.equal(result.total_mission_seconds, null);

    // Stop 0 and Stop 1 have valid timing
    assert.equal(result.timeline[0].arrival_elapsed_seconds, 0);
    assert.ok(result.timeline[1].arrival_elapsed_seconds !== null);

    // Stop 2 has null timing
    assert.equal(result.timeline[2].arrival_elapsed_seconds, null);
    assert.equal(result.timeline[2].departure_elapsed_seconds, null);

    // Render component with route cast as WaypointPlan and verify incomplete scenario badge and Unavailable display
    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, { plan: route as unknown as WaypointPlan }),
    );
    assert.ok(markup.includes("Incomplete Scenario"));
    assert.ok(markup.includes("Unavailable"));
    assert.ok(markup.includes("Unsupported"));
    assert.ok(markup.includes("Downstream times are indeterminate"));
  });
});

// ---------------------------------------------------------------------------
// GROUP D: Reactivity & Calculation Consistency
// ---------------------------------------------------------------------------

describe("Group D: Reactivity and Plan Mutability", () => {
  test("adding a waypoint increments stops and transit legs", () => {
    const base = createWaypoint({
      id: "base",
      coordinates: { latitude: -4.5, longitude_east: 137.4 },
      role: "base",
      label: "Base",
    });
    const stop1 = createWaypoint({
      id: "s1",
      coordinates: { latitude: -4.52, longitude_east: 137.42 },
      role: "science_stop",
      label: "S1",
    });
    const stop2 = createWaypoint({
      id: "s2",
      coordinates: { latitude: -4.54, longitude_east: 137.44 },
      role: "science_stop",
      label: "S2",
    });

    let plan2 = createWaypointPlan({
      name: "Plan",
      waypoints: [base],
      mode: "one_way",
    });
    plan2 = addWaypoint(plan2, stop1);

    const res2 = calculateMissionTimeline(plan2, DEFAULT_TEST_ASSUMPTIONS);
    assert.equal(res2.timeline.length, 2);
    assert.equal(res2.segments.length, 1);

    const plan3 = addWaypoint(plan2, stop2);
    const res3 = calculateMissionTimeline(plan3, DEFAULT_TEST_ASSUMPTIONS);
    assert.equal(res3.timeline.length, 3);
    assert.equal(res3.segments.length, 2);
    assert.ok(res3.total_mission_seconds! > res2.total_mission_seconds!);
  });

  test("switching between one_way and round_trip toggles return leg closure", () => {
    const planOneWay = makeSyntheticGalePlan("one_way");
    const planRoundTrip = makeSyntheticGalePlan("round_trip");

    const resOneWay = calculateMissionTimeline(planOneWay, DEFAULT_TEST_ASSUMPTIONS);
    const resRoundTrip = calculateMissionTimeline(planRoundTrip, DEFAULT_TEST_ASSUMPTIONS);

    // One way: 3 stops, 2 segments
    assert.equal(resOneWay.timeline.length, 3);
    assert.equal(resOneWay.segments.length, 2);

    // Round trip: 4 stops, 3 segments
    assert.equal(resRoundTrip.timeline.length, 4);
    assert.equal(resRoundTrip.segments.length, 3);
    assert.ok(resRoundTrip.total_distance_metres! > resOneWay.total_distance_metres!);
    assert.ok(resRoundTrip.total_mission_seconds! > resOneWay.total_mission_seconds!);
  });
});

// ---------------------------------------------------------------------------
// GROUP E: Backward Compatibility and Regional Independence
// ---------------------------------------------------------------------------

describe("Group E: Regional Independence and Model Serialization", () => {
  test("renders Gale Crater plan with regional context", () => {
    const plan = makeSyntheticGalePlan("round_trip");
    const galeRegion = regions["gale"];

    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, {
        plan,
        region: galeRegion,
      }),
    );
    assert.ok(markup.includes("Gale Crater"));
    assert.ok(markup.includes("Mission Timing"));
    assert.ok(markup.includes(TIMELINE_DISCLAIMER));
  });

  test("renders Jezero Crater plan with regional context", () => {
    const plan = makeSyntheticJezeroPlan();
    const jezeroRegion = regions["jezero"];

    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, {
        plan,
        region: jezeroRegion,
      }),
    );
    assert.ok(markup.includes("Jezero Crater"));
    assert.ok(markup.includes("Kodiak Mesa Delta"));
    assert.ok(markup.includes(TIMELINE_DISCLAIMER));
  });

  test("renders Oxia Planum plan with regional context", () => {
    const plan = makeSyntheticOxiaPlan();
    const oxiaRegion = regions["oxia"];

    const markup = renderToStaticMarkup(
      React.createElement(MissionTimelineDashboard, {
        plan,
        region: oxiaRegion,
      }),
    );
    assert.ok(markup.includes("Oxia Planum"));
    assert.ok(markup.includes("Oxia Clay Outcrop"));
    assert.ok(markup.includes(TIMELINE_DISCLAIMER));
  });

  test("serializes and deserializes M3 mission JSON without losing timeline fidelity", () => {
    const region = regions["gale"];
    let mission = newMission(region);
    const plan = makeSyntheticGalePlan("round_trip");
    mission = syncMissionWithWaypointPlan(mission, plan, region);

    // Serialize to JSON string
    const jsonStr = JSON.stringify(mission);
    const parsed = parseMission(JSON.parse(jsonStr), region);

    assert.ok(parsed !== null);
    const recoveredPlan = initWaypointPlanFromMission(parsed, region);
    assert.equal(recoveredPlan.waypoints.length, plan.waypoints.length);
    assert.equal(recoveredPlan.mode, plan.mode);

    // Timeline calculation on recovered plan matches original exactly
    const originalRes = calculateMissionTimeline(plan, DEFAULT_TEST_ASSUMPTIONS);
    const recoveredRes = calculateMissionTimeline(recoveredPlan, DEFAULT_TEST_ASSUMPTIONS);

    assert.equal(recoveredRes.status, originalRes.status);
    assert.equal(recoveredRes.total_mission_seconds, originalRes.total_mission_seconds);
    assert.equal(recoveredRes.total_travel_seconds, originalRes.total_travel_seconds);
    assert.equal(recoveredRes.total_stop_seconds, originalRes.total_stop_seconds);
    assert.equal(recoveredRes.timeline.length, originalRes.timeline.length);
  });
});
