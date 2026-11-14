/**
 * Unified Regional Route Adapters for Marswalk EVA Resource Planning.
 *
 * Implements Section 3, 4, and 5:
 * Normalizes regional routes from Gale Crater, Jezero Crater, and Oxia Planum
 * into the shared EVAResourceRouteInput contract.
 *
 * @module lib/eva/adapters
 */

import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import type { EVAResourceRouteInput } from "../types";
import { adaptGaleRoute, type TerrainRouteMetrics } from "./gale";
import { adaptJezeroRoute } from "./jezero";
import { adaptOxiaRoute, type OxiaManualRouteInput } from "./oxia";

export type { TerrainRouteMetrics, OxiaManualRouteInput };
export { adaptGaleRoute, adaptJezeroRoute, adaptOxiaRoute };

export interface RouteAdapterOptions {
  readonly terrainMetrics?: TerrainRouteMetrics | null;
  readonly oxiaManualInputs?: OxiaManualRouteInput | null;
  readonly manualDistanceMeters?: number | null;
}

/**
 * Adapt any regional mission into the unified EVAResourceRouteInput contract.
 */
export function adaptMissionToEVARoute(
  regionId: "gale" | "jezero" | "oxia",
  mission: Mission,
  regionManifest: RegionManifest,
  options?: RouteAdapterOptions,
): EVAResourceRouteInput {
  switch (regionId) {
    case "gale":
      return adaptGaleRoute(mission, regionManifest, options?.terrainMetrics);
    case "jezero":
      return adaptJezeroRoute(mission, regionManifest, options?.terrainMetrics);
    case "oxia": {
      const oxiaInputs =
        options?.oxiaManualInputs ??
        (options?.manualDistanceMeters !== undefined && options?.manualDistanceMeters !== null
          ? { manualDistanceMeters: options.manualDistanceMeters }
          : null);
      return adaptOxiaRoute(mission, regionManifest, oxiaInputs);
    }
    default: {
      const _exhaustiveCheck: never = regionId;
      throw new Error(`Unsupported exploration region: ${_exhaustiveCheck}`);
    }
  }
}
