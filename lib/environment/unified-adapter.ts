/**
 * Unified Environmental Data Adapter
 *
 * Integrates Gale REMS/RAD observations and Jezero MEDA observations
 * under the shared Section 8 EnvironmentalDataset contract.
 *
 * Strictly prevents cross-region data leakage and provides an explicit
 * null state for Oxia Planum where no in situ rover observations exist.
 */

import type { RegionId } from "@/lib/contracts/region";
import type {
  EnvironmentalDataset,
  EnvironmentalMeasurement,
  RegionEnvironmentalCapabilities,
} from "@/lib/contracts/environment";
import { getGaleEnvironmentalDataset } from "./gale/adapter";
import { toEnvironmentalDataset } from "./jezero/adapter";
import { jezeroEnvironmentalDataset } from "./jezero/dataset";

export * from "@/lib/contracts/environment";

/**
 * Available authentic observation sols per exploration region.
 */
export const REGIONAL_SOLS: Record<RegionId, number[]> = {
  gale: [100],
  jezero: [100, 140, 180, 220, 265, 300],
  oxia: [],
};

/**
 * Default observation sol per region, or null when unavailable.
 */
export const REGIONAL_DEFAULT_SOL: Record<RegionId, number | null> = {
  gale: 100,
  jezero: 100,
  oxia: null,
};

/**
 * Returns authentic environmental dataset for the specified region conforming
 * to the Section 8 shared contract.
 *
 * @param regionId "gale" | "jezero" | "oxia"
 * @param options optional sol filter
 * @returns EnvironmentalDataset for Gale/Jezero, or null for Oxia
 */
export function getEnvironmentalDatasetForRegion(
  regionId: RegionId,
  options: { sol?: number } = {}
): EnvironmentalDataset | null {
  if (regionId === "gale") {
    const fullGale = getGaleEnvironmentalDataset();
    if (options.sol !== undefined) {
      if (options.sol !== 100) {
        return {
          ...fullGale,
          observations: [],
        };
      }
    }
    return fullGale;
  }

  if (regionId === "jezero") {
    const jzShared = toEnvironmentalDataset(jezeroEnvironmentalDataset, options);
    return {
      regionId: "jezero",
      mission: jzShared.mission,
      instrument: jzShared.instrument,
      observations: jzShared.observations as EnvironmentalMeasurement[],
      sourceVerified: jzShared.sourceVerified,
      processingVerified: jzShared.processingVerified,
    };
  }

  // Oxia Planum: strictly null. Never fabricate or substitute foreign observations.
  return null;
}

/**
 * Returns available observation sols for a region.
 */
export function getAvailableSolsForRegion(regionId: RegionId): number[] {
  return REGIONAL_SOLS[regionId] ?? [];
}

/**
 * Returns default observation sol for a region, or null if none available.
 */
export function getDefaultSolForRegion(regionId: RegionId): number | null {
  return REGIONAL_DEFAULT_SOL[regionId] ?? null;
}

/**
 * High-level capability audit descriptor for mission planning views.
 */
export function getRegionEnvironmentalCapabilities(
  regionId: RegionId
): RegionEnvironmentalCapabilities {
  switch (regionId) {
    case "gale":
      return {
        regionId: "gale",
        weatherStatus: "available",
        ionizingRadiationStatus: "available",
        solarUvStatus: "available",
        instruments: ["MSL REMS", "MSL RAD"],
        sols: [100],
        notes:
          "Curiosity REMS Sol 100 calibrated diurnal weather + RAD Sol 100 ionizing radiation dosimetry (absorbed dose in silicon and plastic).",
      };

    case "jezero":
      return {
        regionId: "jezero",
        weatherStatus: "available",
        ionizingRadiationStatus: "unavailable",
        solarUvStatus: "available",
        instruments: ["Mars 2020 MEDA (ATS, TIRS, PS, RHS, WS, RDS)"],
        sols: [100, 140, 180, 220, 265, 300],
        notes:
          "Perseverance MEDA 6-sol calibrated/derived diurnal weather + RDS solar/UV radiance. No ionizing radiation dosimeter carried.",
      };

    case "oxia":
      return {
        regionId: "oxia",
        weatherStatus: "unavailable",
        ionizingRadiationStatus: "unavailable",
        solarUvStatus: "unavailable",
        instruments: [],
        sols: [],
        notes:
          "No verified local historical rover observations are currently integrated for Oxia Planum.",
      };
  }
}
