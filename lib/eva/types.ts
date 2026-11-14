/**
 * Type contracts and interfaces for the Marswalk Unified EVA Resource Planning System.
 *
 * Implements Phase R1: Unified EVA Resource Estimation for Gale Crater, Jezero Crater,
 * and Oxia Planum under verified NASA reference profiles and transparent user assumptions.
 *
 * SCIENTIFIC BOUNDARIES & DISCLAIMER:
 * - All calculations represent hypothetical planning models, NOT NASA-certified life-support
 *   flight rules or astronaut safety approvals.
 * - Recommendations reflect arithmetic provisions under selected engineering profiles.
 *
 * @module lib/eva/types
 */

export type RouteEvidence =
  | "terrain-derived"
  | "geometric"
  | "unavailable";

export type ResourceEstimateStatus =
  | "estimated"
  | "assumption-dependent"
  | "unavailable"
  | "exceeds-configured-capacity";

export type CapacityAssessmentStatus =
  | "within-configured-capacity"
  | "exceeds-configured-capacity"
  | "capacity-unknown"
  | "insufficient-evidence";

export type EVAProfileType =
  | "historical-hardware"
  | "nasa-engineering-reference"
  | "user-defined";

export type CoolingSystemType =
  | "porous-plate-sublimator"
  | "spacesuit-water-membrane-evaporator"
  | "closed-loop-recirculating-radiator"
  | "other-consumptive"
  | "none"
  | "unknown";

/**
 * Citation record for NASA and engineering constants.
 */
export interface EVANumericCitation {
  readonly id: string;
  readonly title: string;
  readonly authorOrAgency: string;
  readonly documentNumber?: string;
  readonly publicationYear: number;
  readonly sectionOrTable: string;
  readonly pageNumber?: number | string;
  readonly parameterName: string;
  readonly documentedValue: number;
  readonly documentedUnit: string;
  readonly applicableTechnology: string;
  readonly missionEnvironment: string;
  readonly methodology: "measured" | "specified" | "estimated" | "assumed";
  readonly limitations: string;
  readonly conversion?: string;
  readonly url?: string;
}

/**
 * Extensible, source-backed spacesuit reference profile.
 */
export interface EVAReferenceProfile {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly profileType: EVAProfileType;
  readonly sourceAgency: string;
  readonly applicableTechnology: string;
  readonly missionEnvironment: string;

  // Oxygen subsystem
  readonly oxygenMetabolicRateKgPerHour?: number | null;
  readonly oxygenSupplyLossRateKgPerHour?: number | null;
  readonly oxygenCapacityKg?: number | null;

  // Electrical power subsystem
  readonly electricalPowerWatts?: number | null;
  readonly batteryCapacityWh?: number | null;

  // Cooling water subsystem
  readonly coolingWaterLossKgPerHour?: number | null;
  readonly coolingSystemType?: CoolingSystemType | null;
  readonly coolingWaterCapacityKg?: number | null;

  // Duration limits
  readonly maximumSupportedDurationHours?: number | null;

  // Provenance and limitations
  readonly sourceIds: readonly string[];
  readonly limitations: readonly string[];
}

/**
 * Normalized route input contract for the unified EVA resource engine.
 */
export interface EVAResourceRouteInput {
  readonly regionId: "gale" | "jezero" | "oxia";
  readonly routeEvidence: RouteEvidence;

  /** Total route distance in meters, or null if uncomputed/unavailable. */
  readonly distanceMeters: number | null;

  /** Pre-calculated route travel time in hours (e.g. from terrain engine), or null. */
  readonly travelTimeHours: number | null;

  /** Total planned duration of scientific observation stops in hours. */
  readonly scienceStopHours: number;

  /** Additional planned stationary or operational activity in hours. */
  readonly otherActivityHours: number;

  /** Cumulative elevation gain in meters, if terrain routing is available. */
  readonly ascentMeters?: number | null;

  /** Cumulative elevation loss in meters, if terrain routing is available. */
  readonly descentMeters?: number | null;

  /** Whether the route metrics already include the return segment to base. */
  readonly roundTripIncluded: boolean;

  /** Identifiers of underlying DEM, ortho, or vector datasets used for this route. */
  readonly sourceDatasetIds: readonly string[];

  /** Non-fatal notices, terrain caveats, or geographic registration warnings. */
  readonly warnings: readonly string[];
}

/**
 * User-configurable planning assumptions and scenario reserves.
 */
export interface EVAPlanningConfig {
  /** Identifier of the selected reference profile. */
  readonly profileId: string;

  /** User overrides for a custom profile, when profileId === 'user-defined'. */
  readonly customProfile?: Partial<EVAReferenceProfile>;

  /**
   * Traversal speed assumption in km/h when route does not supply travelTimeHours.
   * Required for geometric routes (e.g. Oxia Planum or unrouted Gale/Jezero waypoints).
   */
  readonly speedKmh?: number | null;

  /** Percentage contingency allowance for oxygen (e.g. 20 for +20%). Default: 20%. */
  readonly oxygenPlanningReservePercent?: number;

  /** Percentage contingency allowance for electrical energy (e.g. 20 for +20%). Default: 20%. */
  readonly batteryPlanningReservePercent?: number;

  /** Percentage contingency allowance for cooling water (e.g. 20 for +20%). Default: 20%. */
  readonly coolingWaterPlanningReservePercent?: number;

  /** Explicit time contingency allowance in percent (e.g. 20 for +20%). Default: 0%. */
  readonly timeContingencyPercent?: number;

  /** Manual override for route distance in meters when geometric trajectory is unavailable. */
  readonly manualDistanceMeters?: number | null;

  /** Manual override for available oxygen capacity in kg. */
  readonly manualOxygenCapacityKg?: number | null;

  /** Manual override for available battery capacity in Wh. */
  readonly manualBatteryCapacityWh?: number | null;

  /** Manual override for available cooling water capacity in kg. */
  readonly manualCoolingWaterCapacityKg?: number | null;

  /** Manual override for spacesuit electrical power load in Watts. */
  readonly manualElectricalPowerWatts?: number | null;
}

/**
 * Fine-grained breakdown component for resource transparency.
 */
export interface ResourceBreakdownItem {
  readonly label: string;
  readonly amount: number;
  readonly unit: string;
  readonly note?: string;
}

/**
 * Detailed output for a single life-support resource.
 */
export interface EVAResourceEstimate {
  readonly resourceType: "oxygen" | "battery" | "cooling-water" | "duration";
  readonly status: ResourceEstimateStatus;
  readonly capacityStatus: CapacityAssessmentStatus;

  /** Net base consumption without reserves, or null if unavailable. */
  readonly baseRequirement: number | null;

  /** Configured reserve/contingency margin, or null if unavailable. */
  readonly configuredReserve: number | null;

  /** Total recommended planning provision (base + reserve), or null if unavailable. */
  readonly recommendedProvision: number | null;

  /** Available capacity from profile or manual entry, or null if unknown. */
  readonly availableCapacity: number | null;

  /** Remaining margin after provision (availableCapacity - recommendedProvision), or null. */
  readonly remainingCapacity: number | null;

  readonly unit: string;
  readonly displayUnit: string;
  readonly recommendedLabel: string;
  readonly modelAndSource: string;
  readonly scientificUncertainty: string;
  readonly missingInputs: readonly string[];
  readonly calculationAssumptions: readonly string[];
  readonly breakdown: readonly ResourceBreakdownItem[];
}

/**
 * Complete evaluation result from the unified EVA resource planning engine.
 */
export interface EVAPlanResult {
  readonly regionId: "gale" | "jezero" | "oxia";
  readonly routeEvidence: RouteEvidence;
  readonly profile: EVAReferenceProfile;
  readonly routeSummary: {
    readonly distanceMeters: number | null;
    readonly travelDurationHours: number | null;
    readonly scienceStopDurationHours: number;
    readonly otherActivityDurationHours: number;
    readonly contingencyDurationHours: number;
    readonly totalDurationHours: number | null;
    readonly roundTripIncluded: boolean;
    readonly routeType: "round-trip" | "one-way";
    readonly routeStatusText: string;
    readonly geographicUncertainty: string;
    readonly ascentMeters?: number | null;
    readonly descentMeters?: number | null;
  };
  readonly oxygen: EVAResourceEstimate;
  readonly battery: EVAResourceEstimate;
  readonly coolingWater: EVAResourceEstimate;
  readonly duration: EVAResourceEstimate;
  readonly overallStatus: ResourceEstimateStatus;
  readonly warnings: readonly string[];
  readonly scientificDisclaimer: string;
}
