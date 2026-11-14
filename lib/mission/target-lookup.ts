import type { RegionManifest, Target } from "@/lib/contracts/region";
import { retiredTargets as galeRetiredTargets } from "@/regions/gale/retired-targets";

const retiredTargetsByRegion: Record<string, Target[]> = {
  gale: galeRetiredTargets,
};

/**
 * Returns any retired targets for the given region ID.
 */
export function getRetiredTargets(regionId: string): Target[] {
  return retiredTargetsByRegion[regionId] ?? [];
}

/**
 * Checks whether the given target ID is a retired scenario target for the region.
 */
export function isRetiredTarget(regionId: string, targetId: string): boolean {
  return getRetiredTargets(regionId).some((t) => t.id === targetId);
}

/**
 * Looks up a target by ID, checking active targets first, then retired targets
 * for saved-mission backward compatibility.
 */
export function findTarget(
  region: RegionManifest,
  targetId: string,
): Target | undefined {
  return (
    region.targets.find((t) => t.id === targetId) ??
    getRetiredTargets(region.id).find((t) => t.id === targetId)
  );
}

/**
 * Validates whether a target ID is known in this region (active or retired).
 */
export function isValidTargetId(
  region: RegionManifest,
  targetId: string,
): boolean {
  return (
    region.targets.some((t) => t.id === targetId) ||
    getRetiredTargets(region.id).some((t) => t.id === targetId)
  );
}
