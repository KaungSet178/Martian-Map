import { test } from "node:test";
import assert from "node:assert/strict";
import { regions } from "@/lib/regions/registry";
import type { RegionManifest } from "@/lib/contracts/region";
import {
  newMission,
  parseMission,
  readMissions,
  saveMission,
  type Mission,
} from "@/lib/mission/model";
import {
  createWaypoint,
  createWaypointPlan,
} from "@/lib/mission/waypoint-planning";
import {
  initWaypointPlanFromMission,
  syncMissionWithWaypointPlan,
  syncWaypointPlanWithMission,
} from "@/lib/mission/waypoint-bridge";

// Fixture helper: Create a synthetic region manifest with both verified and unverified targets
function createTestRegion(): RegionManifest {
  const base = regions.jezero;
  return {
    ...base,
    id: "jezero",
    targets: [
      {
        ...base.targets[0],
        id: "target-unverified-1",
        title: "Unverified Geological Area",
        coordinates: null,
        coordinate_verified: false,
      },
      {
        ...base.targets[1],
        id: "target-verified-1",
        title: "Verified Outcrop Point",
        coordinates: { latitude: 18.38, longitude_east: 77.58 },
        coordinate_verified: true,
      },
      {
        ...base.targets[1],
        id: "target-verified-2",
        title: "Verified Delta Front Point",
        coordinates: { latitude: 18.42, longitude_east: 77.62 },
        coordinate_verified: true,
      },
    ],
  };
}

test("initWaypointPlanFromMission: empty mission produces valid baseline plan", () => {
  const region = createTestRegion();
  const m = newMission(region);
  const plan = initWaypointPlanFromMission(m, region);

  assert.equal(plan.name, m.name);
  assert.equal(plan.region_id, "jezero");
  assert.equal(plan.mode, "round_trip");
  assert.equal(plan.waypoints.length, 0);
  assert.equal(plan.recovery_assumption, undefined);
});

test("initWaypointPlanFromMission: start coordinates become Base Camp waypoint", () => {
  const region = createTestRegion();
  const m: Mission = {
    ...newMission(region),
    start: { latitude: 18.35, longitude_east: 77.52 },
  };

  const plan = initWaypointPlanFromMission(m, region);
  assert.equal(plan.waypoints.length, 1);
  assert.equal(plan.waypoints[0].role, "base");
  assert.equal(plan.waypoints[0].provenance, "user_planning_input");
  assert.deepEqual(plan.waypoints[0].coordinates, {
    latitude: 18.35,
    longitude_east: 77.52,
  });
});

test("initWaypointPlanFromMission: unverified targets are NOT converted to geographic waypoints", () => {
  const region = createTestRegion();
  const m: Mission = {
    ...newMission(region),
    target_ids: ["target-unverified-1"],
  };

  const plan = initWaypointPlanFromMission(m, region);
  // Must remain empty because the target lacks verified coordinates
  assert.equal(plan.waypoints.length, 0);
});

test("initWaypointPlanFromMission: verified targets are converted to science_stop waypoints", () => {
  const region = createTestRegion();
  const m: Mission = {
    ...newMission(region),
    target_ids: ["target-unverified-1", "target-verified-1"],
  };

  const plan = initWaypointPlanFromMission(m, region);
  // Only the verified target should produce a waypoint
  assert.equal(plan.waypoints.length, 1);
  assert.equal(plan.waypoints[0].role, "science_stop");
  assert.equal(plan.waypoints[0].target_id, "target-verified-1");
  assert.equal(plan.waypoints[0].provenance, "verified_science_target");
  assert.deepEqual(plan.waypoints[0].coordinates, {
    latitude: 18.38,
    longitude_east: 77.58,
  });
});

test("initWaypointPlanFromMission: one-way mission with endpoint creates recovery waypoint", () => {
  const region = createTestRegion();
  const m: Mission = {
    ...newMission(region),
    direction: "one",
    start: { latitude: 18.35, longitude_east: 77.52 },
    target_ids: ["target-verified-1"],
    endpoint: { latitude: 18.45, longitude_east: 77.65 },
    recovery_assumption: "Sample return rover pickup rendezvous",
  };

  const plan = initWaypointPlanFromMission(m, region);
  assert.equal(plan.mode, "one_way");
  assert.equal(
    plan.recovery_assumption,
    "Sample return rover pickup rendezvous",
  );
  assert.equal(plan.waypoints.length, 3);
  assert.equal(plan.waypoints[0].role, "base");
  assert.equal(plan.waypoints[1].role, "science_stop");
  assert.equal(plan.waypoints[2].role, "recovery_endpoint");
  assert.deepEqual(plan.waypoints[2].coordinates, {
    latitude: 18.45,
    longitude_east: 77.65,
  });
});

test("initWaypointPlanFromMission: existing valid waypoint_plan is returned as-is", () => {
  const region = createTestRegion();
  const existingPlan = createWaypointPlan({
    name: "Custom Existing Plan",
    region_id: "jezero",
    waypoints: [
      createWaypoint({
        id: "custom-wp-1",
        label: "Intermediate Ridge",
        role: "intermediate",
        coordinates: { latitude: 18.4, longitude_east: 77.6 },
        provenance: "user_planning_input",
      }),
    ],
  });

  const m: Mission = {
    ...newMission(region),
    waypoint_plan: existingPlan,
  };

  const plan = initWaypointPlanFromMission(m, region);
  assert.deepEqual(plan, existingPlan);
  assert.equal(plan.waypoints[0].label, "Intermediate Ridge");
});

test("syncMissionWithWaypointPlan: syncs base, endpoint, target_ids, and preserves unverified targets", () => {
  const region = createTestRegion();
  const baseWp = createWaypoint({
    id: "base-1",
    label: "Habitat",
    role: "base",
    coordinates: { latitude: 18.35, longitude_east: 77.52 },
    provenance: "user_planning_input",
  });
  const scienceWp = createWaypoint({
    id: "sc-1",
    label: "Delta Front",
    role: "science_stop",
    target_id: "target-verified-2",
    coordinates: { latitude: 18.42, longitude_east: 77.62 },
    provenance: "verified_science_target",
  });
  const intermediateWp = createWaypoint({
    id: "turn-1",
    label: "Dune Bypass",
    role: "intermediate",
    coordinates: { latitude: 18.44, longitude_east: 77.64 },
    provenance: "user_planning_input",
  });
  const recoveryWp = createWaypoint({
    id: "rec-1",
    label: "Recovery Zone",
    role: "recovery_endpoint",
    coordinates: { latitude: 18.48, longitude_east: 77.7 },
    provenance: "user_planning_input",
  });

  const plan = createWaypointPlan({
    name: "Traverse to Delta",
    region_id: "jezero",
    waypoints: [baseWp, scienceWp, intermediateWp, recoveryWp],
    mode: "one_way",
    recovery_assumption: "Airlock extraction",
  });

  const initialMission: Mission = {
    ...newMission(region),
    // Initially has an unverified target that cannot be a geographic waypoint
    target_ids: ["target-unverified-1"],
  };

  const synced = syncMissionWithWaypointPlan(initialMission, plan, region);
  assert.equal(synced.name, "Traverse to Delta");
  assert.equal(synced.direction, "one");
  assert.equal(synced.recovery_assumption, "Airlock extraction");
  assert.deepEqual(synced.start, {
    latitude: 18.35,
    longitude_east: 77.52,
  });
  assert.deepEqual(synced.endpoint, {
    latitude: 18.48,
    longitude_east: 77.7,
  });
  // target_ids must include the waypoint's verified target AND preserve the unverified target
  assert.ok(synced.target_ids.includes("target-verified-2"));
  assert.ok(synced.target_ids.includes("target-unverified-1"));
  assert.equal(synced.waypoint_plan, plan);
});

test("syncWaypointPlanWithMission: preserves intermediate waypoints when science targets change", () => {
  const region = createTestRegion();
  const intermediateWp = createWaypoint({
    id: "turn-1",
    label: "Crater Ridge Waypoint",
    role: "intermediate",
    coordinates: { latitude: 18.36, longitude_east: 77.55 },
    provenance: "user_planning_input",
  });

  const plan = createWaypointPlan({
    name: "Mission",
    region_id: "jezero",
    waypoints: [intermediateWp],
  });

  const m: Mission = {
    ...newMission(region),
    name: "Updated Field Plan",
    direction: "round",
    start: { latitude: 18.35, longitude_east: 77.52 },
    target_ids: ["target-verified-1"],
    waypoint_plan: plan,
  };

  const updatedPlan = syncWaypointPlanWithMission(m, region);
  assert.equal(updatedPlan.name, "Updated Field Plan");
  assert.equal(updatedPlan.waypoints.length, 3);
  // Index 0: Base
  assert.equal(updatedPlan.waypoints[0].role, "base");
  // Intermediate waypoint preserved
  assert.equal(
    updatedPlan.waypoints.some((w) => w.id === "turn-1"),
    true,
  );
  // Verified science target added
  assert.equal(
    updatedPlan.waypoints.some((w) => w.target_id === "target-verified-1"),
    true,
  );
});

test("persistence: backward-compatible save and load of missions with and without waypoint_plan", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };

  const region = createTestRegion();

  // 1. Save legacy mission without waypoint_plan
  const legacyMission = newMission(region);
  saveMission(storage, legacyMission);

  let [loaded] = readMissions(storage);
  assert.equal(loaded.id, legacyMission.id);
  assert.equal(loaded.waypoint_plan, undefined);

  // Upgrades cleanly on demand
  const upgradedPlan = initWaypointPlanFromMission(loaded, region);
  assert.ok(upgradedPlan);
  assert.equal(upgradedPlan.name, legacyMission.name);

  // 2. Save modern mission with waypoint_plan
  const plan = createWaypointPlan({
    name: "Extended Plan",
    region_id: "jezero",
    waypoints: [
      createWaypoint({
        id: "wp-1",
        label: "Landing Site",
        role: "base",
        coordinates: { latitude: 18.38, longitude_east: 77.58 },
        provenance: "user_planning_input",
      }),
    ],
  });
  const modernMission: Mission = {
    ...legacyMission,
    waypoint_plan: plan,
  };

  saveMission(storage, modernMission);
  [loaded] = readMissions(storage);
  assert.ok(loaded.waypoint_plan);
  assert.equal(loaded.waypoint_plan.name, "Extended Plan");
  assert.equal(loaded.waypoint_plan.waypoints.length, 1);
  assert.equal(loaded.waypoint_plan.waypoints[0].role, "base");
});

test("parseMission: enforces regional state isolation for waypoint_plan", () => {
  const region = createTestRegion();
  const foreignPlan = createWaypointPlan({
    name: "Gale Plan",
    region_id: "gale",
    waypoints: [],
  });
  const crossRegionMission: Mission = {
    ...newMission(region),
    waypoint_plan: foreignPlan,
  };

  assert.throws(
    () => parseMission(crossRegionMission, region),
    /Regional state must remain strictly isolated/,
  );
});
