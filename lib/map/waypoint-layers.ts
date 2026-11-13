import type { Map as MapInstance, GeoJSONSource } from "maplibre-gl";
import type {
  RegionManifest,
  MarsGeographicCoordinates,
} from "@/lib/contracts/region";
import { toDisplayCoordinates } from "@/lib/map/region-layers";
import { marsInterpolate } from "@/lib/map/geodesy";
import {
  type WaypointPlan,
  generateGeometricTrajectory,
  GEOMETRIC_TRAJECTORY_LABEL,
} from "@/lib/mission/waypoint-planning";

// ---------------------------------------------------------------------------
// Constants & Source/Layer Identifiers
// ---------------------------------------------------------------------------

export const TRAJECTORY_SOURCE_ID = "waypoint-trajectory";
export const TRAJECTORY_CASING_LAYER_ID = "waypoint-trajectory-casing";
export const TRAJECTORY_OUTBOUND_LAYER_ID = "waypoint-trajectory-outbound";
export const TRAJECTORY_RETURN_LAYER_ID = "waypoint-trajectory-return";

/**
 * Default maximum physical arc spacing in meters between densified trajectory vertices.
 * Default is 100 meters, ensuring high-fidelity depiction of great-circle curves on Mars.
 */
export const DEFAULT_MAX_STEP_METERS = 100;

/**
 * Maximum number of interpolation steps allowed per trajectory segment.
 *
 * Complexity Limit Rationale:
 * At the default 100 m spacing, this limit allows continuous single-leg traverses
 * up to 100 km (100,000 m). Trajectory segments requiring more steps than this limit
 * represent excessive single-leg traverses that cannot be safely densified on the main thread
 * without risking animation stutter or memory bloat.
 *
 * When a segment exceeds this limit, the system does NOT silently clamp steps or degrade precision;
 * instead, it returns an explicit `status: "unsupported"` result with diagnostic metrics.
 */
export const MAX_SEGMENT_INTERPOLATION_STEPS = 1000;

// ---------------------------------------------------------------------------
// Coordinate Conversion & Validation Functions
// ---------------------------------------------------------------------------

/**
 * Converts MapLibre display coordinates (Web Mercator [-180, 180] longitude,
 * [-85.05, 85.05] latitude) into Mars planetocentric coordinates
 * with East-positive longitude in [0, 360).
 *
 * @param lngLat Coordinate pair from MapLibre event or query
 * @returns MarsGeographicCoordinates with planetocentric latitude and East-positive longitude
 */
export function fromDisplayCoordinates(
  lngLat: { lng: number; lat: number } | [number, number],
): MarsGeographicCoordinates {
  const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng;
  const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat;

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new TypeError(
      `Display coordinates must be finite numbers; received lng=${lng}, lat=${lat}`,
    );
  }

  // Clamp latitude to [-90, 90]
  const clampedLat = Math.max(-90, Math.min(90, lat));

  // Convert longitude (-180..180 or multi-world wrap) to East-positive 0..360°
  let lonEast = lng % 360;
  if (lonEast < 0) lonEast += 360;
  let normalizedLon = Number(lonEast.toFixed(6));
  if (normalizedLon >= 360 || Object.is(normalizedLon, -0)) normalizedLon = 0;

  return {
    latitude: Number(clampedLat.toFixed(6)),
    longitude_east: normalizedLon,
  };
}

/**
 * Validates whether a Mars coordinate falls strictly within a region's
 * supported scientific map extent.
 *
 * Scientific Integrity Constraint:
 * Users may only place waypoints within reviewed scientific coverage.
 * If extent is null/undefined (e.g. illustrative regions), returns false.
 */
export function isCoordinateWithinExtent(
  coord: MarsGeographicCoordinates,
  extent?: RegionManifest["map"]["supported_extent"],
): boolean {
  if (!extent) return false;

  const { south_latitude, north_latitude, west_east, east_east } = extent;

  // Check latitude boundary
  if (coord.latitude < south_latitude || coord.latitude > north_latitude) {
    return false;
  }

  // Check longitude boundary (handles standard and antimeridian-wrapping extents)
  if (west_east <= east_east) {
    return coord.longitude_east >= west_east && coord.longitude_east <= east_east;
  } else {
    // Extent crosses the 360°/0° meridian
    return coord.longitude_east >= west_east || coord.longitude_east <= east_east;
  }
}

// ---------------------------------------------------------------------------
// Trajectory Densification & GeoJSON Construction
// ---------------------------------------------------------------------------

export interface DensifiedSegmentSuccess {
  status: "supported";
  /** Subsegments split across the antimeridian display boundary (180° / -180°) */
  coordinates: [number, number][][];
  stepCount: number;
  stepLengthMeters: number;
}

export interface DensifiedSegmentFailure {
  status: "unsupported";
  reason: string;
  requiredSteps: number;
  maxSteps: number;
}

export type DensifiedSegmentResult =
  | DensifiedSegmentSuccess
  | DensifiedSegmentFailure;

/**
 * Densifies a spherical great-circle segment between two Mars coordinates, respecting
 * the configured maximum step spacing and complexity limit.
 *
 * Guarantees:
 * - Great-circle geometry via spherical linear interpolation (slerp).
 * - Exact endpoint preservation: first coordinate is exactly `toDisplayCoordinates(from)`,
 *   final coordinate is exactly `toDisplayCoordinates(to)`.
 * - Configured maximum spacing: every step is <= maxStepMeters.
 * - Complexity limit: returns explicit `status: "unsupported"` if required steps exceed maxSteps.
 * - Antimeridian seam split: splits coordinates into multiple LineStrings if longitude jumps > 180°.
 */
export function densifyTrajectorySegment(
  from: MarsGeographicCoordinates,
  to: MarsGeographicCoordinates,
  distanceMeters: number,
  maxStepMeters: number = DEFAULT_MAX_STEP_METERS,
  maxSteps: number = MAX_SEGMENT_INTERPOLATION_STEPS,
): DensifiedSegmentResult {
  if (distanceMeters <= 0) {
    const pt = toDisplayCoordinates(from);
    return {
      status: "supported",
      coordinates: [[pt, pt]],
      stepCount: 1,
      stepLengthMeters: 0,
    };
  }

  if (maxStepMeters <= 0 || !Number.isFinite(maxStepMeters)) {
    throw new TypeError(
      `maxStepMeters must be a positive finite number; received ${maxStepMeters}`,
    );
  }

  const requiredSteps = Math.ceil(distanceMeters / maxStepMeters);

  if (requiredSteps > maxSteps) {
    return {
      status: "unsupported",
      reason: `Traverse segment length (${distanceMeters.toFixed(1)} m) requires ${requiredSteps} steps at max ${maxStepMeters} m spacing, exceeding the complexity limit of ${maxSteps} steps.`,
      requiredSteps,
      maxSteps,
    };
  }

  const numSteps = Math.max(1, requiredSteps);
  const stepLength = distanceMeters / numSteps;
  const segmentCoords: [number, number][] = [];

  for (let step = 0; step <= numSteps; step++) {
    const t = step / numSteps;
    const pt =
      step === 0
        ? from
        : step === numSteps
          ? to
          : marsInterpolate(from, to, t);
    segmentCoords.push(toDisplayCoordinates(pt));
  }

  const subSegments = splitAntimeridianCoords(segmentCoords);

  return {
    status: "supported",
    coordinates: subSegments,
    stepCount: numSteps,
    stepLengthMeters: stepLength,
  };
}

export interface TrajectoryFeatureProperties {
  kind: "outbound" | "return";
  from_id: string;
  to_id: string;
  distance_m: number;
  initial_bearing_deg: number;
  disclaimer: string;
  status: "supported" | "unsupported";
  step_count?: number;
  step_length_m?: number;
  unsupported_reason?: string;
}

export interface TrajectoryGeoJSONCollection
  extends GeoJSON.FeatureCollection<GeoJSON.LineString> {
  unsupported_segments?: Array<{
    segment_index: number;
    from_id: string;
    to_id: string;
    distance_m: number;
    reason: string;
  }>;
}

/**
 * Builds a GeoJSON FeatureCollection representing the densified spherical
 * great-circle trajectories for both outbound and return segments.
 *
 * Guarantees:
 * - Independent segment processing: an unsupported or invalid segment does not
 *   prevent rendering of unrelated valid segments.
 * - Explicit complexity limits: segments exceeding `maxStepsPerSegment` are not silently
 *   degraded; instead, they are recorded in `unsupported_segments`.
 *
 * @param plan Active WaypointPlan
 * @param maxStepMeters Maximum arc step in meters for slerp densification (default 100 m)
 * @param maxStepsPerSegment Maximum allowed interpolation steps per segment (default 1000)
 */
export function buildTrajectoryGeoJSON(
  plan: WaypointPlan,
  maxStepMeters = DEFAULT_MAX_STEP_METERS,
  maxStepsPerSegment = MAX_SEGMENT_INTERPOLATION_STEPS,
): TrajectoryGeoJSONCollection {
  const emptyCollection: TrajectoryGeoJSONCollection = {
    type: "FeatureCollection",
    features: [],
  };

  if (!plan.waypoints || plan.waypoints.length < 2) {
    return emptyCollection;
  }

  let trajectory;
  try {
    trajectory = generateGeometricTrajectory(plan);
  } catch {
    return emptyCollection;
  }

  const features: GeoJSON.Feature<GeoJSON.LineString, TrajectoryFeatureProperties>[] = [];
  const unsupportedSegments: Array<{
    segment_index: number;
    from_id: string;
    to_id: string;
    distance_m: number;
    reason: string;
  }> = [];

  for (const segment of trajectory.segments) {
    const from = segment.from_coordinates;
    const to = segment.to_coordinates;
    const dist = segment.surface_distance_m;

    if (dist === 0) continue;

    try {
      const densified = densifyTrajectorySegment(
        from,
        to,
        dist,
        maxStepMeters,
        maxStepsPerSegment,
      );

      if (densified.status === "unsupported") {
        unsupportedSegments.push({
          segment_index: segment.segment_index,
          from_id: segment.from_waypoint_id,
          to_id: segment.to_waypoint_id,
          distance_m: dist,
          reason: densified.reason,
        });
        continue;
      }

      for (const coords of densified.coordinates) {
        if (coords.length >= 2) {
          features.push({
            type: "Feature",
            properties: {
              kind: segment.is_return_segment ? "return" : "outbound",
              from_id: segment.from_waypoint_id,
              to_id: segment.to_waypoint_id,
              distance_m: segment.surface_distance_m,
              initial_bearing_deg: segment.initial_bearing_deg,
              disclaimer: GEOMETRIC_TRAJECTORY_LABEL,
              status: "supported",
              step_count: densified.stepCount,
              step_length_m: densified.stepLengthMeters,
            },
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
          });
        }
      }
    } catch (segmentErr) {
      unsupportedSegments.push({
        segment_index: segment.segment_index,
        from_id: segment.from_waypoint_id,
        to_id: segment.to_waypoint_id,
        distance_m: dist,
        reason:
          segmentErr instanceof Error
            ? segmentErr.message
            : "Unknown interpolation error",
      });
    }
  }

  const result: TrajectoryGeoJSONCollection = {
    type: "FeatureCollection",
    features,
  };

  if (unsupportedSegments.length > 0) {
    result.unsupported_segments = unsupportedSegments;
  }

  return result;
}

/**
 * Splits a list of display coordinates if consecutive vertices jump across
 * the 180° / -180° display boundary, preventing horizontal wrap lines across the map.
 */
function splitAntimeridianCoords(
  coords: [number, number][],
): [number, number][][] {
  const result: [number, number][][] = [];
  let current: [number, number][] = [];

  for (let i = 0; i < coords.length; i++) {
    if (current.length > 0) {
      const prevLng = current[current.length - 1][0];
      const curLng = coords[i][0];
      // Jump across the antimeridian
      if (Math.abs(curLng - prevLng) > 180) {
        result.push(current);
        current = [];
      }
    }
    current.push(coords[i]);
  }

  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

// ---------------------------------------------------------------------------
// MapLibre Layer Mounting & Updates
// ---------------------------------------------------------------------------

/**
 * Mounts the GeoJSON source and line styling layers for geometric trajectories.
 * Returns a cleanup function that safely unmounts them.
 */
export function mountTrajectoryLayers(map: MapInstance): () => void {
  if (!map.getSource(TRAJECTORY_SOURCE_ID)) {
    map.addSource(TRAJECTORY_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  // 1. Dark casing layer for high contrast over bright/dark CTX mosaic
  if (!map.getLayer(TRAJECTORY_CASING_LAYER_ID)) {
    map.addLayer({
      id: TRAJECTORY_CASING_LAYER_ID,
      type: "line",
      source: TRAJECTORY_SOURCE_ID,
      paint: {
        "line-color": "#09111F",
        "line-width": 5.5,
        "line-opacity": 0.85,
      },
    });
  }

  // 2. Outbound trajectory: Cyan line with dashes [3, 1]
  if (!map.getLayer(TRAJECTORY_OUTBOUND_LAYER_ID)) {
    map.addLayer({
      id: TRAJECTORY_OUTBOUND_LAYER_ID,
      type: "line",
      source: TRAJECTORY_SOURCE_ID,
      filter: ["==", ["get", "kind"], "outbound"],
      paint: {
        "line-color": "#59E3FA",
        "line-width": 3,
        "line-dasharray": [3, 1],
      },
    });
  }

  // 3. Return closure segment: Cyan line with distinct dash pattern [1, 2]
  if (!map.getLayer(TRAJECTORY_RETURN_LAYER_ID)) {
    map.addLayer({
      id: TRAJECTORY_RETURN_LAYER_ID,
      type: "line",
      source: TRAJECTORY_SOURCE_ID,
      filter: ["==", ["get", "kind"], "return"],
      paint: {
        "line-color": "#59E3FA",
        "line-width": 2.5,
        "line-dasharray": [1, 2],
      },
    });
  }

  return () => {
    try {
      if (map.getLayer(TRAJECTORY_RETURN_LAYER_ID)) {
        map.removeLayer(TRAJECTORY_RETURN_LAYER_ID);
      }
      if (map.getLayer(TRAJECTORY_OUTBOUND_LAYER_ID)) {
        map.removeLayer(TRAJECTORY_OUTBOUND_LAYER_ID);
      }
      if (map.getLayer(TRAJECTORY_CASING_LAYER_ID)) {
        map.removeLayer(TRAJECTORY_CASING_LAYER_ID);
      }
      if (map.getSource(TRAJECTORY_SOURCE_ID)) {
        map.removeSource(TRAJECTORY_SOURCE_ID);
      }
    } catch {
      // Ignore cleanup errors during unmount
    }
  };
}

/**
 * Updates the GeoJSON data for the mounted trajectory layer.
 */
export function updateTrajectoryData(
  map: MapInstance,
  plan: WaypointPlan,
): void {
  const source = map.getSource(TRAJECTORY_SOURCE_ID) as GeoJSONSource | undefined;
  if (source && typeof source.setData === "function") {
    const data = buildTrajectoryGeoJSON(plan);
    source.setData(data);
  }
}
