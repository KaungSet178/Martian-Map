/**
 * Accessor and processing helpers for MSL Curiosity RAD ionizing radiation observations (Sol 100).
 */

import radRawData from "@/data/environment/gale/rad_sol_00100.json";
import type { GaleRadDataset, RadDetectorStats, RadObservationRecord } from "./types";

export const galeRadDataset = radRawData as unknown as GaleRadDataset;

export function getGaleSol100Radiation(): GaleRadDataset {
  return galeRadDataset;
}

export function getRadObservations(): RadObservationRecord[] {
  return galeRadDataset.observations;
}

export function getRadDetectorBStats(): RadDetectorStats | null {
  return galeRadDataset.statistics.detector_b_silicon;
}

export function getRadDetectorEStats(): RadDetectorStats | null {
  return galeRadDataset.statistics.detector_e_plastic;
}

export interface RadDosePoint {
  index: number;
  utcTime: string | null;
  marsTime: string | null;
  hourLtst: number | null;
  doseRateB_uGy_hr: number | null;
  doseDailyB_uGy_day: number | null;
  doseRateE_uGy_hr: number | null;
  doseDailyE_uGy_day: number | null;
  qc: string | null;
}

/**
 * Returns time-ordered radiation dose rate series across all 43 Sol 100 observations.
 */
export function getRadDoseSeries(): RadDosePoint[] {
  return galeRadDataset.observations.map((obs) => ({
    index: obs.observation_index,
    utcTime: obs.start_obs_utc,
    marsTime: obs.start_obs_mars,
    hourLtst: obs.hour_ltst,
    doseRateB_uGy_hr: obs.dose_rate_b_microgray_per_hour,
    doseDailyB_uGy_day: obs.dose_rate_b_microgray_per_day,
    doseRateE_uGy_hr: obs.dose_rate_e_microgray_per_hour,
    doseDailyE_uGy_day: obs.dose_rate_e_microgray_per_day,
    qc: obs.qc_status,
  }));
}
