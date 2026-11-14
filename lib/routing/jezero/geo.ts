/**
 * Mars geospatial mathematics and equirectangular projection utilities.
 *
 * Uses the authentic IAU Mars 2020 Sphere datum:
 * Semi-major axis R = 3,396,190.0 m (D_Mars_2000_Sphere).
 *
 * STRICT SAFEGUARD: Earth-radius assumptions (e.g. 6371 km or 6378 km)
 * are strictly forbidden for Martian planetary calculations.
 */

export const MARS_RADIUS_METERS = 3396190.0;
const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

/**
 * Great-circle distance between two Martian coordinates in meters.
 * Coordinates are [longitude_east, latitude_north] in degrees.
 */
export function marsGreatCircleDistanceMeters(
  coordA: [number, number],
  coordB: [number, number]
): number {
  const [lon1, lat1] = coordA;
  const [lon2, lat2] = coordB;

  const phi1 = lat1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const deltaPhi = (lat2 - lat1) * DEG_TO_RAD;
  const deltaLambda = (lon2 - lon1) * DEG_TO_RAD;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;

  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0.0, 1.0 - a)));
  return MARS_RADIUS_METERS * c;
}

/**
 * Forward equirectangular projection matching the USGS DTM specification:
 * Equirectangular latTs0=0, lon0=0, R = 3396190 m.
 * Input: [longitude_east, latitude_north] in degrees.
 * Output: [easting_meters, northing_meters].
 */
export function lonLatToEquirectangularMeters(
  lon: number,
  lat: number
): [number, number] {
  const easting = MARS_RADIUS_METERS * lon * DEG_TO_RAD;
  const northing = MARS_RADIUS_METERS * lat * DEG_TO_RAD;
  return [easting, northing];
}

/**
 * Inverse equirectangular projection:
 * Input: [easting_meters, northing_meters].
 * Output: [longitude_east, latitude_north] in degrees.
 */
export function equirectangularMetersToLonLat(
  easting: number,
  northing: number
): [number, number] {
  const lon = (easting / MARS_RADIUS_METERS) * RAD_TO_DEG;
  const lat = (northing / MARS_RADIUS_METERS) * RAD_TO_DEG;
  return [lon, lat];
}

/**
 * Physical ground step distance between two adjacent grid cells.
 * Accounts for local parallel scale factor cos(latitude) in equirectangular projection.
 */
export function stepGroundDistanceMeters(
  colA: number,
  rowA: number,
  colB: number,
  rowB: number,
  pixelSpacingMeters: number,
  centerLatitudeDegrees: number
): number {
  const dCol = colB - colA;
  const dRow = rowB - rowA;

  // In equirectangular with standard parallel latTs=0:
  // East-west ground distance is scaled by cos(latitude).
  // North-south ground distance is 1:1 with map northing.
  const cosLat = Math.cos(centerLatitudeDegrees * DEG_TO_RAD);
  const dxMeters = dCol * pixelSpacingMeters * cosLat;
  const dyMeters = dRow * pixelSpacingMeters;

  return Math.hypot(dxMeters, dyMeters);
}
