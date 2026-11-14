/**
 * NASA Reference Profiles and Profile Registry for EVA Resource Planning.
 *
 * Implements Section 7 of the specification:
 * - Extensible, source-backed profile library.
 * - Supports historical hardware (Apollo 15–17 PLSS), NASA engineering references
 *   (BVAD Rev 2 exploration baselines), and transparent user-defined assumptions.
 * - Explicitly preserves partial information: missing parameters are set to null
 *   rather than synthesized or fabricated.
 *
 * @module lib/eva/profiles
 */

import type { EVAReferenceProfile } from "./types";

export const EVA_REFERENCE_PROFILES: Record<string, EVAReferenceProfile> = {
  "bvad-exploration-baseline": {
    id: "bvad-exploration-baseline",
    name: "NASA Life Support BVAD Rev 2 — Planetary Exploration Reference",
    description:
      "Modern exploration spacesuit life-support baseline from NASA/TP-2015-218570/REV2. Sized for nominal crew metabolic exertion (295 W / 1062 kJ/h), active SWME evaporative cooling (0.57 kg/h), and structural suit leakage (0.005 kg/h). Spacesuit electrical power draw and battery capacity are not specified in BVAD Rev 2 and remain unmodeled unless supplied by user override.",
    profileType: "nasa-engineering-reference",
    sourceAgency: "NASA Johnson Space Center (ECLSS / BVAD)",
    applicableTechnology: "Exploration Extravehicular Mobility Unit (xEMU Architecture)",
    missionEnvironment: "Planetary Surface EVA (Mars / Lunar Surface)",

    // Oxygen: 0.076 kg/h metabolic + 0.005 kg/h leakage
    oxygenMetabolicRateKgPerHour: 0.076,
    oxygenSupplyLossRateKgPerHour: 0.005,
    oxygenCapacityKg: null, // Configurable in mission planning

    // Electrical Power: Unspecified in BVAD Rev 2 (evaluated as UNAVAILABLE unless configured)
    electricalPowerWatts: null,
    batteryCapacityWh: null,

    // Cooling Water: 0.57 kg/h consumptive SWME evaporation baseline
    coolingWaterLossKgPerHour: 0.57,
    coolingSystemType: "spacesuit-water-membrane-evaporator",
    coolingWaterCapacityKg: null,

    // Operational limits
    maximumSupportedDurationHours: 8.0,

    sourceIds: [
      "BVAD-REV2-O2-METABOLIC",
      "BVAD-REV2-O2-LEAKAGE",
      "BVAD-REV2-WATER-SWME",
      "BVAD-REV2-MAX-DURATION",
    ],
    limitations: [
      "Represents an engineering reference profile from NASA/TP-2015-218570/REV2 for conceptual exploration planning, not flight-certified hardware.",
      "NASA BVAD Rev 2 does not specify spacesuit avionics electrical power draw or battery capacity. Electrical energy requirement is reported as UNAVAILABLE unless the user configures an electrical load assumption in Planning Settings.",
      "Assumes nominal human metabolic exertion (295 W / 1062 kJ/h; ~0.30 kg O₂ per 4-h EVA); actual consumption increases under steep grades or high exertion.",
      "SWME evaporative cooling vents water vapor; requires ambient backpressure accommodation in the Martian atmosphere (600–900 Pa).",
      "Potable crew drinking water is not included in the cooling-water calculation.",
    ],
  },

  "bvad-closed-loop-radiator": {
    id: "bvad-closed-loop-radiator",
    name: "NASA Life Support BVAD Rev 2 — Non-Venting Radiator Scenario",
    description:
      "Advanced closed-loop thermal control scenario from BVAD Rev 2 Section 5.2.3. Employs a non-venting regenerable radiator/phase-change heat sink, eliminating cooling water loss (0.00 kg/h). Spacesuit electrical power and battery capacity are not specified in BVAD Rev 2 and remain unmodeled unless supplied by user override.",
    profileType: "nasa-engineering-reference",
    sourceAgency: "NASA Johnson Space Center (ECLSS / BVAD)",
    applicableTechnology: "Closed-Loop Regenerative Radiator / Phase Change Thermal Sink",
    missionEnvironment: "Planetary Surface EVA",

    oxygenMetabolicRateKgPerHour: 0.076,
    oxygenSupplyLossRateKgPerHour: 0.005,
    oxygenCapacityKg: null,

    // Electrical load and battery unspecified in BVAD Rev 2
    electricalPowerWatts: null,
    batteryCapacityWh: null,

    // Non-venting: zero consumptive water loss
    coolingWaterLossKgPerHour: 0.0,
    coolingSystemType: "closed-loop-recirculating-radiator",
    coolingWaterCapacityKg: null,

    maximumSupportedDurationHours: 8.0,

    sourceIds: [
      "BVAD-REV2-O2-METABOLIC",
      "BVAD-REV2-O2-LEAKAGE",
      "BVAD-REV2-WATER-CLOSED-LOOP",
      "BVAD-REV2-MAX-DURATION",
    ],
    limitations: [
      "Conceptual non-venting thermal architecture; relies on adequate radiative view factors and surface thermal rejection.",
      "Consumptive water loss is 0.00 kg/h, but the internal Liquid Cooling Garment (LCG) loop requires pre-charged recirculating water.",
      "Spacesuit electrical power draw and battery capacity are not specified in BVAD Rev 2 and remain unmodeled unless supplied by user override.",
    ],
  },

  "apollo-15-plss": {
    id: "apollo-15-plss",
    name: "Apollo 15–17 Portable Life Support System (A7LB / -7 PLSS)",
    description:
      "Historical NASA flight hardware specifications and measured lunar telemetry from Apollo 15–17 J-missions (1971–1972) documented in NASA TN D-8093 and CSD-A-096. All four subsystems are fully documented from flight telemetry and qualification testing.",
    profileType: "historical-hardware",
    sourceAgency: "NASA Lyndon B. Johnson Space Center / Crew Systems Division",
    applicableTechnology: "Apollo A7LB EMU / -7 PLSS Flight Hardware",
    missionEnvironment: "Lunar Surface (1/6 g, hard vacuum)",

    // Measured average lunar telemetry
    oxygenMetabolicRateKgPerHour: 0.077,
    oxygenSupplyLossRateKgPerHour: 0.008,
    oxygenCapacityKg: 0.866, // 1.91 lb primary bottle at 1400 psia

    // Silver-zinc battery: 21.4 Ah min capability @ 16.8 V nominal, ~58 W average electrical load
    electricalPowerWatts: 58.0,
    batteryCapacityWh: 390.0,

    // Porous plate sublimator: 11.5 lb water tank, ~0.57 kg/h sublimation loss
    coolingWaterLossKgPerHour: 0.57,
    coolingSystemType: "porous-plate-sublimator",
    coolingWaterCapacityKg: 5.22,

    maximumSupportedDurationHours: 7.5,

    sourceIds: [
      "APOLLO15-O2-METABOLIC",
      "APOLLO15-O2-LEAKAGE",
      "APOLLO15-O2-CAPACITY",
      "APOLLO15-POWER-DRAW",
      "APOLLO15-BATTERY-CAPACITY",
      "APOLLO15-WATER-SUBLIMATOR",
      "APOLLO15-WATER-CAPACITY",
      "APOLLO15-MAX-DURATION",
    ],
    limitations: [
      "Historical hardware engineered for lunar vacuum, not Martian atmospheric conditions.",
      "The Apollo porous plate sublimator relies on hard vacuum (< 10^-3 Torr) to form an ice sheet on the porous metal plate; it cannot operate directly against the Martian atmospheric pressure (~600–900 Pa) without a vacuum pump or backpressure chamber.",
      "Usable battery capacity (390 Wh) reflects 1970s silver-zinc chemistry under flight qualification (minimum capability 21.4 A-h / 59.8 kC, 360 Wh nominal, 390 Wh rated usable). Note: 279–315 Wh applied to earlier Apollo 11–14 -6 PLSS.",
      "Values are documented historical flight telemetry from NASA TN D-8093 and CSD-A-096, not modern Mars suit specifications.",
    ],
  },

  "nasa-std-3001-nominal": {
    id: "nasa-std-3001-nominal",
    name: "NASA-STD-3001 Volume 2 — Human Performance Baseline",
    description:
      "NASA Human-System Standard physiological baseline (NASA-STD-3001 Vol 2 Rev D). Specifies human metabolic oxygen demand (0.080 kg/h at 300 W workload) and structural suit leakage limits (0.008 kg/h), but does NOT define spacesuit electrical power or cooling-water consumption.",
    profileType: "nasa-engineering-reference",
    sourceAgency: "NASA Office of the Chief Health and Medical Officer",
    applicableTechnology: "General Spacesuit Physiological Baseline",
    missionEnvironment: "Planetary Surface EVA",

    // Standard crew metabolic O2 rate (300 W workload) + max allowable suit leakage (100 sccm)
    oxygenMetabolicRateKgPerHour: 0.080,
    oxygenSupplyLossRateKgPerHour: 0.008,
    oxygenCapacityKg: null,

    // Electrical load and battery are architecture-specific -> null in physiological standard
    electricalPowerWatts: null,
    batteryCapacityWh: null,

    // Cooling water is architecture-specific -> null in physiological standard
    coolingWaterLossKgPerHour: null,
    coolingSystemType: null,
    coolingWaterCapacityKg: null,

    maximumSupportedDurationHours: 8.0,

    sourceIds: [
      "NASA-STD-3001-O2-METABOLIC",
      "NASA-STD-3001-O2-LEAKAGE",
      "NASA-STD-3001-MAX-DURATION",
      "NASA-STD-3001-RESERVE",
    ],
    limitations: [
      "NASA-STD-3001 defines human physiological and medical limits, not spacesuit avionics or thermal subsystems.",
      "Electrical power draw and cooling-water loss are reported as UNAVAILABLE unless explicitly configured by the user.",
      "Calculated oxygen consumption represents human metabolic requirements plus qualification leakage limits.",
    ],
  },

  "user-defined": {
    id: "user-defined",
    name: "User-Defined Custom Assumptions",
    description:
      "Transparent user-configured engineering scenario. Allows custom oxygen rates, electrical loads, cooling-system losses, and available tank/battery capacities.",
    profileType: "user-defined",
    sourceAgency: "User Planning Scenario",
    applicableTechnology: "Custom Engineering Model",
    missionEnvironment: "User-Configured Surface Environment",

    oxygenMetabolicRateKgPerHour: 0.076,
    oxygenSupplyLossRateKgPerHour: 0.005,
    oxygenCapacityKg: 1.0,

    electricalPowerWatts: 120.0,
    batteryCapacityWh: 800.0,

    coolingWaterLossKgPerHour: 0.5,
    coolingSystemType: "other-consumptive",
    coolingWaterCapacityKg: 4.0,

    maximumSupportedDurationHours: 8.0,

    sourceIds: [],
    limitations: [
      "All rates, capacities, and durations reflect hypothetical user planning inputs, NOT certified NASA values.",
      "Results must be labeled as assumption-dependent.",
      "Does not certify spacesuit safety, life-support compliance, or astronaut survival.",
    ],
  },
};

export const DEFAULT_PROFILE_ID = "bvad-exploration-baseline";

/**
 * Retrieve an EVA reference profile by identifier.
 */
export function getEVAProfile(id: string): EVAReferenceProfile | undefined {
  return EVA_REFERENCE_PROFILES[id];
}

/**
 * List all available reference profiles.
 */
export function listEVAProfiles(): readonly EVAReferenceProfile[] {
  return Object.values(EVA_REFERENCE_PROFILES);
}
