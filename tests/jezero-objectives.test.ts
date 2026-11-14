import test from "node:test";
import assert from "node:assert/strict";
import { getRegion } from "@/lib/regions/registry";
import {
  targetSchema,
  boundarySchema,
  objectiveLocationSchema,
  geoJsonAreaGeometrySchema,
} from "@/lib/contracts/science";
import { createObjectiveAreasGeoJSON } from "@/lib/map/objective-area-layers";

test("Jezero catalog contains exactly five verified/audited scientific objectives", () => {
  const jezero = getRegion("jezero")!;
  assert.equal(jezero.targets.length, 5, "Must retain exactly 5 published Mars 2020 objectives");

  const ids = jezero.targets.map((t) => t.id).sort();
  assert.deepEqual(ids, [
    "jezero-objective-1",
    "jezero-objective-2",
    "jezero-objective-3",
    "jezero-objective-4",
    "jezero-objective-5",
  ]);

  for (const t of jezero.targets) {
    const parseResult = targetSchema.safeParse(t);
    assert.ok(
      parseResult.success,
      `Target ${t.id} failed schema: ${JSON.stringify(parseResult.error?.issues)}`,
    );
    if (t.boundary) {
      assert.ok(boundarySchema.safeParse(t.boundary).success);
    }
    if (t.location) {
      assert.ok(objectiveLocationSchema.safeParse(t.location).success);
    }
  }
});

test("Jezero targets feature defensible location classifications (Point, Mapped, Approximate, Unavailable)", () => {
  const jezero = getRegion("jezero")!;

  // Target 1: Mapped extent (Crater floor geology)
  const t1 = jezero.targets.find((t) => t.id === "jezero-objective-1")!;
  assert.equal(t1.feature_kind, "geological_area");
  assert.equal(t1.coordinates, null);
  assert.equal(t1.coordinate_verified, false);
  assert.equal(t1.boundary?.status, "available");
  if (t1.boundary?.status === "available") {
    assert.equal(t1.boundary.classification, "mapped");
    assert.equal(t1.boundary.geometry.type, "MultiPolygon");
    assert.equal(t1.boundary.source_verified, true);
    assert.equal(t1.boundary.processing_verified, true);
    assert.equal(t1.boundary.registration_verified, false, "Registration must remain unverified");
    assert.ok(t1.boundary.uncertainty_m != null);
  }

  // Target 2: Mapped extent (Ancient habitability / Western Delta)
  const t2 = jezero.targets.find((t) => t.id === "jezero-objective-2")!;
  assert.equal(t2.feature_kind, "geological_area");
  assert.equal(t2.coordinates, null);
  assert.equal(t2.coordinate_verified, false);
  assert.equal(t2.boundary?.status, "available");
  if (t2.boundary?.status === "available") {
    assert.equal(t2.boundary.classification, "mapped");
    assert.equal(t2.boundary.geometry.type, "MultiPolygon");
    assert.equal(t2.boundary.source_verified, true);
    assert.equal(t2.boundary.processing_verified, true);
    assert.equal(t2.boundary.registration_verified, false);
  }

  // Target 3: Verified Point (Three Forks Sample Depot)
  const t3 = jezero.targets.find((t) => t.id === "jezero-objective-3")!;
  assert.equal(t3.feature_kind, "sampling_site");
  assert.ok(t3.coordinates !== null);
  assert.equal(t3.coordinate_verified, true);
  assert.equal(t3.verification, "verified");
  assert.equal(t3.evidence, "Observed");
  assert.equal(t3.location?.type, "point");
  if (t3.location?.type === "point") {
    assert.equal(t3.location.source_verified, true);
    assert.equal(t3.location.processing_verified, true);
    assert.equal(t3.location.registration_verified, false);
    assert.equal(t3.location.uncertainty_m, 60);
    assert.deepEqual(t3.location.coordinates, [77.413598, 18.453697]);
  }

  // Target 4: Approximate area (Delta Front biosignature search corridor)
  const t4 = jezero.targets.find((t) => t.id === "jezero-objective-4")!;
  assert.equal(t4.feature_kind, "geological_area");
  assert.equal(t4.coordinates, null);
  assert.equal(t4.coordinate_verified, false);
  assert.equal(t4.boundary?.status, "available");
  if (t4.boundary?.status === "available") {
    assert.equal(t4.boundary.classification, "approximate");
    assert.equal(t4.boundary.geometry.type, "Polygon");
  }

  // Target 5: Location unavailable (Human-exploration preparation)
  const t5 = jezero.targets.find((t) => t.id === "jezero-objective-5")!;
  assert.equal(t5.coordinates, null);
  assert.equal(t5.coordinate_verified, false);
  assert.equal(t5.boundary?.status, "unavailable");
  assert.equal(t5.location?.type, "unavailable");
  if (t5.boundary?.status === "unavailable") {
    assert.match(t5.boundary.reason, /technology demonstrations/i);
  }
});

test("Jezero geometries have closed LinearRings and fall within the supported extent", () => {
  const jezero = getRegion("jezero")!;
  const extent = jezero.map.supported_extent!;

  for (const t of jezero.targets) {
    if (t.boundary?.status === "available") {
      const geom = t.boundary.geometry;
      assert.ok(geoJsonAreaGeometrySchema.safeParse(geom).success);

      const rings = geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
      for (const ring of rings) {
        assert.ok(ring.length >= 4, "Every ring must have at least 4 coordinates");
        const first = ring[0];
        const last = ring[ring.length - 1];
        assert.equal(first[0], last[0], "First and last longitude must match");
        assert.equal(first[1], last[1], "First and last latitude must match");

        // Verify latitude and longitude domain
        for (const [lon, lat] of ring) {
          assert.ok(lon >= 0 && lon < 360, `Longitude ${lon} out of range`);
          assert.ok(lat >= -90 && lat <= 90, `Latitude ${lat} out of range`);
        }
      }

      // Verify extent overlap with map footprint
      const be = t.boundary.extent;
      assert.ok(
        !(be.east_east < extent.west_east ||
          be.west_east > extent.east_east ||
          be.north_latitude < extent.south_latitude ||
          be.south_latitude > extent.north_latitude),
        `Target ${t.id} extent must intersect map footprint`,
      );
    }
  }

  // Verify Target 3 point coordinates
  const t3 = jezero.targets.find((t) => t.id === "jezero-objective-3")!;
  assert.ok(t3.coordinates!.longitude_east >= extent.west_east);
  assert.ok(t3.coordinates!.longitude_east <= extent.east_east);
  assert.ok(t3.coordinates!.latitude >= extent.south_latitude);
  assert.ok(t3.coordinates!.latitude <= extent.north_latitude);
});

test("Waypoint safety: Geological areas cannot be converted into point waypoints", () => {
  const jezero = getRegion("jezero")!;

  for (const t of jezero.targets) {
    if (t.feature_kind === "geological_area") {
      assert.equal(t.coordinates, null);
      // Attempting to give a geological area a point coordinate must fail schema validation
      const invalid = {
        ...t,
        coordinates: { latitude: 18.45, longitude_east: 77.40 },
      };
      const result = targetSchema.safeParse(invalid);
      assert.equal(result.success, false);
      assert.match(
        result.error!.issues[0].message,
        /Geological areas cannot be represented as precise point waypoints/i,
      );
    }
  }

  // All 5 targets have routing_eligibility unavailable
  for (const t of jezero.targets) {
    assert.equal(t.routing_eligibility.status, "unavailable");
  }
});

test("createObjectiveAreasGeoJSON creates valid FeatureCollection synchronized with stops", () => {
  const jezero = getRegion("jezero")!;

  // 1. showAll = true: Includes all targets with available boundaries (Targets 1, 2, 4)
  const allAreas = createObjectiveAreasGeoJSON(jezero, null, [], true);
  assert.equal(allAreas.type, "FeatureCollection");
  assert.equal(allAreas.features.length, 3, "Targets 1, 2, 4 have boundaries");
  const featIds = allAreas.features.map((f) => f.id).sort();
  assert.deepEqual(featIds, ["jezero-objective-1", "jezero-objective-2", "jezero-objective-4"]);

  // 2. stops filtering: When stops = ["jezero-objective-2"], only Target 2 is shown
  const filtered = createObjectiveAreasGeoJSON(jezero, null, ["jezero-objective-2"], false);
  assert.equal(filtered.features.length, 1);
  assert.equal(filtered.features[0].id, "jezero-objective-2");

  // 3. Selection highlight
  const selected = createObjectiveAreasGeoJSON(jezero, "jezero-objective-2", ["jezero-objective-2"], false);
  assert.equal(selected.features[0].properties?.selected, true);

  // 4. Focused target override
  const focused = createObjectiveAreasGeoJSON(
    jezero,
    null,
    [],
    false,
    "jezero-objective-1",
  );
  assert.equal(focused.features.length, 1);
  assert.equal(focused.features[0].id, "jezero-objective-1");
});

test("Source lineage: Every target references valid sources in region config", () => {
  const jezero = getRegion("jezero")!;
  const knownSourceIds = new Set(jezero.source_references.map((s) => s.id));

  for (const t of jezero.targets) {
    assert.ok(t.source_ids.length > 0, `Target ${t.id} must have source references`);
    for (const sid of t.source_ids) {
      assert.ok(
        knownSourceIds.has(sid),
        `Target ${t.id} references unknown source ${sid}`,
      );
    }
    if (t.boundary?.status === "available" && t.boundary.source_ids) {
      for (const sid of t.boundary.source_ids) {
        assert.ok(
          knownSourceIds.has(sid),
          `Boundary for ${t.id} references unknown source ${sid}`,
        );
      }
    }
  }
});

test("Region isolation: Jezero area layers never appear in Gale or Oxia", () => {
  const gale = getRegion("gale")!;
  const oxia = getRegion("oxia")!;

  const galeAreas = createObjectiveAreasGeoJSON(gale, null, undefined, true);
  for (const f of galeAreas.features) {
    assert.ok(
      typeof f.id === "string" && f.id.startsWith("gale-"),
      `Gale area feature has foreign ID ${String(f.id)}`,
    );
  }

  const oxiaAreas = createObjectiveAreasGeoJSON(oxia, null, undefined, true);
  assert.equal(oxiaAreas.features.length, 0, "Oxia targets do not have boundaries");
});
