/**
 * Gale Crater Shared Environmental Interoperability Adapter
 * Conforms strictly to Section 4 EnvironmentalDataset contract.
 */

import environmentalDatasetRaw from "@/data/environment/gale/environmental_dataset.json";
import type { EnvironmentalDataset, EnvironmentalMeasurement } from "./types";

export const galeEnvironmentalDataset = environmentalDatasetRaw as unknown as EnvironmentalDataset;

/**
 * Returns the standardized EnvironmentalDataset for Gale Crater.
 * Both Gale and Jezero implementations expose this compatible interface.
 */
export function getGaleEnvironmentalDataset(): EnvironmentalDataset {
  return galeEnvironmentalDataset;
}

/**
 * Filter measurements by instrument ('REMS' | 'RAD').
 */
export function getGaleMeasurementsByInstrument(
  instrument: "REMS" | "RAD"
): EnvironmentalMeasurement[] {
  return galeEnvironmentalDataset.observations.filter(
    (obs) => obs.instrument === instrument
  );
}

/**
 * Filter measurements by variable ID.
 */
export function getGaleMeasurementsByVariable(
  variableId: string
): EnvironmentalMeasurement[] {
  return galeEnvironmentalDataset.observations.filter(
    (obs) => obs.variableId === variableId
  );
}
