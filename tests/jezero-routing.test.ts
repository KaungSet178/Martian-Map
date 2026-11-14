/**
 * Marswalk Planner — Jezero Crater Terrain Routing Test Suite
 *
 * Validates:
 * 1. Mathematical and planetary geodetic correctness (Mars sphere, no Earth radius defaults).
 * 2. Graph search algorithm correctness (A*, Dijkstra, diagonal metrics, nodata barriers).
 * 3. Waypoint snapping and JZ-T1A scientific target safeguards.
 * 4. Genuine route alternatives (Shortest vs Lower-Terrain-Cost).
 * 5. Full integration with authentic Jezero DEM routing grid.
 * 6. Conformance with the Gale/Jezero shared route-output contract.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MARS_RADIUS_METERS,
  marsGreatCircleDistanceMeters,
  lonLatToEquirectangularMeters,
  equirectangularMetersToLonLat,
  TerrainGrid,
  TerrainCostModel,
  searchPathAStar,
  validateAndSnapWaypoints,
  planJezeroSegmentRoute,
  planJezeroRouteAlternatives,
  loadJezeroRoutingGrid,
  type SerializedGridData,
  type WaypointInput,
} from "../lib/routing/jezero";

describe("Planetary Geodesic & Coordinate Transforms", () => {
  test("Mars sphere radius is used; Earth radius is strictly rejected", () => {
    assert.equal(MARS_RADIUS_METERS, 3396190.0);

    // 1 degree along meridian on Mars
    const dist1DegMars = marsGreatCircleDistanceMeters([0, 0], [0, 1]);
    const expected1DegMars = (Math.PI / 180.0) * 3396190.0;
    assert.ok(Math.abs(dist1DegMars - expected1DegMars) < 1e-3);

    // Earth 1 degree is ~111.2 km; Mars is ~59.3 km. Verify no Earth default.
    assert.ok(dist1DegMars < 60000.0);
    assert.ok(dist1DegMars > 59000.0);
  });

  test("Equirectangular forward and inverse projections roundtrip exactly", () => {
    const testCoords: [number, number][] = [
      [77.450886, 18.444627], // Perseverance landing site
      [77.380000, 18.455000], // Delta front
      [77.250000, 18.410000], // Western Jezero
    ];

    for (const [lon, lat] of testCoords) {
      const [east, north] = lonLatToEquirectangularMeters(lon, lat);
      const [lonOut, latOut] = equirectangularMetersToLonLat(east, north);
      assert.ok(Math.abs(lon - lonOut) < 1e-8);
      assert.ok(Math.abs(lat - latOut) < 1e-8);
    }
  });
});

describe("Synthetic Algorithm Correctness Tests", () => {
  function makeSyntheticGrid(
    width: number,
    height: number,
    fillElev = -2500.0,
    fillSlope = 2.0,
    spacing = 25.0
  ): TerrainGrid {
    const total = width * height;
    const elevations = new Array(total).fill(fillElev);
    const slopes = new Array(total).fill(fillSlope);
    const validMask = new Array(total).fill(1);

    const data: SerializedGridData = {
      metadata: {
        datasetId: "synthetic-test-grid",
        sourceProduct: "Synthetic Grid",
        doi: "test",
        crs: "Equirectangular",
        projection: "Equirectangular",
        marsRadiusMeters: MARS_RADIUS_METERS,
        standardParallelDegrees: 0,
        centerLongitudeDegrees: 0,
        gridSpacingMeters: spacing,
        width,
        height,
        bounds: {
          west: 77.3,
          east: 77.35,
          south: 18.4,
          north: 18.45,
        },
        elevationRangeMeters: [fillElev, fillElev],
        slopeRangeDegrees: [fillSlope, fillSlope],
        nodataValue: -9999.0,
      },
      elevations,
      slopes,
      validMask,
    };

    return new TerrainGrid(data);
  }

  test("A* straight-line horizontal path on flat terrain", () => {
    const grid = makeSyntheticGrid(10, 10);
    const costModel = new TerrainCostModel("shortest");
    const result = searchPathAStar(grid, costModel, 1, 1, 8, 1);

    assert.equal(result.status, "computed");
    assert.equal(result.cells.length, 8);
    for (let i = 0; i < result.cells.length; i++) {
      assert.equal(result.cells[i].col, i + 1);
      assert.equal(result.cells[i].row, 1);
    }
  });

  test("Diagonal movement correctly scales physical distance", () => {
    const grid = makeSyntheticGrid(5, 5);
    const costModel = new TerrainCostModel("shortest");
    const result = searchPathAStar(grid, costModel, 0, 0, 2, 2);

    assert.equal(result.status, "computed");
    assert.equal(result.cells.length, 3);
    const expectedDist = 2 * grid.distanceBetweenCells(0, 0, 1, 1);
    assert.ok(Math.abs(result.distanceMeters - expectedDist) < 1e-2);
  });

  test("Nodata barrier is circumnavigated without stepping on nodata", () => {
    const grid = makeSyntheticGrid(7, 7);
    // Put a nodata wall across column 3 (rows 1 to 4)
    for (let r = 1; r <= 4; r++) {
      const idx = grid.getIndex(3, r);
      grid.validMask[idx] = 0;
      grid.elevations[idx] = -9999.0;
    }

    const costModel = new TerrainCostModel("shortest");
    const result = searchPathAStar(grid, costModel, 1, 2, 5, 2);

    assert.equal(result.status, "computed");
    for (const cell of result.cells) {
      assert.ok(grid.isValid(cell.col, cell.row));
      assert.ok(!(cell.col === 3 && cell.row >= 1 && cell.row <= 4));
    }
  });

  test("Steep slopes exceeding max threshold are impassable", () => {
    const grid = makeSyntheticGrid(7, 7, -2500, 2.0);
    // Create impassable slope wall (30 deg) across column 3, except for a pass at row 5
    for (let r = 0; r < 7; r++) {
      grid.slopes[grid.getIndex(3, r)] = r === 5 ? 3.0 : 32.0;
    }

    const costModel = new TerrainCostModel("shortest", {
      maxTraversableSlopeDegrees: 25.0,
    });
    const result = searchPathAStar(grid, costModel, 1, 2, 5, 2);

    assert.equal(result.status, "computed");
    // Path must navigate through the pass at (col 3, row 5)
    assert.ok(result.cells.some((c) => c.col === 3 && c.row === 5));
  });

  test("Unreachable goal completely surrounded by nodata fails closed", () => {
    const grid = makeSyntheticGrid(7, 7);
    // Surround goal (5, 3) with nodata
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc !== 0 || dr !== 0) {
          const idx = grid.getIndex(5 + dc, 3 + dr);
          grid.validMask[idx] = 0;
        }
      }
    }

    const costModel = new TerrainCostModel("shortest");
    const result = searchPathAStar(grid, costModel, 1, 3, 5, 3);
    assert.equal(result.status, "unavailable");
    assert.ok(result.failureReason !== undefined);
  });

  test("Lower-terrain-cost detour avoids moderate steep hill that shortest path traverses", () => {
    const grid = makeSyntheticGrid(10, 7, -2500, 2.0);
    // Place a traversable but steep hill (20 deg slope) along middle row
    for (let c = 2; c <= 7; c++) {
      grid.slopes[grid.getIndex(c, 3)] = 20.0;
    }

    const shortestRes = searchPathAStar(
      grid,
      new TerrainCostModel("shortest"),
      1,
      3,
      8,
      3
    );
    const lowerRes = searchPathAStar(
      grid,
      new TerrainCostModel("lower-terrain-cost"),
      1,
      3,
      8,
      3
    );

    assert.equal(shortestRes.status, "computed");
    assert.equal(lowerRes.status, "computed");

    // Shortest path goes straight through the hill (row 3)
    assert.ok(shortestRes.cells.every((c) => c.row === 3));

    // Lower cost path detours around the hill to minimize slope penalty
    assert.ok(!lowerRes.cells.every((c) => c.row === 3));
    assert.ok(lowerRes.meanSlopeDegrees < shortestRes.meanSlopeDegrees);
  });
});

describe("Waypoint Validation and Scientific Safeguards", () => {
  const grid = loadJezeroRoutingGrid();

  test("JZ-T1A unverified science target is strictly rejected", () => {
    const unverifiedInputs: WaypointInput[] = [
      {
        id: "landing",
        coordinates: [77.450886, 18.444627],
        verified: true,
      },
      {
        id: "jezero-target-1",
        label: "Sample Caching Area",
        coordinates: [77.430000, 18.440000],
        verified: false, // JZ-T1A unverified!
      },
    ];

    const validation = validateAndSnapWaypoints(unverifiedInputs, grid);
    assert.equal(validation.status, "invalid");
    assert.ok(validation.failureReason.includes("UNVERIFIED (JZ-T1A)"));

    const routeResult = planJezeroSegmentRoute(unverifiedInputs, grid);
    assert.equal(routeResult.status, "unavailable");
    assert.ok(routeResult.failureReason?.includes("UNVERIFIED"));
  });

  test("Null or missing coordinates are rejected", () => {
    const nullCoords: WaypointInput[] = [
      { id: "wp1", coordinates: [77.450886, 18.444627] },
      { id: "wp2", coordinates: null },
    ];

    const validation = validateAndSnapWaypoints(nullCoords, grid);
    assert.equal(validation.status, "invalid");
    assert.ok(validation.failureReason.includes("missing or null"));
  });

  test("Out-of-coverage coordinate outside DEM is rejected without large shift", () => {
    // West of 77.2229E has no DEM coverage
    const outInputs: WaypointInput[] = [
      { coordinates: [77.450886, 18.444627], verified: true },
      { coordinates: [77.190000, 18.440000], verified: true },
    ];

    const validation = validateAndSnapWaypoints(outInputs, grid, 150.0);
    assert.equal(validation.status, "invalid");
    assert.ok(validation.failureReason.includes("outside valid DEM coverage"));
  });
});

describe("Authentic Jezero DEM Route Planning & Output Contract", () => {
  const grid = loadJezeroRoutingGrid();

  test("Computes valid route from Perseverance Landing Site to Western Delta", () => {
    const waypoints: WaypointInput[] = [
      {
        id: "landing-site",
        label: "Octavia E. Butler Landing",
        coordinates: [77.450886, 18.444627],
        verified: true,
      },
      {
        id: "delta-front",
        label: "Western Delta Front",
        coordinates: [77.380000, 18.455000],
        verified: true,
      },
    ];

    const result = planJezeroSegmentRoute(waypoints, grid, {
      preference: "shortest",
    });

    // Verify shared RouteResult schema contract
    assert.equal(result.regionId, "jezero");
    assert.equal(result.status, "computed");
    assert.equal(result.preference, "shortest");
    assert.ok(Array.isArray(result.coordinates));
    assert.ok(result.coordinates.length > 50);

    // Verify metrics
    assert.ok(result.distanceMeters !== null && result.distanceMeters > 4000);
    assert.ok(result.ascentMeters !== null && result.ascentMeters >= 0);
    assert.ok(result.descentMeters !== null && result.descentMeters >= 0);
    assert.ok(result.maximumSlopeDegrees !== null && result.maximumSlopeDegrees < 25);
    assert.ok(result.meanSlopeDegrees !== null && result.meanSlopeDegrees > 0);

    // Verify scientific verification tracking
    assert.equal(result.sourceVerified, true);
    assert.equal(result.processingVerified, true);
    assert.equal(result.registrationVerified, false); // Honest disclosure
    assert.ok(result.sourceDatasetIds.includes("jezero-usgs-trn-dtm"));
    assert.ok(result.warnings.some((w) => w.includes("UNVERIFIED")));

    // Verify extended metadata
    assert.ok(result.segments !== undefined && result.segments.length === 1);
    assert.equal(result.segments[0].status, "computed");
    assert.ok(result.gridMetadata !== undefined);
    assert.equal(result.gridMetadata.gridSpacingMeters, 25.0);
  });

  test("Genuine route alternatives produce distinct optimized paths on authentic terrain", () => {
    const waypoints: WaypointInput[] = [
      {
        coordinates: [77.450886, 18.444627],
        verified: true,
      },
      {
        coordinates: [77.380000, 18.455000],
        verified: true,
      },
    ];

    const alternatives = planJezeroRouteAlternatives(waypoints, grid);

    assert.equal(alternatives.shortest.status, "computed");
    assert.equal(alternatives.lowerCost.status, "computed");

    // Lower terrain cost route optimizes slope
    assert.ok(
      alternatives.lowerCost.meanSlopeDegrees! <=
        alternatives.shortest.meanSlopeDegrees!
    );
    // Shortest route has shorter or equal distance
    assert.ok(
      alternatives.shortest.distanceMeters! <=
        alternatives.lowerCost.distanceMeters!
    );

    // Paths are not identical for this corridor
    assert.equal(alternatives.pathsIdentical, false);
  });

  test("Multi-waypoint routing computes all segments in order", () => {
    const waypoints: WaypointInput[] = [
      {
        id: "landing",
        coordinates: [77.450886, 18.444627],
        verified: true,
      },
      {
        id: "seitah",
        coordinates: [77.430000, 18.435000],
        verified: true,
      },
      {
        id: "delta",
        coordinates: [77.380000, 18.455000],
        verified: true,
      },
    ];

    const result = planJezeroSegmentRoute(waypoints, grid, {
      preference: "lower-terrain-cost",
    });

    assert.equal(result.status, "computed");
    assert.ok(result.segments !== undefined && result.segments.length === 2);
    assert.equal(result.segments[0].fromWaypointIndex, 0);
    assert.equal(result.segments[0].toWaypointIndex, 1);
    assert.equal(result.segments[1].fromWaypointIndex, 1);
    assert.equal(result.segments[1].toWaypointIndex, 2);

    // Total distance is sum of segment distances
    const sumSegDist =
      result.segments[0].distanceMeters + result.segments[1].distanceMeters;
    assert.ok(Math.abs(result.distanceMeters! - sumSegDist) <= 0.2);
  });
});
