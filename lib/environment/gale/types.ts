/**
 * Gale Crater Historical Environmental Types
 * Conforms to Section 4 shared environmental data interoperability contract
 * and provides typed structures for MSL Curiosity REMS and RAD observations.
 */

// Section 4 Standard Shared Contract Types
export type VerificationState =
  | "VERIFIED"
  | "UNVERIFIED"
  | "NOT_EVALUATED"
  | "INVALID";

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

export interface EnvironmentalDataset {
  regionId: "gale" | "jezero";
  mission: string;
  instrument: string;
  observations: EnvironmentalMeasurement[];
  sourceVerified: VerificationState;
  processingVerified: VerificationState;
}

// Gale-Specific REMS Structures
export interface NumericStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  stddev: number;
}

export interface HourlyWeatherRecord {
  hour: number;
  ltst_label: string;
  sample_count: number;
  air_temperature_c: NumericStats | null;
  air_temperature_k: NumericStats | null;
  ground_temperature_c: NumericStats | null;
  ground_temperature_k: NumericStats | null;
  pressure_hpa: NumericStats | null;
  pressure_pa: NumericStats | null;
  relative_humidity_pct: NumericStats | null;
  uv_abc_w_m2: NumericStats | null;
  uv_channels: {
    uv_a: NumericStats | null;
    uv_b: NumericStats | null;
    uv_c: NumericStats | null;
  };
  wind_speed_m_s: NumericStats | null;
  wind_direction_deg: NumericStats | null;
}

export interface WeatherSolSummary {
  air_temperature_c: {
    min: number | null;
    max: number | null;
    mean: number | null;
    diurnal_range_c: number | null;
    valid_samples: number;
  };
  ground_temperature_c: {
    min: number | null;
    max: number | null;
    mean: number | null;
    diurnal_range_c: number | null;
    valid_samples: number;
  };
  pressure_hpa: {
    min: number | null;
    max: number | null;
    mean: number | null;
    diurnal_amplitude_hpa: number | null;
    valid_samples: number;
  };
  relative_humidity_pct: {
    min: number | null;
    max: number | null;
    mean: number | null;
    valid_samples: number;
  };
  uv_abc_w_m2: {
    peak: number | null;
    mean_daytime: number | null;
    valid_samples: number;
  };
  wind_speed_m_s: {
    valid_samples: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    data_completeness_pct: number;
    sensor_limitation_note: string;
  };
}

export interface GaleWeatherMetadata {
  regionId: "gale";
  mission: "MSL Curiosity";
  instrument: string;
  pds4_bundle: string;
  product_id: string;
  archive_url: string;
  sol: number;
  solar_longitude_ls_deg: number;
  martian_year: number;
  season: string;
  start_sclk: number;
  end_sclk: number;
  start_utc: string;
  end_utc: string;
  total_calibrated_records: number;
  time_basis: string;
  quality_handling: string;
}

export interface GaleWeatherDataset {
  metadata: GaleWeatherMetadata;
  sol_summary: WeatherSolSummary;
  hourly_observations: HourlyWeatherRecord[];
}

// Gale-Specific RAD Structures
export interface RadObservationRecord {
  observation_index: number;
  edr_filename: string | null;
  start_obs_sclk: number | null;
  start_obs_utc: string | null;
  start_obs_mars: string | null;
  hour_ltst: number | null;
  integration_time_seconds: number | null;
  qc_status: string | null;
  dose_rate_b_microgray_per_hour: number | null;
  dose_rate_b_microgray_per_day: number | null;
  dose_rate_e_microgray_per_hour: number | null;
  dose_rate_e_microgray_per_day: number | null;
}

export interface RadDetectorStats {
  count: number;
  min_microgray_per_hour: number;
  max_microgray_per_hour: number;
  mean_microgray_per_hour: number;
  stddev_microgray_per_hour: number;
  min_microgray_per_day: number;
  max_microgray_per_day: number;
  mean_microgray_per_day: number;
  stddev_microgray_per_day: number;
}

export interface GaleRadMetadata {
  regionId: "gale";
  mission: "MSL Curiosity";
  instrument: string;
  dataset_id: string;
  product_id: string;
  pds_archive_url: string;
  sol: number;
  ls_deg: number;
  martian_year: number;
  detector_b_type: string;
  detector_e_type: string;
  units: {
    hourly: string;
    daily: string;
  };
  total_observations: number;
  valid_observations_b: number;
  valid_observations_e: number;
  scientific_notes: string[];
}

export interface GaleRadDataset {
  metadata: GaleRadMetadata;
  statistics: {
    detector_b_silicon: RadDetectorStats | null;
    detector_e_plastic: RadDetectorStats | null;
  };
  observations: RadObservationRecord[];
}
