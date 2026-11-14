/**
 * Marswalk Planner — Scientific Environmental Data Interoperability Contracts
 *
 * Formal contracts for authentic planetary environmental observations
 * (REMS, RAD, MEDA) across Gale Crater, Jezero Crater, and Oxia Planum.
 */

import { z } from "zod";

/**
 * Standard verification states across all scientific observations.
 *
 * - VERIFIED: Backed by an authentic planetary archive (NASA PDS / ESA PSA)
 *   or documented, mathematically verified aggregation pipeline.
 * - UNVERIFIED: Plausible but not independently confirmed against archival record.
 * - NOT_EVALUATED: No claim is made; out of evaluation scope (e.g. spatial extrapolation).
 * - INVALID: Check failed; must not be displayed as valid ground truth.
 */
export type VerificationState =
  | "VERIFIED"
  | "UNVERIFIED"
  | "NOT_EVALUATED"
  | "INVALID";

export const verificationStateSchema = z.enum([
  "VERIFIED",
  "UNVERIFIED",
  "NOT_EVALUATED",
  "INVALID",
]);

/**
 * Single scientific environmental measurement conforming to the Section 8 contract.
 *
 * Invariant safeguards:
 * - `value` is null when missing or excluded by quality flags; never synthetic zero.
 * - `unit` reflects the authentic physical quantity.
 * - `timeBasis` identifies native Martian or spacecraft time (e.g., LTST, LMST, SCLK).
 * - `observedAt` is ISO UTC only when verified; otherwise null (no fabricated Earth timestamps).
 */
export interface EnvironmentalMeasurement {
  regionId: "gale" | "jezero";
  instrument: string;
  productId: string;
  variableId: string;
  physicalQuantity: string;
  value: number | null;
  unit: string;
  sol: number | null;
  observedAt: string | null;
  timeBasis: string;
  sourceUrl: string;
  qualityStatus: string;
}

export const environmentalMeasurementSchema = z.object({
  regionId: z.enum(["gale", "jezero"]),
  instrument: z.string().min(1),
  productId: z.string().min(1),
  variableId: z.string().min(1),
  physicalQuantity: z.string().min(1),
  value: z.number().nullable(),
  unit: z.string().min(1),
  sol: z.number().int().nullable(),
  observedAt: z.string().nullable(),
  timeBasis: z.string().min(1),
  sourceUrl: z.string().url(),
  qualityStatus: z.string().min(1),
});

/**
 * Standard dataset envelope conforming to Section 8 shared contract.
 */
export interface EnvironmentalDataset {
  regionId: "gale" | "jezero";
  mission: string;
  instrument: string;
  observations: EnvironmentalMeasurement[];
  sourceVerified: VerificationState;
  processingVerified: VerificationState;
}

export const environmentalDatasetSchema = z.object({
  regionId: z.enum(["gale", "jezero"]),
  mission: z.string().min(1),
  instrument: z.string().min(1),
  observations: z.array(environmentalMeasurementSchema),
  sourceVerified: verificationStateSchema,
  processingVerified: verificationStateSchema,
});

/**
 * High-level environmental availability descriptor for mission planning interfaces.
 */
export interface RegionEnvironmentalCapabilities {
  regionId: "gale" | "jezero" | "oxia";
  weatherStatus: "available" | "unavailable";
  ionizingRadiationStatus: "available" | "unavailable";
  solarUvStatus: "available" | "unavailable";
  instruments: string[];
  sols: number[];
  notes: string;
}
