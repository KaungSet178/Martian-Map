import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getRegion } from "@/lib/regions/registry";
import type { RegionManifest, Target } from "@/lib/contracts/region";
import { hasVerifiedMapLocation } from "@/lib/map/target-location";
import { TargetCatalog, TargetDetails } from "@/components/science/catalog";
import { missionIssues, newMission, parseMission } from "@/lib/mission/model";

const jezero = getRegion("jezero")!;
const objective = jezero.targets[0];
// Synthetic fixtures verify software behavior, not scientific target locations.
function verified(region: RegionManifest): Target {
  return { ...region.targets[0], coordinates: { latitude: 18.45, longitude_east: 77.4 },
    coordinate_verified: true, verification: "verified", evidence: "Observed",
    source_ids: ["synthetic-test-source"], routing_eligibility: { status: "available", reason: "Software fixture only" } };
}
test("all five Jezero objectives remain nonlocalized and absent from geographic markers", () => {
  assert.equal(jezero.targets.length, 5);
  assert.deepEqual(jezero.targets.filter(t => hasVerifiedMapLocation(t, jezero)), []);
  for (const t of jezero.targets) assert.equal(t.coordinates, null);
});
for (const [name, patch] of [
  ["null coordinates", { coordinates: null }],
  ["unverified coordinates", { coordinate_verified: false }],
  ["pending verification", { verification: "pending" }],
  ["missing verification", { verification: undefined }],
  ["NaN latitude", { coordinates: { latitude: NaN, longitude_east: 77.4 } }],
  ["infinite longitude", { coordinates: { latitude: 18.45, longitude_east: Infinity } }],
  ["west longitude", { coordinates: { latitude: 18.45, longitude_east: -77.4 } }],
  ["longitude 360", { coordinates: { latitude: 18.45, longitude_east: 360 } }],
  ["invalid latitude", { coordinates: { latitude: 91, longitude_east: 77.4 } }],
  ["outside footprint", { coordinates: { latitude: 18.45, longitude_east: 78 } }],
  ["wrong region", { region_id: "gale" }],
  ["wrong coordinate convention", { coordinate_reference: { ...objective.coordinate_reference, latitude_type: "planetographic" } }],
  ["missing sources", { source_ids: [] }],
] as const) {
  test(`geographic markers reject ${name}`, () => {
    const t = { ...verified(jezero), ...patch } as Target;
    assert.equal(hasVerifiedMapLocation(t, jezero), false);
  });
}
test("verified points retain eligibility across all regions and cannot leak on switching", () => {
  for (const id of ["jezero", "gale", "oxia"] as const) {
    const region = { ...getRegion(id)!, map: { ...jezero.map } };
    const t = verified(region);
    assert.equal(hasVerifiedMapLocation(t, region), true);
    const other = getRegion(id === "jezero" ? "gale" : "jezero")!;
    assert.equal(hasVerifiedMapLocation(t, other), false);
  }
});
test("unknown coverage fails closed and wrapped east longitude bounds work", () => {
  const t = verified(jezero);
  assert.equal(hasVerifiedMapLocation(t, { ...jezero, map: { ...jezero.map, supported_extent: null } }), false);
  const region = { ...jezero, map: { ...jezero.map, supported_extent: { west_east: 350, east_east: 10, south_latitude: -10, north_latitude: 10 } } };
  assert.equal(hasVerifiedMapLocation({ ...t, coordinates: { latitude: 0, longitude_east: 0 } }, region), true);
  assert.equal(hasVerifiedMapLocation({ ...t, coordinates: { latitude: 0, longitude_east: 180 } }, region), false);
});
test("nonlocalized objectives remain inspectable and saveable without focus actions or waypoint conversion", () => {
  const html = renderToStaticMarkup(createElement(TargetCatalog, { region: jezero, selected: null, stops: [], onInspect() {}, onToggle() {} }));
  for (const t of jezero.targets) assert.ok(html.includes(t.title));
  assert.ok(html.includes("Location not verified"));
  assert.doesNotMatch(html, /Focus on map|Zoom to target/);
  const details = renderToStaticMarkup(createElement(TargetDetails, { target: objective, region: jezero, added: false, onToggle() {} }));
  assert.ok(details.includes("This scientific objective has no verified map location yet."));
  const mission = { ...newMission(jezero), target_ids: [objective.id] };
  assert.deepEqual(parseMission(JSON.parse(JSON.stringify(mission)), jezero), mission);
  assert.equal(mission.start, null);
  assert.ok(missionIssues(mission, jezero).some(s => s.includes("verified target coordinates")));
  const ambiguous = { ...verified(jezero), verification: undefined } as unknown as Target;
  assert.ok(missionIssues(mission, { ...jezero, targets: [ambiguous] }).some(s => s.includes("verified target coordinates")));
});
