/**
 * Battery and Electrical Energy Estimation Subsystem.
 *
 * Implements Section 9 and Section 13 of the specification:
 * - Computes electrical energy in watt-hours (Wh):
 *   Energy required (Wh) = Electrical load (W) × Duration (h).
 * - Distinguishes usable battery capacity from required electrical energy and remaining energy.
 * - STRICT SAFEGUARD: Never converts astronaut metabolic heat (Watts) into battery electrical load.
 *   Metabolic exertion is biological heat, spacesuit electrical load is avionics, fans, pumps, and telemetry.
 * - If only battery capacity is documented but electrical load is unknown (e.g. NASA-STD-3001),
 *   consumption is marked UNAVAILABLE rather than invented.
 * - If electrical load was manually supplied or custom, status is ASSUMPTION-DEPENDENT.
 * - Compares provision against usable capacity and flags EXCEEDS-CONFIGURED-CAPACITY.
 *
 * @module lib/eva/battery
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

export const DEFAULT_BATTERY_RESERVE_PERCENT = 20.0; // 20% planning margin

/**
 * Calculate the estimated electrical energy requirement and battery planning provision.
 */
export function calculateBatteryRequirement(
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
    Number.isFinite(config.batteryPlanningReservePercent ?? DEFAULT_BATTERY_RESERVE_PERCENT)
      ? (config.batteryPlanningReservePercent ?? DEFAULT_BATTERY_RESERVE_PERCENT)
      : DEFAULT_BATTERY_RESERVE_PERCENT,
  );

  // 1. Duration check
  if (durationHours === null || !Number.isFinite(durationHours) || durationHours <= 0) {
    missingInputs.push("Valid positive total EVA duration (hours).");
  }

  // 2. Resolve electrical power load (W)
  let electricalPowerWatts: number | null = null;
  let isUserSuppliedPower = false;

  if (
    config.manualElectricalPowerWatts !== undefined &&
    config.manualElectricalPowerWatts !== null &&
    Number.isFinite(config.manualElectricalPowerWatts) &&
    config.manualElectricalPowerWatts >= 0
  ) {
    electricalPowerWatts = config.manualElectricalPowerWatts;
    isUserSuppliedPower = true;
    assumptions.push(`Electrical power draw (${electricalPowerWatts.toFixed(0)} W) supplied by user manual override.`);
  } else if (
    profile.profileType === "user-defined" &&
    config.customProfile?.electricalPowerWatts !== undefined
  ) {
    electricalPowerWatts = config.customProfile.electricalPowerWatts;
    isUserSuppliedPower = true;
    assumptions.push(`Electrical power draw (${electricalPowerWatts ?? "unknown"} W) configured in custom profile.`);
  } else if (profile.electricalPowerWatts !== null && profile.electricalPowerWatts !== undefined) {
    electricalPowerWatts = profile.electricalPowerWatts;
    assumptions.push(`Spacesuit electrical load (${electricalPowerWatts.toFixed(0)} W) derived from ${profile.name}.`);
  } else {
    // Power load unknown (e.g. physiological standard NASA-STD-3001)
    missingInputs.push("Spacesuit electrical load in Watts (W). Profile defines life-support standard without avionics power draw.");
  }

  // 3. Resolve usable battery capacity (Wh)
  const configuredCapacity =
    config.manualBatteryCapacityWh !== undefined && config.manualBatteryCapacityWh !== null
      ? config.manualBatteryCapacityWh
      : profile.batteryCapacityWh ?? null;

  if (configuredCapacity !== null && Number.isFinite(configuredCapacity)) {
    assumptions.push(`Configured usable battery capacity: ${configuredCapacity.toFixed(0)} Wh.`);
  }

  // 4. Calculate energy consumption if inputs present
  let baseRequirement: number | null = null;
  let configuredReserve: number | null = null;
  let recommendedProvision: number | null = null;
  let remainingCapacity: number | null = null;

  if (missingInputs.length === 0 && durationHours !== null && electricalPowerWatts !== null) {
    baseRequirement = electricalPowerWatts * durationHours;
    configuredReserve = baseRequirement * (reservePercent / 100.0);
    recommendedProvision = baseRequirement + configuredReserve;

    breakdown.push({
      label: "Subsystem electrical energy draw",
      amount: baseRequirement,
      unit: "Wh",
      note: `${electricalPowerWatts.toFixed(0)} W load × ${durationHours.toFixed(2)} h duration`,
    });

    breakdown.push({
      label: `Battery planning reserve allowance (+${reservePercent.toFixed(0)}%)`,
      amount: configuredReserve,
      unit: "Wh",
      note: "User/profile contingency margin",
    });

    if (configuredCapacity !== null && Number.isFinite(configuredCapacity) && configuredCapacity > 0) {
      remainingCapacity = configuredCapacity - recommendedProvision;
    }

    assumptions.push(`Energy calculation excludes astronaut metabolic heat; accounts strictly for electrical avionics and pump loads.`);
    assumptions.push(`Battery contingency reserve configured at +${reservePercent.toFixed(0)}%.`);
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
    isUserSuppliedPower ||
    profile.profileType === "user-defined" ||
    config.manualBatteryCapacityWh !== undefined && config.manualBatteryCapacityWh !== null
  ) {
    status = "assumption-dependent";
  }

  const modelAndSource =
    profile.sourceIds.length > 0 && !isUserSuppliedPower
      ? `Model: ${profile.name} (Sources: ${profile.sourceIds.join(", ")})`
      : isUserSuppliedPower
        ? `Model: ${profile.name} with user-supplied electrical power (${electricalPowerWatts?.toFixed(0) ?? "?"} W)`
        : `Model: ${profile.name}`;

  const scientificUncertainty =
    electricalPowerWatts === null
      ? "Spacesuit avionics electrical load is unknown in the selected reference profile. Electrical consumption cannot be calculated without an explicit power assumption."
      : timeline.routeEvidence === "terrain-derived"
        ? "Constant power draw model across mission duration. Does not model variable heater duty cycles or communication transmission burst loads."
        : "Conditional electrical estimate based on geometric route duration. Real traversal time may vary with terrain impedance.";

  return {
    resourceType: "battery",
    status,
    capacityStatus,
    baseRequirement,
    configuredReserve,
    recommendedProvision,
    availableCapacity: configuredCapacity,
    remainingCapacity,
    unit: "Wh",
    displayUnit: "Wh",
    recommendedLabel: "Estimated electrical energy requirement",
    modelAndSource,
    scientificUncertainty,
    missingInputs,
    calculationAssumptions: assumptions,
    breakdown,
  };
}
