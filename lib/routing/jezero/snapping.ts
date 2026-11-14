/**
 * Waypoint validation and bounded snapping for Jezero Crater terrain routing.
 *
 * Enforces scientific safeguards:
 * - Waypoints with unverified coordinates (JZ-T1A) are strictly rejected.
 * - Coordinates outside valid DEM coverage undergo bounded snapping only if within
 *   maxSnapDistanceMeters.
 * - Unsupported large shifts are rejected; waypoints are NEVER silently moved.
 */

import type { TerrainGrid } from "./grid";
import type { WaypointInput } from "./types";

export const DEFAULT_MAX_SNAP_DISTANCE_METERS = 150.0;

export type ValidatedWaypoint = {
  index: number;
  id?: string;
  label?: string;
  requestedCoordinate: [number, number]; // [lon, lat]
  snappedCoordinate: [number, number]; // [lon, lat]
  gridCol: number;
  gridRow: number;
  snapDistanceMeters: number;
  wasSnapped: boolean;
  warning?: string;
};

export type WaypointValidationResult =
  | {
      status: "valid";
      waypoints: ValidatedWaypoint[];
    }
  | {
      status: "invalid";
      failureReason: string;
      failedWaypointIndex: number;
    };

/**
 * Validates an array of input waypoints and snaps them to the nearest valid DEM cells.
 */
export function validateAndSnapWaypoints(
  inputs: WaypointInput[],
  grid: TerrainGrid,
  maxSnapDistanceMeters: number = DEFAULT_MAX_SNAP_DISTANCE_METERS,
  enforceVerifiedTargets: boolean = true
): WaypointValidationResult {
  if (!inputs || inputs.length < 2) {
    return {
      status: "invalid",
      failureReason: "At least two waypoints are required to compute a route.",
      failedWaypointIndex: inputs ? inputs.length : 0,
    };
  }

  const validated: ValidatedWaypoint[] = [];

  for (let i = 0; i < inputs.length; i++) {
    const wp = inputs[i];

    // JZ-T1A restriction: check verified status
    if (enforceVerifiedTargets && wp.verified === false) {
      return {
        status: "invalid",
        failureReason: `Waypoint #${i + 1} (${wp.label || wp.id || "unnamed"}) is flagged as UNVERIFIED (JZ-T1A). Routing requires verified coordinates.`,
        failedWaypointIndex: i,
      };
    }

    if (!wp.coordinates || !Array.isArray(wp.coordinates) || wp.coordinates.length < 2) {
      return {
        status: "invalid",
        failureReason: `Waypoint #${i + 1} has missing or null coordinates.`,
        failedWaypointIndex: i,
      };
    }

    const [lon, lat] = wp.coordinates;
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return {
        status: "invalid",
        failureReason: `Waypoint #${i + 1} contains non-finite coordinate values: [${lon}, ${lat}].`,
        failedWaypointIndex: i,
      };
    }

    // Coordinate domain check: Jezero Crater is in eastern hemisphere (~77-78 E, ~18-19 N)
    const normLon = lon < 0 ? lon + 360 : lon;
    if (normLon < -180 || normLon > 360 || lat < -90 || lat > 90) {
      return {
        status: "invalid",
        failureReason: `Waypoint #${i + 1} coordinates [${lon}, ${lat}] exceed planetary coordinate range.`,
        failedWaypointIndex: i,
      };
    }

    const [colF, rowF] = grid.coordToGridFloat(lon, lat);
    const requestedCol = Math.round(colF);
    const requestedRow = Math.round(rowF);

    // Bounded snapping
    const snapResult = grid.snapToNearestValidCell(
      requestedCol,
      requestedRow,
      maxSnapDistanceMeters
    );

    if (!snapResult) {
      return {
        status: "invalid",
        failureReason: `Waypoint #${i + 1} at [${lon.toFixed(5)}, ${lat.toFixed(5)}] lies outside valid DEM coverage or exceeds the maximum snap threshold of ${maxSnapDistanceMeters}m.`,
        failedWaypointIndex: i,
      };
    }

    const [snappedCol, snappedRow, snapDistMeters] = snapResult;
    const snappedCoord = grid.cellToCoord(snappedCol, snappedRow);
    const wasSnapped = snapDistMeters > 0.01;

    let warning: string | undefined;
    if (wasSnapped) {
      warning = `Waypoint #${i + 1} at [${lon.toFixed(5)}, ${lat.toFixed(5)}] was snapped by ${snapDistMeters.toFixed(1)}m to nearest traversable DEM cell.`;
    }

    validated.push({
      index: i,
      id: wp.id,
      label: wp.label,
      requestedCoordinate: [lon, lat],
      snappedCoordinate: snappedCoord,
      gridCol: snappedCol,
      gridRow: snappedRow,
      snapDistanceMeters: snapDistMeters,
      wasSnapped,
      warning,
    });
  }

  return {
    status: "valid",
    waypoints: validated,
  };
}
