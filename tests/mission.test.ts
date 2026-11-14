import { test } from "node:test";
import assert from "node:assert/strict";
import { regions, regionIds } from "@/lib/regions/registry";
import { overallStatus, regionSchema } from "@/lib/contracts/region";
import {
  newMission,
  moveStop,
  missionIssues,
  parseMission,
  readMissions,
  saveMission,
  STORAGE_KEY,
} from "@/lib/mission/model";
import { routeAvailability } from "@/lib/api/planning";

test("all region fixtures obey shared contract and cannot imply scientific readiness", () => {
  for (const id of regionIds) {
    const region = regionSchema.parse(regions[id]);
    assert.equal(region.routing.enabled, false);
    assert.equal(region.capabilities.validated_routing.status, "unavailable");
    assert.equal(region.capabilities.mission_feasibility.status, "unavailable");
    assert.equal(region.capabilities.terrain_coverage.status, id === "gale" ? "partial" : "unknown");
    assert.ok(
      region.targets.every(
        (t) => t.coordinates === null && !t.coordinate_verified,
      ),
    );
    if (id === "gale") {
      assert.equal(region.data_status, "metadata_verified");
      assert.deepEqual(
        region.layers.filter((l) => l.availability === "available").map((l) => l.id),
        [
          "gale-context",
          "gale-optical",
          "gale-regional-elevation",
          "gale-regional-hillshade",
          "gale-regional-slope",
          "gale-thermal",
          "gale-global-elevation",
          "gale-global-hillshade",
          "gale-global-slope",
          "gale-terrain",
          "gale-hillshade",
          "gale-slope",
          "gale-geology",
          "gale-traverse-recorded",
          "gale-coverage-regional",
          "gale-coverage-global",
        ],
      );
    } else {
      assert.equal(region.data_status, "illustrative");
      assert.ok(region.layers.every((l) => l.availability !== "available"));
    }
  }
});
test("individual stop moves preserve membership and boundaries", () => {
  assert.deepEqual(moveStop(["a", "b", "c"], "b", 1), ["a", "c", "b"]);
  assert.deepEqual(moveStop(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  assert.deepEqual(moveStop(["a", "b"], "missing", 1), ["a", "b"]);
});
test("one-way endpoints, unknown target locations and stale datasets block readiness", () => {
  const m = {
    ...newMission(regions.gale),
    target_ids: [regions.gale.targets[0].id],
    direction: "one" as const,
    dataset_version: "old",
  };
  const issues = missionIssues(m, regions.gale).join(" ");
  assert.match(issues, /recovery endpoint/);
  assert.match(issues, /recovery assumption/);
  assert.match(issues, /target coordinates/);
  assert.match(issues, /Dataset version changed/);
  assert.equal(routeAvailability(m, regions.gale, false).status, "unavailable");
});
test("saved plans retain independent reserves, stop order, versions and timestamps", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const m = {
    ...newMission(regions.jezero),
    target_ids: [regions.jezero.targets[1].id, regions.jezero.targets[0].id],
    oxygen_reserve_percent: 30,
    battery_reserve_percent: 40,
  };
  saveMission(storage, m);
  const [restored] = readMissions(storage);
  assert.deepEqual(restored.target_ids, m.target_ids);
  assert.equal(restored.battery_reserve_percent, 40);
  assert.equal(restored.oxygen_reserve_percent, 30);
  assert.equal(restored.dataset_version, m.dataset_version);
  assert.ok(restored.saved_at);
  saveMission(storage, { ...m, name: "Updated" });
  assert.equal(readMissions(storage).length, 1);
  data.set(STORAGE_KEY, "broken");
  assert.throws(() => saveMission(storage, m));
  assert.equal(data.get(STORAGE_KEY), "broken");
});
test("imports reject foreign, duplicate and unknown objectives without trusting results", () => {
  const m = newMission(regions.oxia);
  assert.throws(() =>
    parseMission({ ...m, target_ids: ["gale-objective-1"] }, regions.oxia),
  );
  assert.throws(() =>
    parseMission(
      { ...m, target_ids: ["oxia-objective-1", "oxia-objective-1"] },
      regions.oxia,
    ),
  );
  assert.throws(() =>
    parseMission({ ...m, schema_version: 900 }, regions.oxia),
  );
  assert.throws(() =>
    parseMission({ ...m, oxygen_reserve_percent: 999 }, regions.oxia),
  );
});
test("known mandatory failure outranks missing evidence; six checks required for feasible", () => {
  assert.equal(overallStatus(["Infeasible", "Unverified"]), "Infeasible");
  assert.equal(overallStatus(["Feasible"]), "Unverified");
  assert.equal(overallStatus(Array(6).fill("Feasible")), "Feasible");
  assert.equal(
    overallStatus([
      "Feasible",
      "Feasible",
      "Caution",
      "Feasible",
      "Feasible",
      "Feasible",
    ]),
    "Caution",
  );
});
