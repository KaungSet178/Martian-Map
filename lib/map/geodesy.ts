/**
 * Mars spherical geodesy — pure mathematical utilities.
 *
 * All calculations use a spherical Mars model with the project's established
 * reference radius. This module produces geometric surface distances on an
 * idealised sphere; outputs are NOT terrain-following distances, traversable
 * route lengths, or operational safety assessments.
 *
 * Coordinate convention (from lib/contracts/primitives.ts):
 *   - Latitude: planetocentric, degrees, −90 to +90.
 *   - Longitude: east-positive, degrees, 0 (inclusive) to 360 (exclusive).
 *
 * No Earth-specific geodetic constants, ellipsoidal models, or geoid
 * corrections are used.
 *
 * @module lib/map/geodesy
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Mars reference sphere radius in metres.
 *
 * This value matches the PDS Mars 2000 sphere used throughout the project
 * (see `regions/gale/config.ts`, `coordinate_system.sphere_radius_m`).
 * It is a modelling parameter, not an assertion that Mars is a perfect sphere.
 * Mars's equatorial and polar radii differ by ~21 km; using a single radius
 * introduces errors up to ~0.6 % at the poles relative to an ellipsoidal
 * model. For the hyperlocal EVA-scale distances this project targets
 * (typically < 50 km), the spherical approximation error is well below the
 * uncertainty introduced by terrain relief and the absence of terrain-
 * following path integration.
 */
export const MARS_RADIUS_M = 3_396_190;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Convert degrees to radians. */
function toRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

/** Convert radians to degrees. */
function toDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * A validated Mars geographic coordinate pair.
 *
 * This type mirrors `MarsGeographicCoordinates` from the project contracts
 * but is defined locally so the geodesy module has no runtime import
 * dependency on Zod schemas or React-adjacent code.
 */
export interface MarsCoordinate {
  /** Planetocentric latitude in degrees, −90 to +90. */
  latitude: number;
  /** East-positive longitude in degrees, 0 (inclusive) to 360 (exclusive). */
  longitude_east: number;
}

/**
 * Validate a single coordinate value.
 *
 * Rejects NaN, ±Infinity, and values outside the stated bounds.
 *
 * @throws {RangeError} if the value is non-finite or out of range.
 */
function assertFiniteRange(
  value: number,
  name: string,
  min: number,
  max: number,
  maxExclusive = false,
): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite; received ${value}`);
  }
  if (value < min || (maxExclusive ? value >= max : value > max)) {
    throw new RangeError(
      `${name} must be in [${min}, ${max}${maxExclusive ? ")" : "]"}; received ${value}`,
    );
  }
}

/**
 * Validate a Mars coordinate pair.
 *
 * @throws {RangeError} on invalid or non-finite inputs.
 */
function validateCoordinate(p: MarsCoordinate, label = "point"): void {
  assertFiniteRange(p.latitude, `${label}.latitude`, -90, 90);
  assertFiniteRange(p.longitude_east, `${label}.longitude_east`, 0, 360, true);
}

// ---------------------------------------------------------------------------
// Great-circle distance
// ---------------------------------------------------------------------------

/**
 * Compute the great-circle surface distance between two Mars coordinates.
 *
 * Uses the haversine formula, which is numerically stable for the full range
 * of angular separations on a sphere (including very small and nearly-
 * antipodal distances). The implementation avoids the `acos`-based spherical
 * law of cosines, which loses precision for small angular separations due to
 * floating-point rounding near `cos(0) = 1`.
 *
 * **Output interpretation:** The returned value is the shortest surface arc
 * on a perfect sphere of radius `MARS_RADIUS_M`. It is NOT:
 * - A terrain-following path length.
 * - An estimate of walking or driving distance.
 * - Evidence of traversability or safety.
 *
 * @param a First coordinate (planetocentric latitude, east-positive longitude).
 * @param b Second coordinate.
 * @returns Great-circle distance in metres (≥ 0).
 * @throws {RangeError} if either coordinate is invalid.
 */
export function marsDistance(a: MarsCoordinate, b: MarsCoordinate): number {
  validateCoordinate(a, "a");
  validateCoordinate(b, "b");

  // Fast path for identical coordinates or identical poles (where longitude is degenerate)
  if (
    (a.latitude === b.latitude && a.longitude_east === b.longitude_east) ||
    (a.latitude === 90 && b.latitude === 90) ||
    (a.latitude === -90 && b.latitude === -90)
  ) {
    return 0;
  }

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.longitude_east - a.longitude_east);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLon * sinHalfDLon;

  // Clamp to [0, 1] to protect against floating-point overshoot.
  const centralAngle = 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));

  return MARS_RADIUS_M * centralAngle;
}

// ---------------------------------------------------------------------------
// Initial bearing
// ---------------------------------------------------------------------------

/**
 * Compute the initial (forward) bearing from `a` to `b` on a great circle.
 *
 * The bearing is measured clockwise from geographic north (0°) through
 * east (90°), south (180°), and west (270°).
 *
 * **Special cases:**
 * - Coincident points (`a ≈ b` within floating-point precision) return `NaN`
 *   because the bearing is geometrically undefined.
 * - Exactly antipodal points also return `NaN`.
 *
 * @param a Origin coordinate.
 * @param b Destination coordinate.
 * @returns Initial bearing in degrees [0, 360), or `NaN` for degenerate cases.
 * @throws {RangeError} if either coordinate is invalid.
 */
export function marsInitialBearing(
  a: MarsCoordinate,
  b: MarsCoordinate,
): number {
  validateCoordinate(a, "a");
  validateCoordinate(b, "b");

  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLon = toRad(b.longitude_east - a.longitude_east);

  const x =
    Math.sin(dLon) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  // Both components near zero (< 1e-12, corresponding to coincident or
  // antipodal points) → bearing is mathematically undefined.
  if (Math.hypot(x, y) < 1e-12) return NaN;

  const bearing = toDeg(Math.atan2(x, y));
  return ((bearing % 360) + 360) % 360;
}

// ---------------------------------------------------------------------------
// Great-circle interpolation
// ---------------------------------------------------------------------------

/**
 * Interpolate a point along the shorter great-circle arc from `a` to `b`.
 *
 * Uses Slerp (spherical linear interpolation) on unit-sphere Cartesian
 * vectors, which correctly traces a great circle for all non-degenerate
 * configurations. For nearly-coincident points the function degrades
 * gracefully to a simple weighted average to avoid division by a near-zero
 * sine.
 *
 * @param a     Start coordinate.
 * @param b     End coordinate.
 * @param t     Interpolation fraction: 0 = `a`, 1 = `b`. Values outside
 *              [0, 1] extrapolate along the great circle (with caveats near
 *              antipodal geometry).
 * @returns     Interpolated coordinate.
 * @throws {RangeError} if either coordinate is invalid or `t` is non-finite.
 */
export function marsInterpolate(
  a: MarsCoordinate,
  b: MarsCoordinate,
  t: number,
): MarsCoordinate {
  validateCoordinate(a, "a");
  validateCoordinate(b, "b");
  if (!Number.isFinite(t)) {
    throw new RangeError(`Interpolation fraction t must be finite; received ${t}`);
  }

  // Convert to unit-sphere Cartesian.
  const lat1 = toRad(a.latitude);
  const lon1 = toRad(a.longitude_east);
  const lat2 = toRad(b.latitude);
  const lon2 = toRad(b.longitude_east);

  const cosLat1 = Math.cos(lat1);
  const cosLat2 = Math.cos(lat2);

  const ax = cosLat1 * Math.cos(lon1);
  const ay = cosLat1 * Math.sin(lon1);
  const az = Math.sin(lat1);

  const bx = cosLat2 * Math.cos(lon2);
  const by = cosLat2 * Math.sin(lon2);
  const bz = Math.sin(lat2);

  // Central angle via dot product (clamped for numerical safety).
  const dot = Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  let rx: number, ry: number, rz: number;

  if (sinOmega < 1e-12) {
    // Points are coincident or nearly antipodal — fall back to linear blend.
    // For coincident points this correctly returns the common location.
    // For truly antipodal points the shortest arc is undefined; the linear
    // blend produces a deterministic but arbitrary intermediate result.
    rx = ax + t * (bx - ax);
    ry = ay + t * (by - ay);
    rz = az + t * (bz - az);
  } else {
    const sa = Math.sin((1 - t) * omega) / sinOmega;
    const sb = Math.sin(t * omega) / sinOmega;
    rx = sa * ax + sb * bx;
    ry = sa * ay + sb * by;
    rz = sa * az + sb * bz;
  }

  // Normalise back to the unit sphere (guards against drift).
  const norm = Math.sqrt(rx * rx + ry * ry + rz * rz);
  rx /= norm;
  ry /= norm;
  rz /= norm;

  // Back to geographic coordinates.
  const lat = toDeg(Math.asin(Math.min(1, Math.max(-1, rz))));
  let lon = toDeg(Math.atan2(ry, rx));

  // Normalise longitude to [0, 360).
  lon = ((lon % 360) + 360) % 360;

  return { latitude: lat, longitude_east: lon };
}

// ---------------------------------------------------------------------------
// Multi-waypoint cumulative distance
// ---------------------------------------------------------------------------

/**
 * Compute the cumulative great-circle distance along an ordered sequence
 * of waypoints.
 *
 * @param waypoints Ordered array of Mars coordinates (minimum 0).
 * @returns Total great-circle distance in metres. Returns 0 for fewer than
 *          2 waypoints.
 * @throws {RangeError} if any coordinate is invalid.
 */
export function marsPathDistance(waypoints: readonly MarsCoordinate[]): number {
  if (waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += marsDistance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Path resampling
// ---------------------------------------------------------------------------

/**
 * Resample a multi-segment path into approximately equidistant points along
 * the great-circle arcs connecting consecutive waypoints.
 *
 * The original waypoints are NOT guaranteed to appear exactly in the output
 * (except the first and last points of the entire path, which are always
 * included). The resampling follows the great-circle arc between each
 * consecutive pair of input waypoints independently.
 *
 * **Important distinctions:**
 * - The step length refers to the great-circle (surface-arc) distance on a
 *   perfect sphere, not terrain-following distance.
 * - The actual spacing between output points may be slightly less than
 *   `stepMetres` on the final sub-segment of each input segment.
 * - For very short segments (shorter than `stepMetres`) the two segment
 *   endpoints are emitted directly.
 *
 * @param waypoints  Ordered input coordinates (minimum 2).
 * @param stepMetres Approximate spacing between resampled points in metres.
 *                   Must be positive and finite.
 * @returns Array of resampled coordinates. Always includes the first and last
 *          input waypoint.
 * @throws {RangeError} if fewer than 2 waypoints, any coordinate is invalid,
 *         or `stepMetres` is non-positive / non-finite.
 */
export function marsResamplePath(
  waypoints: readonly MarsCoordinate[],
  stepMetres: number,
): MarsCoordinate[] {
  if (waypoints.length < 2) {
    throw new RangeError("Resampling requires at least 2 waypoints");
  }
  if (!Number.isFinite(stepMetres) || stepMetres <= 0) {
    throw new RangeError(
      `stepMetres must be positive and finite; received ${stepMetres}`,
    );
  }

  const result: MarsCoordinate[] = [waypoints[0]];

  for (let i = 1; i < waypoints.length; i++) {
    const segStart = waypoints[i - 1];
    const segEnd = waypoints[i];
    const segDist = marsDistance(segStart, segEnd);

    if (segDist <= stepMetres) {
      // Segment is shorter than one step — emit the endpoint directly.
      result.push(segEnd);
      continue;
    }

    const numSteps = Math.ceil(segDist / stepMetres);
    for (let step = 1; step <= numSteps; step++) {
      const t = Math.min(1, step / numSteps);
      result.push(marsInterpolate(segStart, segEnd, t));
    }
  }

  return result;
}
