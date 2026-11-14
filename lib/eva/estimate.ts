/**
 * Unified EVA Resource Estimation Engine.
 *
 * Implements Section 3, Section 12, Section 13, and Section 14:
 * - Single, reusable estimation engine for Gale, Jezero, and Oxia.
 * - Computes four primary resources:
 *   1. Oxygen provision (kg)
 *   2. Electrical energy requirement (Wh)
 *   3. Cooling-water provision (kg / L)
 *   4. Total EVA duration (hours / minutes)
 * - Harmonizes all result states, uncertainties, citations, and calculation assumptions.
 * - Completely decoupled from MapLibre, DOM, and region-specific raster structures.
 *
 * @module lib/eva/estimate
 */

import { calculateBatteryRequirement } from "./battery";
import { calculateCoolingRequirement } from "./cooling";
import { calculateOxygenRequirement } from "./oxygen";
import { getEVAProfile, DEFAULT_PROFILE_ID } from "./profiles";
import { calculateEVATimeline, formatHoursToHMin } from "./timeline";
import type {
  CapacityAssessmentStatus,
  EVAPlanningConfig,
  EVAPlanResult,
  EVAReferenceProfile,
  EVAResourceEstimate,
  EVAResourceRouteInput,
  ResourceEstimateStatus,
} from "./types";

export const SCIENTIFIC_EVA_DISCLAIMER =
  "Hypothetical mission planning estimate — calculated using documented NASA life-support baseline values, " +
  "historical mission data, or explicit user assumptions. Does NOT constitute NASA operational flight approval, " +
  "spacesuit qualification, or astronaut safety certification.";

/**
 * Run the unified EVA resource estimation calculation.
 */
export function estimateEVAResources(
  route: EVAResourceRouteInput,
  config: EVAPlanningConfig,
  profileOverride?: EVAReferenceProfile,
): EVAPlanResult {
  // 1. Resolve reference profile
  const baseProfile = profileOverride ?? getEVAProfile(config.profileId) ?? getEVAProfile(DEFAULT_PROFILE_ID)!;
  const profile: EVAReferenceProfile =
    baseProfile.profileType === "user-defined" && config.customProfile
      ? {
          ...baseProfile,
          ...config.customProfile,
          id: baseProfile.id,
          profileType: "user-defined",
          limitations: [
            ...baseProfile.limitations,
            "Custom parameters applied from user scenario.",
          ],
        }
      : baseProfile;

  // 2. Compute timeline
  const timeline = calculateEVATimeline(route, config);

  // 3. Compute resources
  const oxygen = calculateOxygenRequirement(timeline, profile, config);
  const battery = calculateBatteryRequirement(timeline, profile, config);
  const coolingWater = calculateCoolingRequirement(timeline, profile, config);

  // 4. Build duration resource estimate
  const maxDuration = profile.maximumSupportedDurationHours ?? null;
  let durationCapacityStatus: CapacityAssessmentStatus = "capacity-unknown";
  let durationRemaining: number | null = null;

  if (timeline.totalDurationHours === null) {
    durationCapacityStatus = "insufficient-evidence";
  } else if (maxDuration === null || !Number.isFinite(maxDuration)) {
    durationCapacityStatus = "capacity-unknown";
  } else if (timeline.totalDurationHours > maxDuration) {
    durationCapacityStatus = "exceeds-configured-capacity";
  } else {
    durationCapacityStatus = "within-configured-capacity";
    durationRemaining = maxDuration - timeline.totalDurationHours;
  }

  let durationStatus: ResourceEstimateStatus = "estimated";
  if (timeline.totalDurationHours === null) {
    durationStatus = "unavailable";
  } else if (durationCapacityStatus === "exceeds-configured-capacity") {
    durationStatus = "exceeds-configured-capacity";
  } else if (
    timeline.status === "assumption-dependent" ||
    profile.profileType === "user-defined"
  ) {
    durationStatus = "assumption-dependent";
  }

  const durationEstimate: EVAResourceEstimate = {
    resourceType: "duration",
    status: durationStatus,
    capacityStatus: durationCapacityStatus,
    baseRequirement: timeline.baseDurationHours,
    configuredReserve: timeline.contingencyDurationHours,
    recommendedProvision: timeline.totalDurationHours,
    availableCapacity: maxDuration,
    remainingCapacity: durationRemaining,
    unit: "hours",
    displayUnit: formatHoursToHMin(timeline.totalDurationHours),
    recommendedLabel: "Estimated EVA duration",
    modelAndSource:
      maxDuration !== null
        ? `${profile.name} (Max supported duration: ${maxDuration.toFixed(1)} h)`
        : `${profile.name} (Unspecified duration limit)`,
    scientificUncertainty:
      timeline.routeEvidence === "terrain-derived"
        ? "Computed from terrain-derived travel velocity and planned scientific stop durations."
        : timeline.routeEvidence === "geometric"
          ? "Derived from spherical Mars geometric distance and user planning speed assumption. Actual terrain traversal time may differ."
          : "Route distance and travel duration are unavailable.",
    missingInputs: timeline.missingInputs,
    calculationAssumptions: timeline.assumptions,
    breakdown: [
      {
        label: "Travel time",
        amount: timeline.travelDurationHours ?? 0,
        unit: "hours",
        note: formatHoursToHMin(timeline.travelDurationHours),
      },
      {
        label: "Science stop observations",
        amount: timeline.scienceStopDurationHours,
        unit: "hours",
        note: formatHoursToHMin(timeline.scienceStopDurationHours),
      },
      ...(timeline.otherActivityDurationHours > 0
        ? [
            {
              label: "Other planned activity",
              amount: timeline.otherActivityDurationHours,
              unit: "hours",
              note: formatHoursToHMin(timeline.otherActivityDurationHours),
            },
          ]
        : []),
      ...(timeline.contingencyDurationHours > 0
        ? [
            {
              label: `Contingency time (+${(config.timeContingencyPercent ?? 0).toFixed(0)}%)`,
              amount: timeline.contingencyDurationHours,
              unit: "hours",
              note: formatHoursToHMin(timeline.contingencyDurationHours),
            },
          ]
        : []),
    ],
  };

  // 5. Aggregate overall status
  let overallStatus: ResourceEstimateStatus = "estimated";
  const statuses = [oxygen.status, battery.status, coolingWater.status, durationEstimate.status];
  if (statuses.includes("exceeds-configured-capacity")) {
    overallStatus = "exceeds-configured-capacity";
  } else if (statuses.includes("unavailable")) {
    // If core duration is unavailable, overall is unavailable
    if (durationEstimate.status === "unavailable") {
      overallStatus = "unavailable";
    } else {
      overallStatus = "assumption-dependent";
    }
  } else if (statuses.includes("assumption-dependent")) {
    overallStatus = "assumption-dependent";
  }

  // 6. Route status text and uncertainty
  let routeStatusText = "Route metrics unavailable";
  let geographicUncertainty = "Geographic coordinates unverified";

  if (route.routeEvidence === "terrain-derived") {
    routeStatusText = "Terrain-derived route";
    geographicUncertainty =
      "High-resolution DEM terrain model; independent surface ground-registration caveats apply.";
  } else if (route.routeEvidence === "geometric") {
    routeStatusText = "Proposed geometric trajectory";
    geographicUncertainty =
      "Spherical Mars approximation (R = 3,396,190 m). Terrain relief, slopes, and obstacle detours not modeled.";
  }

  const warnings = [...timeline.warnings, ...profile.limitations];

  return {
    regionId: route.regionId,
    routeEvidence: route.routeEvidence,
    profile,
    routeSummary: {
      distanceMeters: route.distanceMeters,
      travelDurationHours: timeline.travelDurationHours,
      scienceStopDurationHours: timeline.scienceStopDurationHours,
      otherActivityDurationHours: timeline.otherActivityDurationHours,
      contingencyDurationHours: timeline.contingencyDurationHours,
      totalDurationHours: timeline.totalDurationHours,
      roundTripIncluded: route.roundTripIncluded,
      routeType: timeline.routeType,
      routeStatusText,
      geographicUncertainty,
      ascentMeters: route.ascentMeters ?? null,
      descentMeters: route.descentMeters ?? null,
    },
    oxygen,
    battery,
    coolingWater,
    duration: durationEstimate,
    overallStatus,
    warnings,
    scientificDisclaimer: SCIENTIFIC_EVA_DISCLAIMER,
  };
}
