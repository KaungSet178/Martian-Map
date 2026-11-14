/**
 * Accessor and processing helpers for MSL Curiosity REMS observations (Sol 100).
 */

import remsRawData from "@/data/environment/gale/rems_sol_00100_hourly.json";
import type { GaleWeatherDataset, HourlyWeatherRecord, WeatherSolSummary } from "./types";

export const galeWeatherDataset = remsRawData as unknown as GaleWeatherDataset;

export function getGaleSol100Weather(): GaleWeatherDataset {
  return galeWeatherDataset;
}

export function getDiurnalWeatherHours(): HourlyWeatherRecord[] {
  return galeWeatherDataset.hourly_observations;
}

export function getWeatherSolSummary(): WeatherSolSummary {
  return galeWeatherDataset.sol_summary;
}

export interface DiurnalPoint {
  hour: number;
  label: string;
  value: number | null;
  min?: number | null;
  max?: number | null;
}

/**
 * Returns diurnal temperature curves for ambient air and ground brightness.
 */
export function getDiurnalTemperatureSeries(): {
  air: DiurnalPoint[];
  ground: DiurnalPoint[];
} {
  const air: DiurnalPoint[] = [];
  const ground: DiurnalPoint[] = [];

  for (const obs of galeWeatherDataset.hourly_observations) {
    air.push({
      hour: obs.hour,
      label: obs.ltst_label,
      value: obs.air_temperature_c?.mean ?? null,
      min: obs.air_temperature_c?.min ?? null,
      max: obs.air_temperature_c?.max ?? null,
    });

    ground.push({
      hour: obs.hour,
      label: obs.ltst_label,
      value: obs.ground_temperature_c?.mean ?? null,
      min: obs.ground_temperature_c?.min ?? null,
      max: obs.ground_temperature_c?.max ?? null,
    });
  }

  return { air, ground };
}

/**
 * Returns diurnal atmospheric pressure curve (in hPa).
 */
export function getDiurnalPressureSeries(): DiurnalPoint[] {
  return galeWeatherDataset.hourly_observations.map((obs) => ({
    hour: obs.hour,
    label: obs.ltst_label,
    value: obs.pressure_hpa?.mean ?? null,
    min: obs.pressure_hpa?.min ?? null,
    max: obs.pressure_hpa?.max ?? null,
  }));
}

/**
 * Returns diurnal solar ultraviolet (UV-ABC) irradiance curve (in W/m^2).
 */
export function getDiurnalUvSeries(): DiurnalPoint[] {
  return galeWeatherDataset.hourly_observations.map((obs) => ({
    hour: obs.hour,
    label: obs.ltst_label,
    value: obs.uv_abc_w_m2?.mean ?? null,
    max: obs.uv_abc_w_m2?.max ?? null,
  }));
}

/**
 * Returns wind observations across the diurnal cycle, preserving nulls.
 */
export function getDiurnalWindSeries(): DiurnalPoint[] {
  return galeWeatherDataset.hourly_observations.map((obs) => ({
    hour: obs.hour,
    label: obs.ltst_label,
    value: obs.wind_speed_m_s?.mean ?? null,
    min: obs.wind_speed_m_s?.min ?? null,
    max: obs.wind_speed_m_s?.max ?? null,
  }));
}
