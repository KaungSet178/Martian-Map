/**
 * Martian Environmental Data Module
 *
 * Exposes standardized datasets, region-specific adapters, and interoperability types
 * for Gale Crater, Jezero Crater, and Oxia Planum.
 */

export * from "@/lib/contracts/environment";
export * from "./unified-adapter";
export { getGaleEnvironmentalDataset, galeEnvironmentalDataset } from "./gale/adapter";
export {
  toEnvironmentalDataset as toJezeroEnvironmentalDataset,
  toEnvironmentalMeasurements as toJezeroEnvironmentalMeasurements,
} from "./jezero/adapter";
export { jezeroEnvironmentalDataset } from "./jezero/dataset";
