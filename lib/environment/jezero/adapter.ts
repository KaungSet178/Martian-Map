import type { Evidence } from "@/lib/contracts/primitives";
import { formatLmstWithSeconds } from "./format";
import type {
  EnvironmentalDatasetHeader,
  EnvironmentalMeasurement,
  EnvironmentalSeries,
  JezeroEnvironmentalDataset,
  SeriesPoint,
  VerificationState,
} from "./types";

/**
 * Jezero measurement in the shared interoperability shape, plus the extra
 * context that makes the number checkable (band, LMST, evidence class).
 */
export type JezeroEnvironmentalMeasurement = EnvironmentalMeasurement & {
  /**
   * Local mean solar time of the bin start, as `HH:MM:SS`.
   *
   * MEDA products carry sol + LMST, not per-sample UTC. Rather than invent an
   * ISO timestamp, `observedAt` stays null and the native LMST is preserved
   * here.
   */
  localMeanSolarTime: string | null;
  /** Spectral band or channel, when the product defines one. */
  band: string | null;
  /** Marswalk evidence class of the underlying product. */
  evidence: Evidence;
  /** Explicit description of the derived statistic, if any. */
  derivedStatistic: string;
};

export type SharedEnvironmentalDataset = EnvironmentalDatasetHeader & {
  observations: EnvironmentalMeasurement[];
};

function derivedStatistic(series: EnvironmentalSeries, point: SeriesPoint): string {
  return `${series.aggregation.method} of ${point.n} valid native sample${
    point.n === 1 ? "" : "s"
  } in a ${series.aggregation.binSeconds / 60}-minute LMST bin; no interpolation.`;
}

export function toMeasurement(
  series: EnvironmentalSeries,
  point: SeriesPoint,
): JezeroEnvironmentalMeasurement {
  return {
    regionId: "jezero",
    instrument: series.instrument,
    productId: series.productId,
    variableId: series.variableId,
    physicalQuantity: series.physicalQuantity,
    value: point.v,
    unit: series.unit,
    sol: series.sol,
    observedAt: null,
    timeBasis: series.timeBasis,
    sourceUrl: series.sourceUrl,
    qualityStatus: `${series.qualityStatus} Aggregated: ${derivedStatistic(series, point)}`,
    localMeanSolarTime: formatLmstWithSeconds(point.t),
    band: series.band,
    evidence: series.evidence,
    derivedStatistic: derivedStatistic(series, point),
  };
}

/**
 * Flatten the display dataset into the contract shape. `sol` narrows the
 * export to a single sol; omit it for every observation in the sample.
 */
export function toEnvironmentalMeasurements(
  dataset: JezeroEnvironmentalDataset,
  options: { sol?: number } = {},
): JezeroEnvironmentalMeasurement[] {
  const series =
    options.sol === undefined
      ? dataset.series
      : dataset.series.filter((entry) => entry.sol === options.sol);

  return series.flatMap((entry) => entry.points.map((point) => toMeasurement(entry, point)));
}

export function toEnvironmentalDataset(
  dataset: JezeroEnvironmentalDataset,
  options: { sol?: number } = {},
): SharedEnvironmentalDataset {
  return {
    regionId: "jezero",
    mission: dataset.mission,
    instrument: dataset.instrument,
    observations: toEnvironmentalMeasurements(dataset, options),
    sourceVerified: dataset.sourceVerified,
    processingVerified: dataset.processingVerified,
  };
}

/** Every verification state used by the panel, with its scope. */
export function verificationSummary(dataset: JezeroEnvironmentalDataset): {
  source: VerificationState;
  processing: VerificationState;
  registration: VerificationState;
} {
  return {
    source: dataset.sourceVerified,
    processing: dataset.processingVerified,
    registration: dataset.registrationVerified,
  };
}
