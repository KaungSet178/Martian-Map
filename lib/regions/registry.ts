import { gale } from "@/regions/gale";
import { jezero } from "@/regions/jezero";
import { oxia } from "@/regions/oxia";
import {
  regionIdSchema,
  type RegionId,
  type RegionManifest,
} from "@/lib/contracts/region";

// Explicit imports are the only shared file needed when a new region is added.
// Changes within an existing region require no registry or component edits.
export const regions: Readonly<Record<RegionId, RegionManifest>> = {
  jezero,
  gale,
  oxia,
};
export const regionIds: readonly RegionId[] = ["jezero", "gale", "oxia"];
export const listRegions = (): RegionManifest[] =>
  regionIds.map((id) => regions[id]);
export function getRegion(id: unknown): RegionManifest | undefined {
  const parsed = regionIdSchema.safeParse(id);
  return parsed.success ? regions[parsed.data] : undefined;
}
export const getTargets = (id: unknown) => getRegion(id)?.targets ?? [];
export const getAvailableLayers = (id: unknown) =>
  getRegion(id)?.layers.filter((l) => l.availability === "available") ?? [];
export const getMapConfig = (id: unknown) => getRegion(id)?.map;
export const getRegionEvidence = (id: unknown) =>
  getRegion(id)?.source_references ?? [];
export const getRegionCapabilities = (id: unknown) =>
  getRegion(id)?.capabilities;
