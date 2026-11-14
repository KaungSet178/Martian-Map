/**
 * Oxygen Resource Estimation Subsystem.
 *
 * Implements Section 8 and Section 13 of the specification:
 * - Distinguishes metabolic oxygen consumption from structural supply-system losses.
 * - Prevents double-counting: BVAD specifies non-overlapping metabolic rate (0.076 kg/CM-h)
 *   and structural suit leakage (0.005 kg/h).
 * - Applies user-configured or reference planning reserve margin.
 * - Computes total recommended planning provision.
 * - Compares provision against configured or documented available tank capacity.
 * - Strictly avoids multiplying route distance by arbitrary kg/km factors.
 *
 * @module lib/eva/oxygen
 */

import type {
  CapacityAssessmentStatus,
  EVAPlanningConfig,
  EVAReferenceProfile,
  EVAResourceEstimate,
  ResourceBreakdownItem,
  ResourceEstimateStatus,
} from "./types";
import type { EVATimelineResult } from "./timeline";

export const DEFAULT_OXYGEN_RESERVE_PERCENT = 20.0; // 20% planning margin

/**
 * Calculate the estimated oxygen requirement and planning provision.
 */
export function calculateOxygenRequirement(
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
    Number.isFinite(config.oxygenPlanningReservePercent ?? DEFAULT_OXYGEN_RESERVE_PERCENT)
      ? (config.oxygenPlanningReservePercent ?? DEFAULT_OXYGEN_RESERVE_PERCENT)
      : DEFAULT_OXYGEN_RESERVE_PERCENT,
  );

  // 1. Check duration availability
  if (durationHours === null || !Number.isFinite(durationHours) || durationHours <= 0) {
    missingInputs.push("Valid positive total EVA duration (hours).");
  }

  // 2. Resolve oxygen rates
  // Use customProfile override if user-defined, else profile value
  const metabolicRate =
    profile.profileType === "user-defined" && config.customProfile?.oxygenMetabolicRateKgPerHour !== undefined
      ? config.customProfile.oxygenMetabolicRateKgPerHour
      : profile.oxygenMetabolicRateKgPerHour;

  const leakageRate =
    profile.profileType === "user-defined" && config.customProfile?.oxygenSupplyLossRateKgPerHour !== undefined
      ? config.customProfile.oxygenSupplyLossRateKgPerHour
      : profile.oxygenSupplyLossRateKgPerHour;

  if (metabolicRate === null || metabolicRate === undefined || !Number.isFinite(metabolicRate) || metabolicRate < 0) {
    missingInputs.push("Documented or configured metabolic oxygen consumption rate (kg/h).");
  }

  // Leakage can be 0 or null; if null, record notice
  const effectiveLeakageRate =
    leakageRate !== null && leakageRate !== undefined && Number.isFinite(leakageRate) && leakageRate >= 0
      ? leakageRate
      : 0;

  if (leakageRate === null || leakageRate === undefined) {
    assumptions.push("Suit structural leakage rate is not specified in profile; assumed 0 kg/h.");
  }

  // 3. Resolve usable tank capacity
  const configuredCapacity =
    config.manualOxygenCapacityKg !== undefined && config.manualOxygenCapacityKg !== null
      ? config.manualOxygenCapacityKg
      : profile.oxygenCapacityKg ?? null;

  // 4. Calculate consumption if inputs present
  let baseRequirement: number | null = null;
  let configuredReserve: number | null = null;
  let recommendedProvision: number | null = null;
  let remainingCapacity: number | null = null;

  if (missingInputs.length === 0 && durationHours !== null && metabolicRate !== null && metabolicRate !== undefined) {
    const metabolicO2Kg = metabolicRate * durationHours;
    const leakageO2Kg = effectiveLeakageRate * durationHours;

    baseRequirement = metabolicO2Kg + leakageO2Kg;
    configuredReserve = baseRequirement * (reservePercent / 100.0);
    recommendedProvision = baseRequirement + configuredReserve;

    breakdown.push({
      label: "Metabolic O₂ consumption",
      amount: metabolicO2Kg,
      unit: "kg",
      note: `${metabolicRate.toFixed(3)} kg/h × ${durationHours.toFixed(2)} h`,
    });

    if (effectiveLeakageRate > 0) {
      breakdown.push({
        label: "Suit structural leakage",
        amount: leakageO2Kg,
        unit: "kg",
        note: `${effectiveLeakageRate.toFixed(3)} kg/h × ${durationHours.toFixed(2)} h`,
      });
    }

    breakdown.push({
      label: `Planning reserve allowance (+${reservePercent.toFixed(0)}%)`,
      amount: configuredReserve,
      unit: "kg",
      note: "User/profile contingency margin",
    });

    if (configuredCapacity !== null && Number.isFinite(configuredCapacity) && configuredCapacity > 0) {
      remainingCapacity = configuredCapacity - recommendedProvision;
    }

    assumptions.push(
      `Calculated from ${durationHours.toFixed(2)} h total EVA duration with ${metabolicRate.toFixed(3)} kg/h metabolic rate and ${effectiveLeakageRate.toFixed(3)} kg/h suit leakage.`,
    );
    assumptions.push(`Planning reserve allowance configured at +${reservePercent.toFixed(0)}%.`);
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
    profile.profileType === "user-defined" ||
    config.manualOxygenCapacityKg !== undefined && config.manualOxygenCapacityKg !== null
  ) {
    status = "assumption-dependent";
  }

  const modelAndSource =
    profile.sourceIds.length > 0
      ? `Model: ${profile.name} (Sources: ${profile.sourceIds.join(", ")})`
      : `Model: ${profile.name} (User-defined planning inputs)`;

  const scientificUncertainty =
    timeline.routeEvidence === "terrain-derived"
      ? "Terrain-aware timeline with documented NASA metabolic baseline. Physiological exertion varies with astronaut fatigue and real-time metabolic response."
      : timeline.routeEvidence === "geometric"
        ? "Conditional estimate based on geometric distance and assumed travel speed. Unmodeled terrain slopes and surface roughness may increase physical exertion and oxygen demand."
        : "Unverified route geometry; oxygen demand cannot be verified without trajectory metrics.";

  return {
    resourceType: "oxygen",
    status,
    capacityStatus,
    baseRequirement,
    configuredReserve,
    recommendedProvision,
    availableCapacity: configuredCapacity,
    remainingCapacity,
    unit: "kg",
    displayUnit: "kg O₂",
    recommendedLabel: "Estimated oxygen provision",
    modelAndSource,
    scientificUncertainty,
    missingInputs,
    calculationAssumptions: assumptions,
    breakdown,
  };
}
