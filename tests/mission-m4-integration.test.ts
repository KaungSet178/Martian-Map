/**
 * Integration test suite for M4-INT: Mission Timeline and Resource Budgeting Integration.
 *
 * Verifies compatibility of M4.1/M4.1A timeline engine and M4.2/M4.2A resource budgeting
 * engine with the G4/G5 shared baseline, M3 waypoint planning model, serialization,
 * region independence, and scientific disclaimers.
 *
 * Scenarios tested:
 * - Scenario A: Existing Gale mission (waypoint IDs preserved, serialization roundtrip, timeline & resource pipeline)
 * - Scenario B: One-way mission (correct stage count, no return leg)
 * - Scenario C: Round-trip mission (return leg included exactly once, return closure)
 * - Scenario D: Incomplete route (unknown segments, null full-mission totals, preserved prefix, INSUFFICIENT_DATA)
 * - Scenario E: Missing resource assumptions (INSUFFICIENT_DATA status)
 * - Scenario F: Region independence (runs on Gale, Jezero, Oxia, and equatorial coordinates without environmental ties)
 * - Scenario G: Scientific safety (mandatory disclaimers, no operational EVA safety certification)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createWaypoint,
  createWaypointPlan,
  generateGeometricTrajectory,
  serializeWaypointPlan,
  deserializeWaypointPlan,
  type MarsWaypoint,
} from "../lib/mission/waypoint-planning.js";
import {
  calculateMissionTimeline,
  TIMELINE_DISCLAIMER,
  type TimelineAssumptions,
  type TimelineRouteInput,
} from "../lib/mission/timeline.js";
import {
  calculateResourceBudget,
  RESOURCE_BUDGET_DISCLAIMER,
  type OxygenBudgetAssumptions,
  type BatteryBudgetAssumptions,
} from "../lib/mission/resource-budget.js";
import { regions } from "../lib/regions/registry.js";
import {
  newMission,
  saveMission,
  readMissions,
  type Mission,
} from "../lib/mission/model.js";

// ---------------------------------------------------------------------------
// Helpers & Standard Test Fixtures
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

const standardOxygenAssumptions: OxygenBudgetAssumptions = {
  capacity_g: 1200,
  stop_rate_g_per_hour: 40,
  travel_rate_g_per_hour: 60,
  reserve_g: 240,
};

const standardBatteryAssumptions: BatteryBudgetAssumptions = {
  capacity_wh: 2500,
  stop_power_w: 120,
  travel_power_w: 180,
  reserve_wh: 500,
};

describe("M4-INT: Mission Engine Integration Suite", () => {
  // -------------------------------------------------------------------------
  // Scenario A — Existing Gale mission
  // -------------------------------------------------------------------------
  describe("Scenario A: Existing Gale Mission Compatibility", () => {
    it("preserves waypoint identifiers, serialization roundtrip, and consumes mission into timeline and resource engines", () => {
      // Create Gale exploration waypoints
      const baseCamp = makeWp("gale-base-camp", -4.5895, 137.4417, "base", "Bradbury Landing Base");
      const stop1 = makeWp("gale-science-1", -4.6200, 137.4200, "science_stop", "Yellowknife Bay Outcrop");
      const stop2 = makeWp("gale-science-2", -4.6500, 137.4000, "science_stop", "Kimberley Waypoint");

      const plan = createWaypointPlan({
        name: "Gale Traverse Plan",
        waypoints: [baseCamp, stop1, stop2],
        mode: "one_way",
      });

      // Verify waypoint identifiers remain unchanged
      assert.equal(plan.waypoints[0].id, "gale-base-camp");
      assert.equal(plan.waypoints[1].id, "gale-science-1");
      assert.equal(plan.waypoints[2].id, "gale-science-2");

      // Verify serialization roundtrip
      const serialized = serializeWaypointPlan(plan);
      const deserialized = deserializeWaypointPlan(serialized);
      assert.deepEqual(deserialized.waypoints.map((w) => w.id), ["gale-base-camp", "gale-science-1", "gale-science-2"]);
      assert.equal(deserialized.mode, "one_way");

      // Verify model mission serialization compatibility
      const mockStorage = new Map<string, string>();
      const storageAdapter = {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
      };
      const galeMission: Mission = {
        ...newMission(regions.gale),
        name: "Gale M3 Trajectory",
        target_ids: [regions.gale.targets[0].id],
      };
      saveMission(storageAdapter, galeMission);
      const [restored] = readMissions(storageAdapter);
      assert.equal(restored.name, "Gale M3 Trajectory");
      assert.equal(restored.region, "gale");

      // Timeline calculation consumes generated trajectory
      const trajectory = generateGeometricTrajectory(plan);
      const timelineAssumptions: TimelineAssumptions = {
        walking_speed_m_per_hour: 1200,
        default_science_stop_duration_seconds: 1800,
      };
      const timelineResult = calculateMissionTimeline(trajectory, timelineAssumptions);

      assert.equal(timelineResult.status, "COMPLETE_SCENARIO");
      assert.equal(timelineResult.timeline.length, 3);
      assert.equal(timelineResult.segments.length, 2);
      assert.ok(timelineResult.total_mission_seconds !== null && timelineResult.total_mission_seconds > 0);
      assert.ok(timelineResult.total_travel_seconds !== null && timelineResult.total_travel_seconds > 0);
      assert.equal(timelineResult.total_stop_seconds, 3600); // 2 science stops * 1800 s

      // Resource calculation consumes resulting timeline
      const resourceResult = calculateResourceBudget({
        timeline: timelineResult,
        oxygen: standardOxygenAssumptions,
        battery: standardBatteryAssumptions,
      });

      assert.equal(resourceResult.status, "WITHIN_CONFIGURED_BUDGET");
      assert.ok(resourceResult.oxygen?.total_used_g !== null);
      assert.ok(resourceResult.battery?.total_used_wh !== null);
      assert.equal(resourceResult.stages.length, 5); // 3 stops + 2 segments = 5 stages
    });
  });

  // -------------------------------------------------------------------------
  // Scenario B — One-way mission
  // -------------------------------------------------------------------------
  describe("Scenario B: One-Way Mission Verification", () => {
    it("includes only intended travel and science-stop stages without return legs", () => {
      const wpA = makeWp("wp-a", -4.6, 137.4, "base");
      const wpB = makeWp("wp-b", -4.65, 137.45, "science_stop");
      const plan = createWaypointPlan({
        name: "One-Way Transect",
        waypoints: [wpA, wpB],
        mode: "one_way",
      });
      const trajectory = generateGeometricTrajectory(plan);

      const timeline = calculateMissionTimeline(trajectory, {
        walking_speed_m_per_hour: 1000,
        default_science_stop_duration_seconds: 900,
      });

      assert.equal(timeline.status, "COMPLETE_SCENARIO");
      assert.equal(timeline.timeline.length, 2);
      assert.equal(timeline.segments.length, 1);
      assert.equal(timeline.segments[0].is_return_segment, false);

      const resource = calculateResourceBudget({
        timeline,
        oxygen: standardOxygenAssumptions,
        battery: standardBatteryAssumptions,
      });

      // 2 visits -> 2 * 2 - 1 = 3 stages: Stop at A, Segment A->B, Stop at B
      assert.equal(resource.stages.length, 3);
      assert.equal(resource.stages[0].stage_type, "STATIONARY");
      assert.equal(resource.stages[0].reference_id, "wp-a");
      assert.equal(resource.stages[1].stage_type, "TRAVEL");
      assert.equal(resource.stages[1].reference_id, "wp-a->wp-b");
      assert.equal(resource.stages[2].stage_type, "STATIONARY");
      assert.equal(resource.stages[2].reference_id, "wp-b");
      assert.equal(resource.stages.some((s) => s.reference_id.includes("return")), false);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario C — Round-trip mission
  // -------------------------------------------------------------------------
  describe("Scenario C: Round-Trip Mission Verification", () => {
    it("includes return journey exactly once with return segment flagged", () => {
      const wpA = makeWp("base-origin", -4.6, 137.4, "base");
      const wpB = makeWp("science-target", -4.65, 137.45, "science_stop");
      const plan = createWaypointPlan({
        name: "Round-Trip Sortie",
        waypoints: [wpA, wpB],
        mode: "round_trip",
      });
      const trajectory = generateGeometricTrajectory(plan);

      const timeline = calculateMissionTimeline(trajectory, {
        walking_speed_m_per_hour: 1000,
        default_science_stop_duration_seconds: 1200,
        final_destination_duration_seconds: 600,
      });

      assert.equal(timeline.status, "COMPLETE_SCENARIO");
      // Round-trip visits: Base, Science Target, Base Return
      assert.equal(timeline.timeline.length, 3);
      assert.equal(timeline.timeline[2].is_return, true);
      assert.equal(timeline.timeline[2].waypoint_id, "base-origin");
      assert.equal(timeline.timeline[2].stop_duration_seconds, 600);

      // 2 segments: Outbound A->B, Return B->A
      assert.equal(timeline.segments.length, 2);
      assert.equal(timeline.segments[0].is_return_segment, false);
      assert.equal(timeline.segments[1].is_return_segment, true);
      assert.equal(timeline.segments[1].to_waypoint_id, "base-origin");

      const resource = calculateResourceBudget({
        timeline,
        oxygen: standardOxygenAssumptions,
        battery: standardBatteryAssumptions,
      });

      // 3 visits -> 5 stages: Stop A, Travel A->B, Stop B, Travel B->A, Stop A (Return)
      assert.equal(resource.stages.length, 5);
      assert.equal(resource.stages[3].stage_type, "TRAVEL");
      assert.equal(resource.stages[3].reference_id, "science-target->base-origin");
      assert.equal(resource.stages[4].stage_type, "STATIONARY");
      assert.equal(resource.stages[4].reference_id, "base-origin");
      assert.equal(resource.status, "WITHIN_CONFIGURED_BUDGET");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario D — Incomplete route
  // -------------------------------------------------------------------------
  describe("Scenario D: Incomplete Route Handling", () => {
    it("preserves unsupported segments as null, leaves totals unavailable, retains prefix, and sets INSUFFICIENT_DATA", () => {
      // Create incomplete route input directly
      const incompleteInput: TimelineRouteInput = {
        waypoints: [
          makeWp("wp-1", -4.6, 137.4, "base"),
          makeWp("wp-2", -4.62, 137.42, "science_stop"),
          makeWp("wp-3", -4.65, 137.45, "science_stop"),
        ],
        segments: [
          {
            segment_index: 0,
            from_waypoint_id: "wp-1",
            to_waypoint_id: "wp-2",
            distance_metres: 1500,
            status: "SUPPORTED",
            is_return_segment: false,
          },
          {
            segment_index: 1,
            from_waypoint_id: "wp-2",
            to_waypoint_id: "wp-3",
            distance_metres: null, // Unknown segment
            status: "UNSUPPORTED",
            is_return_segment: false,
          },
        ],
        mode: "one_way",
      };

      const timeline = calculateMissionTimeline(incompleteInput, {
        walking_speed_m_per_hour: 1000,
        default_science_stop_duration_seconds: 600,
      });

      assert.equal(timeline.status, "INCOMPLETE_SCENARIO");
      assert.equal(timeline.segments[1].status, "UNSUPPORTED");
      assert.equal(timeline.segments[1].travel_duration_seconds, null);
      assert.equal(timeline.total_mission_seconds, null);
      assert.equal(timeline.total_travel_seconds, null);

      // Supported prefix entries retained
      assert.equal(timeline.timeline[0].departure_elapsed_seconds, 0);
      assert.ok(timeline.timeline[1].arrival_elapsed_seconds !== null && timeline.timeline[1].arrival_elapsed_seconds > 0);
      assert.equal(timeline.timeline[2].arrival_elapsed_seconds, null);

      const resource = calculateResourceBudget({
        timeline,
        oxygen: standardOxygenAssumptions,
        battery: standardBatteryAssumptions,
      });

      assert.equal(resource.status, "INSUFFICIENT_DATA");
      assert.equal(resource.oxygen?.status, "INSUFFICIENT_DATA");
      assert.equal(resource.oxygen?.total_used_g, null);
      assert.equal(resource.battery?.status, "INSUFFICIENT_DATA");
      assert.equal(resource.battery?.total_used_wh, null);

      // Prefix stage 0 (wp-1 stationary) has valid consumption
      assert.ok(resource.stages[0].oxygen_used_g !== null);
      assert.ok(resource.stages[0].battery_used_wh !== null);
      // Prefix stage 1 (wp-1 -> wp-2 travel) has valid consumption
      assert.ok(resource.stages[1].oxygen_used_g !== null);
      assert.ok(resource.stages[1].battery_used_wh !== null);
    });
  });

  // -------------------------------------------------------------------------
  // Scenario E — Missing resource assumptions
  // -------------------------------------------------------------------------
  describe("Scenario E: Missing Resource Assumptions", () => {
    it("reports INSUFFICIENT_DATA when oxygen or battery configurations are absent", () => {
      const wpA = makeWp("wp-1", -4.6, 137.4, "base");
      const wpB = makeWp("wp-2", -4.65, 137.45, "science_stop");
      const plan = createWaypointPlan({
        name: "Simple Plan",
        waypoints: [wpA, wpB],
        mode: "one_way",
      });
      const timeline = calculateMissionTimeline(plan, { walking_speed_m_per_hour: 1000 });

      assert.equal(timeline.status, "COMPLETE_SCENARIO");

      // No oxygen and no battery
      const noAssumptions = calculateResourceBudget({ timeline });
      assert.equal(noAssumptions.status, "INSUFFICIENT_DATA");
      assert.equal(noAssumptions.oxygen?.status, "INSUFFICIENT_DATA");
      assert.equal(noAssumptions.battery?.status, "INSUFFICIENT_DATA");

      // Oxygen provided, battery missing
      const o2Only = calculateResourceBudget({
        timeline,
        oxygen: standardOxygenAssumptions,
      });
      assert.equal(o2Only.status, "INSUFFICIENT_DATA");
      assert.equal(o2Only.oxygen?.status, "WITHIN_CONFIGURED_BUDGET");
      assert.equal(o2Only.battery?.status, "INSUFFICIENT_DATA");

      // Battery provided, oxygen missing
      const batOnly = calculateResourceBudget({
        timeline,
        battery: standardBatteryAssumptions,
      });
      assert.equal(batOnly.status, "INSUFFICIENT_DATA");
      assert.equal(batOnly.oxygen?.status, "INSUFFICIENT_DATA");
      assert.equal(batOnly.battery?.status, "WITHIN_CONFIGURED_BUDGET");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario F — Region independence
  // -------------------------------------------------------------------------
  describe("Scenario F: Region Independence", () => {
    it("executes identically across Gale, Jezero, Oxia, and equatorial regions without environmental coupling", () => {
      const testRegions = [
        { name: "Gale Crater", lat: -4.5895, lon: 137.4417 },
        { name: "Jezero Crater", lat: 18.38, lon: 77.58 },
        { name: "Oxia Planum", lat: 18.275, lon: 335.368 },
        { name: "Martian Equator", lat: 0.0, lon: 0.0 },
      ];

      for (const reg of testRegions) {
        const p1 = makeWp(`${reg.name}-1`, reg.lat, reg.lon, "base");
        const p2 = makeWp(`${reg.name}-2`, reg.lat + 0.01, reg.lon + 0.01, "science_stop");
        const plan = createWaypointPlan({
          name: `${reg.name} Sortie`,
          waypoints: [p1, p2],
          mode: "one_way",
        });
        const traj = generateGeometricTrajectory(plan);

        const tl = calculateMissionTimeline(traj, {
          walking_speed_m_per_hour: 1500,
          default_science_stop_duration_seconds: 1200,
        });
        assert.equal(tl.status, "COMPLETE_SCENARIO", `Timeline failed in ${reg.name}`);
        assert.ok(tl.total_mission_seconds !== null && tl.total_mission_seconds > 0, `Total mission seconds non-positive in ${reg.name}`);

        const rb = calculateResourceBudget({
          timeline: tl,
          oxygen: standardOxygenAssumptions,
          battery: standardBatteryAssumptions,
        });
        assert.equal(rb.status, "WITHIN_CONFIGURED_BUDGET", `Resource budget failed in ${reg.name}`);
        assert.ok(rb.oxygen && rb.oxygen.total_used_g !== null && rb.oxygen.total_used_g > 0, `Oxygen usage non-positive in ${reg.name}`);
        assert.ok(rb.battery && rb.battery.total_used_wh !== null && rb.battery.total_used_wh > 0, `Battery usage non-positive in ${reg.name}`);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Scenario G — Scientific safety & disclaimers
  // -------------------------------------------------------------------------
  describe("Scenario G: Scientific Safety & Disclaimers", () => {
    it("attaches mandatory hypothetical disclaimers and makes no claim of operational EVA safety certification", () => {
      const wpA = makeWp("wp-1", -4.6, 137.4, "base");
      const wpB = makeWp("wp-2", -4.65, 137.45, "science_stop");
      const plan = createWaypointPlan({
        name: "Safety Audit Plan",
        waypoints: [wpA, wpB],
        mode: "one_way",
      });
      const timeline = calculateMissionTimeline(plan, { walking_speed_m_per_hour: 1000 });
      const resource = calculateResourceBudget({
        timeline,
        oxygen: standardOxygenAssumptions,
        battery: standardBatteryAssumptions,
      });

      // Verify disclaimer presence
      assert.equal(timeline.scientific_disclaimer, TIMELINE_DISCLAIMER);
      assert.equal(resource.scientific_disclaimer, RESOURCE_BUDGET_DISCLAIMER);

      // Verify disclaimer content explicitly denies certified EVA readiness
      assert.match(timeline.scientific_disclaimer, /Hypothetical mission timeline estimate/i);
      assert.match(timeline.scientific_disclaimer, /Does not account for terrain relief/i);
      assert.match(resource.scientific_disclaimer, /Hypothetical mission resource budget estimate/i);
      assert.match(resource.scientific_disclaimer, /Arithmetic budget compliance does NOT certify operational EVA safety/i);

      // Verify budget exceedance produces EXCEEDS_CONFIGURED_BUDGET without implying physical catastrophe
      const tightOxygen: OxygenBudgetAssumptions = {
        ...standardOxygenAssumptions,
        capacity_g: 1, // Will definitely exceed
      };
      const exceededResult = calculateResourceBudget({
        timeline,
        oxygen: tightOxygen,
        battery: standardBatteryAssumptions,
      });
      assert.equal(exceededResult.status, "EXCEEDS_CONFIGURED_BUDGET");
      assert.equal(exceededResult.oxygen?.status, "EXCEEDS_CONFIGURED_BUDGET");
      assert.ok(
        exceededResult.oxygen &&
        exceededResult.oxygen.remaining_after_reserve_g !== null &&
        exceededResult.oxygen.remaining_after_reserve_g < 0
      );
    });
  });
});
