/**
 * Unit tests for `lib/mission/timeline.ts` — Deterministic Mission Timeline Engine.
 *
 * Validates:
 * - Scenario A: Basic route (1,000 m @ 500 m/h -> 7,200 s)
 * - Scenario B: Multiple segments with cumulative arrival/departure tracking
 * - Scenario C: Science stop duration (15 min -> 900 s added once)
 * - Scenario D: Zero-duration stops
 * - Scenario E: Invalid speed inputs (0, negative, NaN, +/-Infinity)
 * - Scenario F: Invalid distance inputs (missing, negative, NaN, +/-Infinity)
 * - Scenario G: Unsupported segment propagation and incomplete scenario handling
 * - Scenario H: One-way route behavior (no implicit return leg)
 * - Scenario I: Round-trip route behavior (closing return leg contributes to total)
 * - Scenario J: Missing return leg in round-trip mode (INCOMPLETE_SCENARIO)
 * - Scenario K: Fractional distances and numerical stability
 * - Scenario L: Long itinerary (50+ waypoints) without cumulative drift
 * - Scenario M: Determinism on repeated calculation
 * - Scenario N: Input immutability (deep-frozen inputs)
 * - Scenario O: Regional independence (Gale, Jezero, Oxia, Martian Equator, Poles)
 * - Additional coverage: Unit conversion helpers, start offsets, base prep, schema parsing
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  calculateMissionTimeline,
  minutesToSeconds,
  secondsToMinutes,
  hoursToSeconds,
  secondsToHours,
  formatElapsedSeconds,
  missionTimelineResultSchema,
  TIMELINE_DISCLAIMER,
  type TimelineAssumptions,
  type TimelineRouteInput,
} from "../lib/mission/timeline.js";
import {
  createWaypoint,
  createWaypointPlan,
  generateGeometricTrajectory,
  type MarsWaypoint,
  type WaypointPlan,
} from "../lib/mission/waypoint-planning.js";
import { marsDistance } from "../lib/map/geodesy.js";

// ---------------------------------------------------------------------------
// Helpers
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

function assertApprox(
  actual: number | null,
  expected: number,
  tolerance = 1e-4,
  msg?: string,
) {
  assert.notEqual(actual, null, `${msg ?? "assertApprox"}: expected non-null number`);
  const diff = Math.abs((actual as number) - expected);
  if (diff > tolerance) {
    assert.fail(
      `${msg ?? "assertApprox"}: expected ≈ ${expected}, got ${actual} (diff = ${diff})`,
    );
  }
}

// ===========================================================================
// Unit Conversion Helpers
// ===========================================================================

describe("Unit Conversion Helpers", () => {
  it("converts minutes to seconds and vice versa", () => {
    assert.equal(minutesToSeconds(15), 900);
    assert.equal(minutesToSeconds(0), 0);
    assert.equal(minutesToSeconds(2.5), 150);
    assert.equal(secondsToMinutes(900), 15);
    assert.equal(secondsToMinutes(150), 2.5);
  });

  it("converts hours to seconds and vice versa", () => {
    assert.equal(hoursToSeconds(1), 3600);
    assert.equal(hoursToSeconds(2), 7200);
    assert.equal(hoursToSeconds(0.5), 1800);
    assert.equal(secondsToHours(7200), 2);
    assert.equal(secondsToHours(1800), 0.5);
  });

  it("formats elapsed seconds to HH:MM:SS string safely", () => {
    assert.equal(formatElapsedSeconds(0), "00:00:00");
    assert.equal(formatElapsedSeconds(7200), "02:00:00");
    assert.equal(formatElapsedSeconds(8100), "02:15:00");
    assert.equal(formatElapsedSeconds(86399), "23:59:59");
    assert.equal(formatElapsedSeconds(null), "--:--:--");
    assert.equal(formatElapsedSeconds(-10), "--:--:--");
    assert.equal(formatElapsedSeconds(NaN), "--:--:--");
  });
});

// ===========================================================================
// Scenario A: Basic Route
// ===========================================================================

describe("Scenario A: Basic Route", () => {
  it("computes duration for 1,000 m at 500 m/h as exactly 7,200 seconds", () => {
    const w0 = makeWp("wp-0", 0, 100, "base");
    const w1 = makeWp("wp-1", 0, 100.1, "destination");

    // Mock segment distance of 1,000 m
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "wp-0",
          to_waypoint_id: "wp-1",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
      ],
    };

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 500,
    };

    const result = calculateMissionTimeline(route, assumptions);

    assert.equal(result.status, "COMPLETE_SCENARIO");
    assert.equal(result.total_distance_metres, 1000);
    assert.equal(result.total_travel_seconds, 7200);
    assert.equal(result.total_stop_seconds, 0);
    assert.equal(result.total_mission_seconds, 7200);

    assert.equal(result.timeline.length, 2);
    assert.deepEqual(result.timeline[0], {
      step_index: 0,
      waypoint_id: "wp-0",
      role: "base",
      is_return: false,
      arrival_elapsed_seconds: 0,
      departure_elapsed_seconds: 0,
      stop_duration_seconds: 0,
    });
    assert.deepEqual(result.timeline[1], {
      step_index: 1,
      waypoint_id: "wp-1",
      role: "destination",
      is_return: false,
      arrival_elapsed_seconds: 7200,
      departure_elapsed_seconds: 7200,
      stop_duration_seconds: 0,
    });

    assert.equal(result.segments.length, 1);
    assert.equal(result.segments[0].travel_duration_seconds, 7200);
    assert.equal(result.segments[0].status, "SUPPORTED");

    // Output passes schema
    missionTimelineResultSchema.parse(result);
  });
});

// ===========================================================================
// Scenario B: Multiple Segments & Cumulative Tracking
// ===========================================================================

describe("Scenario B: Multiple Segments & Cumulative Tracking", () => {
  it("tracks sequential arrival and departure across multiple legs", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "intermediate");
    const w2 = makeWp("w2", -4.52, 137.4, "destination");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1, w2],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 500,
          status: "SUPPORTED",
        },
        {
          from_waypoint_id: "w1",
          to_waypoint_id: "w2",
          distance_metres: 1500,
          status: "SUPPORTED",
        },
      ],
    };

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 1000,
      start_elapsed_seconds: 300, // Non-zero start
    };

    const result = calculateMissionTimeline(route, assumptions);

    assert.equal(result.status, "COMPLETE_SCENARIO");
    assert.equal(result.total_distance_metres, 2000);
    // Leg 1: 500m @ 1000m/h -> 1800s
    // Leg 2: 1500m @ 1000m/h -> 5400s
    // Total travel: 7200s
    assert.equal(result.total_travel_seconds, 7200);
    assert.equal(result.total_mission_seconds, 7200);

    // Timeline checks with start offset 300s
    assert.equal(result.timeline[0].arrival_elapsed_seconds, 300);
    assert.equal(result.timeline[0].departure_elapsed_seconds, 300);

    assert.equal(result.timeline[1].arrival_elapsed_seconds, 300 + 1800); // 2100
    assert.equal(result.timeline[1].departure_elapsed_seconds, 2100);

    assert.equal(result.timeline[2].arrival_elapsed_seconds, 2100 + 5400); // 7500
    assert.equal(result.timeline[2].departure_elapsed_seconds, 7500);

    // Final departure - start === total_mission_seconds
    assert.equal(
      (result.timeline[2].departure_elapsed_seconds ?? 0) - 300,
      result.total_mission_seconds,
    );
  });
});

// ===========================================================================
// Scenario C: Science Stops
// ===========================================================================

describe("Scenario C: Science Stops", () => {
  it("adds 15-minute science stop (900 s) exactly once to total duration", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "science_stop");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
      ],
    };

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 500,
      default_science_stop_duration_seconds: 900, // 15 mins
    };

    const result = calculateMissionTimeline(route, assumptions);

    assert.equal(result.status, "COMPLETE_SCENARIO");
    assert.equal(result.total_distance_metres, 1000);
    assert.equal(result.total_travel_seconds, 7200);
    assert.equal(result.total_stop_seconds, 900);
    assert.equal(result.total_mission_seconds, 8100); // 7200 + 900

    assert.equal(result.timeline[1].arrival_elapsed_seconds, 7200);
    assert.equal(result.timeline[1].stop_duration_seconds, 900);
    assert.equal(result.timeline[1].departure_elapsed_seconds, 8100);
  });

  it("does not apply default science stop duration to intermediate waypoints", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "intermediate");
    const w2 = makeWp("w2", -4.52, 137.4, "science_stop");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1, w2],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
        {
          from_waypoint_id: "w1",
          to_waypoint_id: "w2",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
      ],
    };

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 900,
    };

    const result = calculateMissionTimeline(route, assumptions);

    // w1 is intermediate -> stop duration must be 0
    assert.equal(result.timeline[1].stop_duration_seconds, 0);
    assert.equal(result.timeline[1].arrival_elapsed_seconds, 3600);
    assert.equal(result.timeline[1].departure_elapsed_seconds, 3600);

    // w2 is science_stop -> stop duration is 900
    assert.equal(result.timeline[2].stop_duration_seconds, 900);
    assert.equal(result.timeline[2].arrival_elapsed_seconds, 7200);
    assert.equal(result.timeline[2].departure_elapsed_seconds, 8100);

    assert.equal(result.total_stop_seconds, 900);
    assert.equal(result.total_mission_seconds, 7200 + 900);
  });

  it("supports explicit per-waypoint stop durations overriding defaults", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "science_stop");
    const w2 = makeWp("w2", 0, 100.2, "science_stop");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1, w2],
      segments: [
        { from_waypoint_id: "w0", to_waypoint_id: "w1", distance_metres: 1000 },
        { from_waypoint_id: "w1", to_waypoint_id: "w2", distance_metres: 1000 },
      ],
    };

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 600, // 10 min default
      waypoint_stop_durations_seconds: {
        w1: 1800, // 30 min explicit override
      },
    };

    const result = calculateMissionTimeline(route, assumptions);

    assert.equal(result.timeline[1].stop_duration_seconds, 1800);
    assert.equal(result.timeline[2].stop_duration_seconds, 600);
    assert.equal(result.total_stop_seconds, 2400);
  });
});

// ===========================================================================
// Scenario D: Zero-Duration Stop
// ===========================================================================

describe("Scenario D: Zero-Duration Stop", () => {
  it("keeps total time unchanged when stop duration is zero", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "science_stop");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
      ],
    };

    const withZeroStop = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
      default_science_stop_duration_seconds: 0,
    });

    const withoutStopParam = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });

    assert.equal(withZeroStop.total_travel_seconds, 7200);
    assert.equal(withZeroStop.total_stop_seconds, 0);
    assert.equal(withZeroStop.total_mission_seconds, 7200);

    assert.equal(
      withZeroStop.total_mission_seconds,
      withoutStopParam.total_mission_seconds,
    );
  });
});

// ===========================================================================
// Scenario E: Invalid Speed Inputs
// ===========================================================================

describe("Scenario E: Invalid Speed Inputs", () => {
  const w0 = makeWp("w0", 0, 100, "base");
  const w1 = makeWp("w1", 0, 100.1, "destination");
  const route: TimelineRouteInput = {
    mode: "one_way",
    waypoints: [w0, w1],
    segments: [
      { from_waypoint_id: "w0", to_waypoint_id: "w1", distance_metres: 1000 },
    ],
  };

  it("rejects zero walking speed", () => {
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 0,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
    assert.ok(res.warnings.some((w) => w.includes("Walking speed")));
  });

  it("rejects negative walking speed", () => {
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: -500,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
    assert.ok(res.warnings.some((w) => w.includes("Walking speed")));
  });

  it("rejects NaN walking speed", () => {
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: NaN,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
  });

  it("rejects Infinity walking speed", () => {
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: Infinity,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
  });

  it("rejects -Infinity walking speed", () => {
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: -Infinity,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
  });
});

// ===========================================================================
// Scenario F: Invalid Distance Inputs
// ===========================================================================

describe("Scenario F: Invalid Distance Inputs", () => {
  const w0 = makeWp("w0", 0, 100, "base");
  const w1 = makeWp("w1", 0, 100.1, "destination");

  it("rejects negative segment distance as INVALID_INPUT", () => {
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: -500,
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
    assert.ok(res.warnings.some((w) => w.includes("negative distance")));
  });

  it("rejects NaN segment distance as INVALID_INPUT", () => {
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: NaN,
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
  });

  it("rejects Infinity segment distance as INVALID_INPUT", () => {
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: Infinity,
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });
    assert.equal(res.status, "INVALID_INPUT");
    assert.equal(res.total_mission_seconds, null);
  });

  it("marks missing distance (null) as INCOMPLETE_SCENARIO without crashing", () => {
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: null,
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });
    assert.equal(res.status, "INCOMPLETE_SCENARIO");
    assert.equal(res.total_distance_metres, null);
    assert.equal(res.total_travel_seconds, null);
    assert.equal(res.total_mission_seconds, null);
    assert.equal(res.segments[0].status, "UNSUPPORTED");
  });
});

// ===========================================================================
// Scenario G: Unsupported Segment Handling
// ===========================================================================

describe("Scenario G: Unsupported Segment Handling", () => {
  it("does not report a complete total when a segment is unsupported", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "intermediate");
    const w2 = makeWp("w2", 0, 100.2, "destination");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1, w2],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1000,
          status: "SUPPORTED",
        },
        {
          from_waypoint_id: "w1",
          to_waypoint_id: "w2",
          distance_metres: 1500,
          status: "UNSUPPORTED", // Explicitly unsupported leg
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 1000,
    });

    assert.equal(res.status, "INCOMPLETE_SCENARIO");
    assert.equal(res.total_travel_seconds, null);
    assert.equal(res.total_mission_seconds, null);

    // First leg has timing
    assert.equal(res.segments[0].travel_duration_seconds, 3600);
    assert.equal(res.timeline[0].arrival_elapsed_seconds, 0);
    assert.equal(res.timeline[1].arrival_elapsed_seconds, 3600);

    // Second leg and downstream waypoint have null timing
    assert.equal(res.segments[1].travel_duration_seconds, null);
    assert.equal(res.timeline[2].arrival_elapsed_seconds, null);
    assert.equal(res.timeline[2].departure_elapsed_seconds, null);

    assert.ok(res.warnings.some((w) => w.includes("unsupported")));
  });
});

// ===========================================================================
// Scenario H: One-Way Route Behavior
// ===========================================================================

describe("Scenario H: One-Way Route Behavior", () => {
  it("does not silently create a return leg for one-way trajectories", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.52, 137.42, "destination");

    const plan: WaypointPlan = createWaypointPlan({
      mode: "one_way",
      waypoints: [w0, w1],
      recovery_assumption: "Rendezvous with pressurized rover",
    });

    const res = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    assert.equal(res.segments.length, 1);
    assert.equal(res.segments[0].is_return_segment, false);
    assert.equal(res.timeline.length, 2);
    assert.equal(res.timeline[1].is_return, false);
    assert.equal(res.timeline[1].waypoint_id, "w1");
  });
});

// ===========================================================================
// Scenario I: Round-Trip Route Behavior
// ===========================================================================

describe("Scenario I: Round-Trip Route Behavior", () => {
  it("includes explicit return leg back to base camp in total duration", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "science_stop");

    const plan: WaypointPlan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [w0, w1],
    });

    const geoTraj = generateGeometricTrajectory(plan);
    assert.equal(geoTraj.segments.length, 2);
    assert.equal(geoTraj.segments[1].is_return_segment, true);

    const res = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
      default_science_stop_duration_seconds: 900,
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    assert.equal(res.segments.length, 2);
    assert.equal(res.segments[1].is_return_segment, true);

    // Timeline has 3 visits: w0 (departure) -> w1 (stop) -> w0 (return)
    assert.equal(res.timeline.length, 3);
    assert.equal(res.timeline[0].waypoint_id, "w0");
    assert.equal(res.timeline[0].is_return, false);

    assert.equal(res.timeline[1].waypoint_id, "w1");
    assert.equal(res.timeline[1].stop_duration_seconds, 900);

    assert.equal(res.timeline[2].waypoint_id, "w0");
    assert.equal(res.timeline[2].is_return, true);

    // Return segment contributes to travel
    const outboundTravel = res.segments[0].travel_duration_seconds!;
    const returnTravel = res.segments[1].travel_duration_seconds!;
    assertApprox(res.total_travel_seconds, outboundTravel + returnTravel);
    assertApprox(
      res.total_mission_seconds,
      outboundTravel + returnTravel + 900,
    );
  });
});

// ===========================================================================
// Scenario J: Missing Return Leg in Round-Trip Mode
// ===========================================================================

describe("Scenario J: Missing Return Leg in Round-Trip Mode", () => {
  it("flags incomplete status when a round-trip route has no return leg", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "intermediate");

    // Manually pass only an outbound segment in round_trip mode
    const route: TimelineRouteInput = {
      mode: "round_trip",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1000,
          status: "SUPPORTED",
          is_return_segment: false,
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });

    assert.equal(res.status, "INCOMPLETE_SCENARIO");
    assert.equal(res.total_mission_seconds, null);
    assert.ok(
      res.warnings.some((w) => w.includes("missing a return segment")),
    );
  });
});

// ===========================================================================
// Scenario K: Fractional Distances & Numerical Stability
// ===========================================================================

describe("Scenario K: Fractional Distances & Numerical Stability", () => {
  it("handles fractional metres and speeds with high numerical precision", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "destination");

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 1234.5678,
          status: "SUPPORTED",
        },
      ],
    };

    const speed = 456.789;
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: speed,
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    assert.equal(res.total_distance_metres, 1234.5678);

    const expectedTravelSec = (1234.5678 / speed) * 3600;
    assertApprox(res.total_travel_seconds, expectedTravelSec);
    assertApprox(res.total_mission_seconds, expectedTravelSec);
  });

  it("handles zero-length segments without division-by-zero errors", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100, "intermediate"); // Coincident coordinates

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "w1",
          distance_metres: 0,
          status: "SUPPORTED",
        },
      ],
    };

    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    assert.equal(res.total_distance_metres, 0);
    assert.equal(res.total_travel_seconds, 0);
    assert.equal(res.total_mission_seconds, 0);
  });
});

// ===========================================================================
// Scenario L: Long Itinerary (Cumulative Drift Check)
// ===========================================================================

describe("Scenario L: Long Itinerary", () => {
  it("evaluates a 50-segment itinerary without floating-point accumulation drift", () => {
    const N = 50;
    const waypoints: MarsWaypoint[] = [];
    for (let i = 0; i <= N; i++) {
      waypoints.push(
        makeWp(
          `wp-${i}`,
          -4.5 + i * 0.001,
          137.4,
          i === 0 ? "base" : i === N ? "destination" : "intermediate",
        ),
      );
    }

    const segDistance = 59.2747; // ~1 millidegree latitude
    const segments = [];
    for (let i = 0; i < N; i++) {
      segments.push({
        from_waypoint_id: `wp-${i}`,
        to_waypoint_id: `wp-${i + 1}`,
        distance_metres: segDistance,
        status: "SUPPORTED" as const,
      });
    }

    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints,
      segments,
    };

    const speed = 1000;
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: speed,
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    const expectedTotalDist = N * segDistance;
    assertApprox(res.total_distance_metres, expectedTotalDist);

    const expectedTravelSec = (expectedTotalDist / speed) * 3600;
    assertApprox(res.total_travel_seconds, expectedTravelSec);
    assertApprox(res.total_mission_seconds, expectedTravelSec);

    // Verify last timeline departure matches total_mission_seconds exactly
    const lastEntry = res.timeline[res.timeline.length - 1];
    assertApprox(lastEntry.departure_elapsed_seconds, expectedTravelSec);
  });
});

// ===========================================================================
// Scenario M: Repeated Calculation & Determinism
// ===========================================================================

describe("Scenario M: Repeated Calculation & Determinism", () => {
  it("produces identical output on repeated runs with identical input", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const w1 = makeWp("w1", -4.51, 137.4, "science_stop");

    const plan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [w0, w1],
    });

    const assumptions: TimelineAssumptions = {
      walking_speed_m_per_hour: 800,
      default_science_stop_duration_seconds: 600,
      base_preparation_duration_seconds: 300,
    };

    const run1 = calculateMissionTimeline(plan, assumptions);
    const run2 = calculateMissionTimeline(plan, assumptions);

    assert.deepEqual(run1, run2);
  });
});

// ===========================================================================
// Scenario N: Input Immutability
// ===========================================================================

describe("Scenario N: Input Immutability", () => {
  it("does not mutate input route, waypoints, segments, or assumptions", () => {
    const w0 = Object.freeze(makeWp("w0", 0, 100, "base"));
    const w1 = Object.freeze(makeWp("w1", 0, 100.1, "destination"));

    const seg0 = Object.freeze({
      from_waypoint_id: "w0",
      to_waypoint_id: "w1",
      distance_metres: 1000,
      status: "SUPPORTED" as const,
    });

    const route = Object.freeze({
      mode: "one_way" as const,
      waypoints: Object.freeze([w0, w1]),
      segments: Object.freeze([seg0]),
    });

    const stops = Object.freeze({ w1: 300 });
    const assumptions = Object.freeze({
      walking_speed_m_per_hour: 500,
      start_elapsed_seconds: 0,
      waypoint_stop_durations_seconds: stops,
    });

    // Should run successfully without throwing mutation errors on frozen objects
    const res = calculateMissionTimeline(route, assumptions);
    assert.equal(res.status, "COMPLETE_SCENARIO");
  });
});

// ===========================================================================
// Scenario O: Regional Independence
// ===========================================================================

describe("Scenario O: Regional Independence", () => {
  it("executes identically for coordinates across Gale, Jezero, and Oxia", () => {
    const speed = 1000;

    // Gale coordinates (~ -4.6°, 137.4°)
    const galePlan = createWaypointPlan({
      mode: "one_way",
      waypoints: [
        makeWp("g0", -4.5895, 137.4417, "base"),
        makeWp("g1", -4.6000, 137.4417, "destination"),
      ],
      recovery_assumption: "Gale habitat egress",
    });

    // Jezero coordinates (~ 18.4°, 77.4°)
    const jezeroPlan = createWaypointPlan({
      mode: "one_way",
      waypoints: [
        makeWp("j0", 18.38, 77.58, "base"),
        makeWp("j1", 18.40, 77.58, "destination"),
      ],
      recovery_assumption: "Jezero sample depot ingress",
    });

    // Oxia Planum coordinates (~ 18.2°, 335.5°)
    const oxiaPlan = createWaypointPlan({
      mode: "one_way",
      waypoints: [
        makeWp("o0", 18.20, 335.30, "base"),
        makeWp("o1", 18.22, 335.30, "destination"),
      ],
      recovery_assumption: "Oxia lander rendezvous",
    });

    const galeRes = calculateMissionTimeline(galePlan, { walking_speed_m_per_hour: speed });
    const jezeroRes = calculateMissionTimeline(jezeroPlan, { walking_speed_m_per_hour: speed });
    const oxiaRes = calculateMissionTimeline(oxiaPlan, { walking_speed_m_per_hour: speed });

    assert.equal(galeRes.status, "COMPLETE_SCENARIO");
    assert.equal(jezeroRes.status, "COMPLETE_SCENARIO");
    assert.equal(oxiaRes.status, "COMPLETE_SCENARIO");

    assert.ok(galeRes.total_mission_seconds! > 0);
    assert.ok(jezeroRes.total_mission_seconds! > 0);
    assert.ok(oxiaRes.total_mission_seconds! > 0);
  });
});

// ===========================================================================
// Additional Structural & Operational Scenarios
// ===========================================================================

describe("Additional Structural & Operational Scenarios", () => {
  it("rejects empty itinerary as INVALID_INPUT", () => {
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [],
    };
    const res = calculateMissionTimeline(route, { walking_speed_m_per_hour: 500 });
    assert.equal(res.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("no waypoints")));
  });

  it("handles single-waypoint itinerary as INCOMPLETE_SCENARIO", () => {
    const w0 = makeWp("w0", -4.5, 137.4, "base");
    const route: TimelineRouteInput = {
      mode: "round_trip",
      waypoints: [w0],
    };
    const res = calculateMissionTimeline(route, {
      walking_speed_m_per_hour: 500,
      base_preparation_duration_seconds: 600,
    });
    assert.equal(res.status, "INCOMPLETE_SCENARIO");
    assert.equal(res.total_mission_seconds, null);
    assert.equal(res.total_stop_seconds, 600);
    assert.equal(res.timeline.length, 1);
  });

  it("rejects duplicate waypoint IDs as INVALID_INPUT", () => {
    const w0 = makeWp("dup-id", 0, 100, "base");
    const w1 = makeWp("dup-id", 0, 101, "destination");
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
    };
    const res = calculateMissionTimeline(route, { walking_speed_m_per_hour: 500 });
    assert.equal(res.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("Duplicate waypoint ID")));
  });

  it("rejects unknown waypoint reference in segment as INVALID_INPUT", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 101, "destination");
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        {
          from_waypoint_id: "w0",
          to_waypoint_id: "ghost-waypoint",
          distance_metres: 1000,
        },
      ],
    };
    const res = calculateMissionTimeline(route, { walking_speed_m_per_hour: 500 });
    assert.equal(res.status, "INVALID_INPUT");
    assert.ok(res.warnings.some((w) => w.includes("unknown to_waypoint_id")));
  });

  it("applies base preparation and final recovery duration correctly without double counting", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "science_stop");

    const plan = createWaypointPlan({
      mode: "round_trip",
      waypoints: [w0, w1],
    });

    const res = calculateMissionTimeline(plan, {
      walking_speed_m_per_hour: 1000,
      base_preparation_duration_seconds: 1200, // 20 min base prep
      default_science_stop_duration_seconds: 900, // 15 min science
      final_destination_duration_seconds: 600, // 10 min return ingress
    });

    assert.equal(res.status, "COMPLETE_SCENARIO");
    // Departure at w0 has stop 1200
    assert.equal(res.timeline[0].stop_duration_seconds, 1200);
    assert.equal(res.timeline[0].arrival_elapsed_seconds, 0);
    assert.equal(res.timeline[0].departure_elapsed_seconds, 1200);

    // Stop at w1 has stop 900
    assert.equal(res.timeline[1].stop_duration_seconds, 900);

    // Return to w0 has stop 600 (not 1200!)
    assert.equal(res.timeline[2].stop_duration_seconds, 600);

    // Total stop: 1200 + 900 + 600 = 2700
    assert.equal(res.total_stop_seconds, 2700);

    // Total mission equals travel + stop
    assert.equal(
      res.total_mission_seconds,
      res.total_travel_seconds! + res.total_stop_seconds,
    );
  });

  it("contains mandatory scientific disclaimer on all results", () => {
    const w0 = makeWp("w0", 0, 100, "base");
    const w1 = makeWp("w1", 0, 100.1, "destination");
    const route: TimelineRouteInput = {
      mode: "one_way",
      waypoints: [w0, w1],
      segments: [
        { from_waypoint_id: "w0", to_waypoint_id: "w1", distance_metres: 1000 },
      ],
    };

    const res = calculateMissionTimeline(route, { walking_speed_m_per_hour: 500 });
    assert.equal(res.scientific_disclaimer, TIMELINE_DISCLAIMER);
    assert.ok(res.scientific_disclaimer.includes("R = 3,396,190 m"));
  });
});
