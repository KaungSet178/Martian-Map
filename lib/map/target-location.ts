import type { RegionManifest, Target, MarsGeographicCoordinates } from "@/lib/contracts/region";
import { targetSchema } from "@/lib/contracts/region";

/** Geographic eligibility only; mission objectives can exist without a location. */
export function hasVerifiedMapLocation(
  target: Target | undefined,
  region: RegionManifest,
): target is Target & { coordinates: MarsGeographicCoordinates } {
  if (!target || target.region_id !== region.id ||
      target.coordinate_verified !== true || target.verification !== "verified" ||
      !targetSchema.safeParse(target).success || !target.coordinates) return false;
  const { latitude, longitude_east } = target.coordinates;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude_east)) return false;
  const bounds = region.map.supported_extent;
  if (!bounds) return false;
  const longitudeInside = bounds.west_east <= bounds.east_east
    ? longitude_east >= bounds.west_east && longitude_east <= bounds.east_east
    : longitude_east >= bounds.west_east || longitude_east <= bounds.east_east;
  return longitudeInside && latitude >= bounds.south_latitude && latitude <= bounds.north_latitude;
}
