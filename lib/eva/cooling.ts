/**
 * Cooling Water and Thermal Rejection Estimation Subsystem.
 *
 * Implements Section 10 and Section 13 of the specification:
 * - Distinguishes consumptive cooling water loss (sublimator/SWME) from recirculating
 *   internal garment coolant (Liquid Cooling Garment loop ~1.5 L/min is NOT consumed).
 * - Distinguishes non-venting closed-loop radiators (0.00 kg/h consumptive loss).
 * - For architectures without a documented cooling loss model (e.g. NASA-STD-3001),
 *   reports the cooling estimate as UNAVAILABLE rather than inventing a number.
 * - Keeps crew potable drinking water strictly separate from cooling water.
 * - Applies configured planning reserve and evaluates against configured feedwater capacity.
 *
 * @module lib/eva/cooling
 */

import type {
  CapacityAssessmentStatus,
  CoolingSystemType,
  EVAPlanningConfig,
  EVAReferenceProfile,
  EVAResourceEstimate,
  ResourceBreakdownItem,
  ResourceEstimateStatus,
} from "./types";
import type { EVATimelineResult } from "./timeline";

export const DEFAULT_COOLING_WATER_RESERVE_PERCENT = 20.0; // 20% planning margin
export const WATER_DENSITY_KG_PER_LITER = 1.0; // Standard density at 20°C (1.00 kg/L)

/**
 * Calculate the estimated cooling-water requirement and planning provision.
 */
export function calculateCoolingRequirement(
  timeline: EVATimelineResult,
  profile: EVAReferenceProfile,
  config: EVAPlanningConfig,
): EVAResourceEstimate {
  const missingInputs: string[] = [];
  const assumptions: string[] = [];
  const breakdown: ResourceBreakdownItem[] = [];

  const durationHours = timeline.totalDurationHours;
  const reservePercent = Math.max(
    0,
    Number.isFinite(config.coolingWaterPlanningReservePercent ?? DEFAULT_COOLING_WATER_RESERVE_PERCENT)
      ? (config.coolingWaterPlanningReservePercent ?? DEFAULT_COOLING_WATER_RESERVE_PERCENT)
      : DEFAULT_COOLING_WATER_RESERVE_PERCENT,
  );

  // 1. Duration check
  if (durationHours === null || !Number.isFinite(durationHours) || durationHours <= 0) {
    missingInputs.push("Valid positive total EVA duration (hours).");
  }

  // 2. Resolve cooling system type and loss rate
  let systemType: CoolingSystemType | null = profile.coolingSystemType ?? null;
  let lossRateKgPerHour: number | null = null;
  let isUserSuppliedCooling = false;

  if (profile.profileType === "user-defined") {
    isUserSuppliedCooling = true;
    lossRateKgPerHour =
      config.customProfile?.coolingWaterLossKgPerHour !== undefined
        ? config.customProfile.coolingWaterLossKgPerHour
        : profile.coolingWaterLossKgPerHour ?? null;
    systemType =
      config.customProfile?.coolingSystemType !== undefined
        ? config.customProfile.coolingSystemType
        : profile.coolingSystemType ?? "other-consumptive";
  } else {
    lossRateKgPerHour = profile.coolingWaterLossKgPerHour ?? null;
  }

  if (lossRateKgPerHour === null || !Number.isFinite(lossRateKgPerHour) || lossRateKgPerHour < 0) {
    missingInputs.push(
      "Documented cooling-water loss model for selected spacesuit architecture. Physiological and generic profiles do not specify thermal rejection fluid loss.",
    );
  }

  // 3. Resolve feedwater tank capacity
  const configuredCapacity =
    config.manualCoolingWaterCapacityKg !== undefined && config.manualCoolingWaterCapacityKg !== null
      ? config.manualCoolingWaterCapacityKg
      : profile.coolingWaterCapacityKg ?? null;

  if (configuredCapacity !== null && Number.isFinite(configuredCapacity)) {
    assumptions.push(`Configured cooling feedwater capacity: ${configuredCapacity.toFixed(2)} kg.`);
  }

  // 4. Calculate consumption
  let baseRequirement: number | null = null;
  let configuredReserve: number | null = null;
  let recommendedProvision: number | null = null;
  let remainingCapacity: number | null = null;

  if (missingInputs.length === 0 && durationHours !== null && lossRateKgPerHour !== null) {
    baseRequirement = lossRateKgPerHour * durationHours;
    configuredReserve = baseRequirement * (reservePercent / 100.0);
    recommendedProvision = baseRequirement + configuredReserve;

    if (lossRateKgPerHour > 0) {
      breakdown.push({
        label: "Consumptive evaporative/sublimation loss",
        amount: baseRequirement,
        unit: "kg",
        note: `${lossRateKgPerHour.toFixed(2)} kg/h × ${durationHours.toFixed(2)} h duration`,
      });

      breakdown.push({
        label: `Feedwater planning reserve allowance (+${reservePercent.toFixed(0)}%)`,
        amount: configuredReserve,
        unit: "kg",
        note: "Contingency thermal margin",
      });

      assumptions.push(
        `Consumptive cooling loss calculated at ${lossRateKgPerHour.toFixed(2)} kg/h (${(lossRateKgPerHour / WATER_DENSITY_KG_PER_LITER).toFixed(2)} L/h) via ${systemType ?? "evaporative"}.`,
      );
      assumptions.push("Does not treat internal liquid cooling garment (LCG) recirculating flow as consumable loss.");
    } else {
      breakdown.push({
        label: "Closed-loop regenerative thermal control",
        amount: 0.0,
        unit: "kg",
        note: "Non-venting radiator architecture; zero expendable water loss.",
      });
      assumptions.push("Non-venting closed-loop thermal control; no expendable water consumed.");
    }

    if (configuredCapacity !== null && Number.isFinite(configuredCapacity) && configuredCapacity > 0) {
      remainingCapacity = configuredCapacity - recommendedProvision;
    }

    assumptions.push("Drinking water provision is tracked separately from cooling feedwater.");
  }

  // 5. Determine capacity status
  let capacityStatus: CapacityAssessmentStatus = "capacity-unknown";
  if (recommendedProvision === null) {
    capacityStatus = "insufficient-evidence";
  } else if (configuredCapacity === null || !Number.isFinite(configuredCapacity)) {
    capacityStatus = "capacity-unknown";
  } else if (recommendedProvision > configuredCapacity) {
    capacityStatus = "exceeds-configured-capacity";
  } else {
    capacityStatus = "within-configured-capacity";
  }

  // 6. Determine overall estimate status
  let status: ResourceEstimateStatus = "estimated";
  if (recommendedProvision === null) {
    status = "unavailable";
  } else if (capacityStatus === "exceeds-configured-capacity") {
    status = "exceeds-configured-capacity";
  } else if (
    timeline.status === "assumption-dependent" ||
    isUserSuppliedCooling ||
    profile.profileType === "user-defined" ||
    config.manualCoolingWaterCapacityKg !== undefined && config.manualCoolingWaterCapacityKg !== null
  ) {
    status = "assumption-dependent";
  }

  const modelAndSource =
    lossRateKgPerHour === null
      ? "Cooling-water estimate unavailable for selected suit model"
      : profile.sourceIds.length > 0 && !isUserSuppliedCooling
        ? `Model: ${profile.name} (Sources: ${profile.sourceIds.join(", ")})`
        : `Model: ${profile.name} (Custom cooling assumption)`;

  const scientificUncertainty =
    lossRateKgPerHour === null
      ? "No cooling-water consumption rate exists in the selected profile. Thermal rejection water loss depends strongly on spacesuit cooling technology (sublimator, SWME, or non-venting radiator)."
      : lossRateKgPerHour === 0
        ? "Assumes 100% heat rejection through closed-loop radiator. If radiative environmental temperatures exceed suit setpoint, supplemental venting or phase change storage is required."
        : timeline.routeEvidence === "terrain-derived"
          ? "Nominal evaporative loss rate. Real metabolic heat rejection rises with astronaut exertion on slopes."
          : "Conditional evaporative estimate based on geometric route duration.";

  return {
    resourceType: "cooling-water",
    status,
    capacityStatus,
    baseRequirement,
    configuredReserve,
    recommendedProvision,
    availableCapacity: configuredCapacity,
    remainingCapacity,
    unit: "kg",
    displayUnit: "kg (L)",
    recommendedLabel: "Estimated cooling-water provision",
    modelAndSource,
    scientificUncertainty,
    missingInputs,
    calculationAssumptions: assumptions,
    breakdown,
  };
}
