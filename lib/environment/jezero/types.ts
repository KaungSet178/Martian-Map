import type { Evidence } from "@/lib/contracts/primitives";

/**
 * Verification vocabulary shared with the Gale environmental workstream.
 *
 * - VERIFIED: the claim is backed by an authenticated source or a validated
 *   transformation recorded in the dataset manifest.
 * - UNVERIFIED: plausible but not independently checked.
 * - NOT_EVALUATED: no claim is made, so nothing was checked.
 * - INVALID: the check failed and the value must not be displayed as valid.
 */
export type VerificationState =
  | "VERIFIED"
  | "UNVERIFIED"
  | "NOT_EVALUATED"
  | "INVALID";

/**
 * Interoperability shape agreed with the Gale environmental workstream.
 *
 * These fields are intentionally identical in name and meaning. Jezero adds
 * optional context fields (aggregation, band, derived flag) but never renames
 * or repurposes a shared field.
 */
export type EnvironmentalMeasurement = {
  regionId: "jezero";
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
};

export type EnvironmentalDatasetHeader = {
  regionId: "jezero";
  mission: string;
  instrument: string;
  sourceVerified: VerificationState;
  processingVerified: VerificationState;
};

/** One aggregated point. `t` is seconds after LMST midnight. */
export type SeriesPoint = {
  /** Start of the 10-minute LMST bin, in seconds after local midnight. */
  t: number;
  /** Mean of valid native samples in the bin, or null when none exist. */
  v: number | null;
  /** Number of valid native samples contributing to `v`. */
  n: number;
  lo: number | null;
  hi: number | null;
};

export type SeriesSummary = {
  validSamples: number;
  min: number | null;
  max: number | null;
  mean: number | null;
  nativeSamplesRead: number;
  excludedSamples: number;
  firstLmstSeconds: number | null;
  lastLmstSeconds: number | null;
};

export type EnvironmentalSeries = {
  id: string;
  regionId: "jezero";
  instrument: string;
  sensor: string;
  productId: string;
  variableId: string;
  physicalQuantity: string;
  displayName: string;
  unit: string;
  declaredLabelUnit: string | null;
  band: string | null;
  sol: number;
  timeBasis: string;
  sourceUrl: string;
  evidence: Evidence;
  qualityStatus: string;
  unitNote: string | null;
  aggregation: {
    method: string;
    binSeconds: number;
    interpolated: boolean;
    minimumNativeSamplesPerBin: number;
  };
  summary: SeriesSummary;
  points: SeriesPoint[];
};

export type DatasetAvailability = {
  quantity: string;
  status: "available" | "unavailable";
  instrument?: string;
  evidence?: Evidence;
  unit?: string;
  reason?: string;
};

export type ProductProvenance = {
  sensorToken: string;
  title: string;
  processingLevel: string;
  productId: string;
  version: string;
  csvUrl: string;
  csvSha256: string;
  records: number;
};

export type SolSummary = {
  sol: number;
  startLsDeg: number | null;
  stopLsDeg: number | null;
  startUtc: string | null;
  stopUtc: string | null;
  lmstFirst: number | null;
  lmstLast: number | null;
  products: ProductProvenance[];
};

export type JezeroEnvironmentalDataset = EnvironmentalDatasetHeader & {
  schemaVersion: 1;
  datasetId: string;
  datasetDoi: string;
  bundleUrl: string;
  registrationVerified: VerificationState;
  generatedAt: string;
  aggregation: {
    method: string;
    binSeconds: number;
    interpolated: boolean;
    emptyBins: string;
  };
  displayWindow: {
    solSelection: number[];
    selectionRule: string;
  };
  sols: SolSummary[];
  series: EnvironmentalSeries[];
  availability: DatasetAvailability[];
  limitations: string[];
};

export type SeriesGroup = {
  key: string;
  title: string;
  unit: string;
  quantity: string;
  series: EnvironmentalSeries[];
};
