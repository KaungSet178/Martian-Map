import type { RegionManifest, Target } from "@/lib/contracts/region";

/**
 * Returns any retired targets for the given region.
 */
export function getRetiredTargets(): Target[] {
  return [];
}

/**
 * Checks whether the given target ID is a retired scenario target for the region.
 */
export function isRetiredTarget(_regionId: string, targetId: string): boolean {
  void _regionId;
  return getRetiredTargets().some((t) => t.id === targetId);
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
    getRetiredTargets().find((t) => t.id === targetId)
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
    getRetiredTargets().some((t) => t.id === targetId)
  );
}
