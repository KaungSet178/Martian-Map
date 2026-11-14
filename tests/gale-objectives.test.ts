import test from "node:test";
import assert from "node:assert/strict";
import { getRegion } from "@/lib/regions/registry";
import { targetSchema, boundarySchema, objectiveLocationSchema } from "@/lib/contracts/science";
import { newMission, parseMission, missionIssues } from "@/lib/mission/model";
import { findTarget, isRetiredTarget, getRetiredTargets } from "@/lib/mission/target-lookup";
import { createObjectiveAreasGeoJSON } from "@/lib/map/objective-area-layers";

test("Gale active catalog excludes all scenario objectives and retains 4 interpreted objectives", () => {
  const gale = getRegion("gale")!;

  // 1. Scenario objectives removed from active catalog
  const scenarioTargets = gale.targets.filter(
    (t) => t.evidence === "Scenario" || t.feature_kind === "scenario_objective" || t.id.startsWith("gale-objective-"),
  );
  assert.equal(scenarioTargets.length, 0, "No scenario objectives allowed in active Gale catalog");

  // 2. Exact count of active objectives is 4
  assert.equal(gale.targets.length, 4, "Active Gale catalog must contain exactly 4 verified interpreted objectives");

  // 3. Exactly the 4 legitimate interpreted objectives
  const activeIds = gale.targets.map((t) => t.id).sort();
  assert.deepEqual(
    activeIds,
    ["gale-gediz-vallis", "gale-glen-torridon", "gale-sulfate-units", "gale-vera-rubin-ridge"].sort(),
  );

  // 4. All active objectives are legitimate Interpreted evidence
  for (const t of gale.targets) {
    assert.equal(t.evidence, "Interpreted");
    assert.equal(t.feature_kind, "geological_area");
    assert.equal(t.coordinates, null, "Geological areas must have null coordinates to prevent fake centroids");
    assert.equal(t.coordinate_verified, false);
    assert.equal(t.routing_eligibility.status, "unavailable");
  }
});

test("Gale retired scenario targets are cataloged for backward compatibility but non-selectable", () => {
  const retired = getRetiredTargets("gale");
  assert.equal(retired.length, 3);
  const retiredIds = retired.map((t) => t.id).sort();
  assert.deepEqual(retiredIds, ["gale-objective-1", "gale-objective-2", "gale-objective-3"]);

  for (const t of retired) {
    assert.equal(isRetiredTarget("gale", t.id), true);
    assert.equal(t.evidence, "Scenario");
    assert.equal(t.verification, "scenario");
    assert.equal(t.routing_eligibility.status, "unavailable");
    assert.ok(targetSchema.safeParse(t).success);
  }

  assert.equal(isRetiredTarget("gale", "gale-glen-torridon"), false);
  assert.equal(isRetiredTarget("jezero", "gale-objective-1"), false);
});

test("Saved missions with retired scenario objectives load cleanly without throwing", () => {
  const gale = getRegion("gale")!;
  const baseMission = newMission(gale);

  // Saved plan referencing old scenario objective
  const oldPlan = {
    ...baseMission,
    target_ids: ["gale-objective-1", "gale-glen-torridon"],
  };

  // parseMission must succeed
  const parsed = parseMission(oldPlan, gale);
  assert.deepEqual(parsed.target_ids, ["gale-objective-1", "gale-glen-torridon"]);

  // target resolution must resolve both active and retired
  const target1 = findTarget(gale, "gale-objective-1");
  assert.ok(target1);
  assert.equal(target1.title, "Layered sedimentary unit (Retired)");

  const target2 = findTarget(gale, "gale-glen-torridon");
  assert.ok(target2);
  assert.equal(target2.title, "Glen Torridon");

  // missionIssues flags the retired objective
  const issues = missionIssues(parsed, gale);
  assert.ok(issues.some((issue) => issue.includes("retired scenario objective")));

  // Foreign or truly unknown IDs must still throw
  assert.throws(
    () => parseMission({ ...baseMission, target_ids: ["completely-unknown-id"] }, gale),
    /unknown region or objective IDs/i,
  );
});

test("Gale geographic areas feature source-backed classifications, extents, and closed geometries", () => {
  const gale = getRegion("gale")!;
  const missionFootprint = gale.map.supported_extent!;

  // 1. Gediz Vallis: Mapped extent
  const gediz = gale.targets.find((t) => t.id === "gale-gediz-vallis")!;
  assert.equal(gediz.boundary?.status, "available");
  if (gediz.boundary?.status === "available") {
    assert.equal(gediz.boundary.classification, "mapped");
    assert.equal(gediz.boundary.geometry.type, "MultiPolygon");
    assert.equal(gediz.boundary.source_verified, true);
    assert.equal(gediz.boundary.processing_verified, true);
    assert.equal(gediz.boundary.registration_verified, true);
    assert.equal(gediz.boundary.uncertainty_m, 5.0);

    // Verify extent within mission footprint
    const ext = gediz.boundary.extent;
    assert.ok(ext.west_east >= missionFootprint.west_east);
    assert.ok(ext.east_east <= missionFootprint.east_east);
    assert.ok(ext.south_latitude >= missionFootprint.south_latitude);
    assert.ok(ext.north_latitude <= missionFootprint.north_latitude);

    // Verify MultiPolygon rings are closed
    for (const poly of gediz.boundary.geometry.coordinates) {
      for (const ring of poly) {
        assert.deepEqual(ring[0], ring[ring.length - 1]);
      }
    }
  }

  // 2. Vera Rubin Ridge: Approximate area
  const vrr = gale.targets.find((t) => t.id === "gale-vera-rubin-ridge")!;
  assert.equal(vrr.boundary?.status, "available");
  if (vrr.boundary?.status === "available") {
    assert.equal(vrr.boundary.classification, "approximate");
    assert.equal(vrr.boundary.geometry.type, "Polygon");
    assert.equal(vrr.boundary.source_verified, true);
    assert.equal(vrr.boundary.processing_verified, true);
    assert.equal(vrr.boundary.registration_verified, false); // documented limitation
    assert.equal(vrr.boundary.uncertainty_m, 50.0);

    const ext = vrr.boundary.extent;
    assert.ok(ext.west_east >= missionFootprint.west_east);
    assert.ok(ext.east_east <= missionFootprint.east_east);
    assert.ok(ext.south_latitude >= missionFootprint.south_latitude);
    assert.ok(ext.north_latitude <= missionFootprint.north_latitude);

    for (const ring of vrr.boundary.geometry.coordinates) {
      assert.deepEqual(ring[0], ring[ring.length - 1]);
    }
  }

  // 3. Glen Torridon: Approximate area
  const glen = gale.targets.find((t) => t.id === "gale-glen-torridon")!;
  assert.equal(glen.boundary?.status, "available");
  if (glen.boundary?.status === "available") {
    assert.equal(glen.boundary.classification, "approximate");
    assert.equal(glen.boundary.geometry.type, "Polygon");
    assert.equal(glen.boundary.source_verified, true);
    assert.equal(glen.boundary.processing_verified, true);
    assert.equal(glen.boundary.registration_verified, false);
    assert.equal(glen.boundary.uncertainty_m, 50.0);

    const ext = glen.boundary.extent;
    assert.ok(ext.west_east >= missionFootprint.west_east);
    assert.ok(ext.east_east <= missionFootprint.east_east);
    assert.ok(ext.south_latitude >= missionFootprint.south_latitude);
    assert.ok(ext.north_latitude <= missionFootprint.north_latitude);

    for (const ring of glen.boundary.geometry.coordinates) {
      assert.deepEqual(ring[0], ring[ring.length - 1]);
    }
  }

  // 4. Sulfate units: Candidate search region
  const sulfate = gale.targets.find((t) => t.id === "gale-sulfate-units")!;
  assert.equal(sulfate.boundary?.status, "available");
  if (sulfate.boundary?.status === "available") {
    assert.equal(sulfate.boundary.classification, "candidate");
    assert.equal(sulfate.boundary.geometry.type, "Polygon");
    assert.equal(sulfate.boundary.source_verified, true);
    assert.equal(sulfate.boundary.processing_verified, true);
    assert.equal(sulfate.boundary.registration_verified, false);
    assert.equal(sulfate.boundary.uncertainty_m, 100.0);

    const ext = sulfate.boundary.extent;
    assert.ok(ext.west_east >= missionFootprint.west_east);
    assert.ok(ext.east_east <= missionFootprint.east_east);
    assert.ok(ext.south_latitude >= missionFootprint.south_latitude);
    assert.ok(ext.north_latitude <= missionFootprint.north_latitude);

    for (const ring of sulfate.boundary.geometry.coordinates) {
      assert.deepEqual(ring[0], ring[ring.length - 1]);
    }
  }
});

test("Three supported location representations (point, area, unavailable) validate against contracts", () => {
  // Representation A: Verified Point
  const pointLoc = objectiveLocationSchema.safeParse({
    type: "point",
    coordinates: [137.401, -4.701],
    source_verified: true,
    processing_verified: true,
    registration_verified: true,
    source_ids: ["gale-mission-context"],
    uncertainty_m: 1.0,
  });
  assert.ok(pointLoc.success);

  // Representation B: Source-Supported Geographic Area (Polygon & MultiPolygon)
  const polygonArea = objectiveLocationSchema.safeParse({
    type: "area",
    classification: "approximate",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [137.35, -4.72],
          [137.38, -4.70],
          [137.40, -4.71],
          [137.37, -4.73],
          [137.35, -4.72],
        ],
      ],
    },
    extent: { west_east: 137.35, east_east: 137.40, south_latitude: -4.73, north_latitude: -4.70 },
    source_verified: true,
    processing_verified: true,
    registration_verified: false,
    source_ids: ["gale-geology-publication"],
    limitations: ["Approximate geological envelope"],
    uncertainty_m: 50.0,
  });
  assert.ok(polygonArea.success);

  // Representation C: Location Unavailable
  const unavailLoc = objectiveLocationSchema.safeParse({
    type: "unavailable",
    reason: "Location not verified. Independent geospatial source pending.",
  });
  assert.ok(unavailLoc.success);

  // Unclosed linear rings must fail
  const unclosed = boundarySchema.safeParse({
    status: "available",
    classification: "approximate",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [137.35, -4.72],
          [137.38, -4.70],
          [137.40, -4.71],
          [137.37, -4.73], // missing closure
        ],
      ],
    },
    extent: { west_east: 137.35, east_east: 137.40, south_latitude: -4.73, north_latitude: -4.70 },
  });
  assert.equal(unclosed.success, false);
});

test("Waypoint safety: geological area targets cannot be converted into point waypoints", () => {
  const gale = getRegion("gale")!;
  for (const t of gale.targets) {
    // Geological area targets must have null coordinates
    assert.equal(t.coordinates, null);
    assert.equal(t.coordinate_verified, false);

    // Attempting to inject fake coordinates into a geological area must fail contract validation
    const fakePointTarget = {
      ...t,
      coordinates: { latitude: -4.78, longitude_east: 137.41 },
      coordinate_verified: true,
    };
    const parsed = targetSchema.safeParse(fakePointTarget);
    assert.equal(parsed.success, false);
  }
});

test("MapLibre GeoJSON generator produces valid FeatureCollection for Gale and empty for regions without areas", () => {
  const gale = getRegion("gale")!;
  const geojson = createObjectiveAreasGeoJSON(gale, "gale-gediz-vallis");

  assert.equal(geojson.type, "FeatureCollection");
  assert.equal(geojson.features.length, 4);

  const selectedFeat = geojson.features.find((f) => f.properties?.id === "gale-gediz-vallis");
  assert.ok(selectedFeat);
  assert.equal(selectedFeat?.properties?.selected, true);

  const unselectedFeat = geojson.features.find((f) => f.properties?.id === "gale-glen-torridon");
  assert.ok(unselectedFeat);
  assert.equal(unselectedFeat?.properties?.selected, false);

  // Jezero currently has no targets with available boundary, so features must be empty
  const jezero = getRegion("jezero")!;
  const jezeroGeojson = createObjectiveAreasGeoJSON(jezero, null);
  assert.equal(jezeroGeojson.features.length, 0);

  // Oxia currently has point detections only, so area features must be empty
  const oxia = getRegion("oxia")!;
  const oxiaGeojson = createObjectiveAreasGeoJSON(oxia, null);
  assert.equal(oxiaGeojson.features.length, 0);
});

test("Region isolation: Jezero and Oxia remain strictly unaffected and reject Gale targets", () => {
  const jezero = getRegion("jezero")!;
  const oxia = getRegion("oxia")!;

  assert.equal(jezero.id, "jezero");
  assert.equal(oxia.id, "oxia");

  // Oxia targets are preserved (3 detection targets)
  assert.equal(oxia.targets.length, 3);
  assert.ok(oxia.targets.every((t) => t.region_id === "oxia"));

  // Cross-region target rejection
  const oxiaMission = newMission(oxia);
  assert.throws(
    () => parseMission({ ...oxiaMission, target_ids: ["gale-glen-torridon"] }, oxia),
    /unknown region or objective IDs/i,
  );
  assert.throws(
    () => parseMission({ ...oxiaMission, target_ids: ["gale-objective-1"] }, oxia),
    /unknown region or objective IDs/i,
  );

  const jezeroMission = newMission(jezero);
  assert.throws(
    () => parseMission({ ...jezeroMission, target_ids: ["gale-gediz-vallis"] }, jezero),
    /unknown region or objective IDs/i,
  );
});
