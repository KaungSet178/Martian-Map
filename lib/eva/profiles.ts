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
      "Modern exploration spacesuit baseline from NASA/TP-20205011400. Sized for nominal crew metabolic exertion (295 W), active SWME evaporative cooling, and digital PLSS avionics.",
    profileType: "nasa-engineering-reference",
    sourceAgency: "NASA Johnson Space Center (ECLSS / BVAD)",
    applicableTechnology: "Exploration Extravehicular Mobility Unit (xEMU Architecture)",
    missionEnvironment: "Planetary Surface EVA (Mars / Lunar Surface)",

    // Oxygen: 0.076 kg/h metabolic + 0.005 kg/h leakage
    oxygenMetabolicRateKgPerHour: 0.076,
    oxygenSupplyLossRateKgPerHour: 0.005,
    oxygenCapacityKg: null, // Configurable in mission planning

    // Electrical Power: 140 W baseline draw, 1000 Wh usable battery
    electricalPowerWatts: 140.0,
    batteryCapacityWh: 1000.0,

    // Cooling Water: 0.57 kg/h consumptive SWME evaporation
    coolingWaterLossKgPerHour: 0.57,
    coolingSystemType: "spacesuit-water-membrane-evaporator",
    coolingWaterCapacityKg: null,

    // Operational limits
    maximumSupportedDurationHours: 8.0,

    sourceIds: [
      "BVAD-REV2-O2-METABOLIC",
      "BVAD-REV2-O2-LEAKAGE",
      "BVAD-REV2-POWER-EXPLORATION",
      "BVAD-REV2-BATTERY-CAPACITY",
      "BVAD-REV2-WATER-SWME",
      "BVAD-REV2-MAX-DURATION",
    ],
    limitations: [
      "Represents an engineering reference profile for conceptual exploration planning, not flight-certified hardware.",
      "Assumes nominal human metabolic exertion (295 W); actual consumption increases under steep grades or high exertion.",
      "SWME evaporative cooling vents water vapor; requires ambient backpressure accommodation in the Martian atmosphere (600–900 Pa).",
      "Potable crew drinking water is not included in the cooling-water calculation.",
    ],
  },

  "bvad-closed-loop-radiator": {
    id: "bvad-closed-loop-radiator",
    name: "NASA Life Support BVAD Rev 2 — Non-Venting Radiator Scenario",
    description:
      "Advanced closed-loop thermal control scenario from BVAD Rev 2 Section 5.2.3. Employs a non-venting regenerable radiator/phase-change heat sink, eliminating cooling water loss at the expense of higher electrical pumping load.",
    profileType: "nasa-engineering-reference",
    sourceAgency: "NASA Johnson Space Center (ECLSS / BVAD)",
    applicableTechnology: "Closed-Loop Regenerative Radiator / Phase Change Thermal Sink",
    missionEnvironment: "Planetary Surface EVA",

    oxygenMetabolicRateKgPerHour: 0.076,
    oxygenSupplyLossRateKgPerHour: 0.005,
    oxygenCapacityKg: null,

    // Increased electrical load for active coolant pumps and thermal actuators
    electricalPowerWatts: 160.0,
    batteryCapacityWh: 1000.0,

    // Non-venting: zero consumptive water loss
    coolingWaterLossKgPerHour: 0.0,
    coolingSystemType: "closed-loop-recirculating-radiator",
    coolingWaterCapacityKg: null,

    maximumSupportedDurationHours: 8.0,

    sourceIds: [
      "BVAD-REV2-O2-METABOLIC",
      "BVAD-REV2-O2-LEAKAGE",
      "BVAD-REV2-BATTERY-CAPACITY",
      "BVAD-REV2-WATER-CLOSED-LOOP",
      "BVAD-REV2-MAX-DURATION",
    ],
    limitations: [
      "Conceptual non-venting thermal architecture; relies on adequate radiative view factors and surface thermal rejection.",
      "Consumptive water loss is 0.00 kg/h, but the internal Liquid Cooling Garment (LCG) loop requires pre-charged recirculating water.",
      "Higher electrical power draw (160 W vs 140 W baseline) due to continuous active coolant circulation.",
    ],
  },

  "apollo-15-plss": {
    id: "apollo-15-plss",
    name: "Apollo 15–17 Portable Life Support System (A7LB / -7 PLSS)",
    description:
      "Historical NASA flight hardware specifications and measured lunar telemetry from Apollo 15–17 J-missions (1971–1972). Uses vintage silver-zinc batteries and a porous plate sublimator.",
    profileType: "historical-hardware",
    sourceAgency: "NASA Manned Spacecraft Center (Apollo Spacecraft Program Office)",
    applicableTechnology: "Apollo A7LB EMU / -7 PLSS Flight Hardware",
    missionEnvironment: "Lunar Surface (1/6 g, hard vacuum)",

    // Measured average lunar telemetry
    oxygenMetabolicRateKgPerHour: 0.077,
    oxygenSupplyLossRateKgPerHour: 0.008,
    oxygenCapacityKg: 0.866, // 1.91 lb primary bottle at 1400 psia

    // Silver-zinc battery: 25 Ah @ 16.8 V nominal, ~58 W average electrical load
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
      "Usable battery capacity (390 Wh) reflects 1970s silver-zinc chemistry, significantly lower in specific energy than modern lithium-ion systems.",
      "Values are documented historical flight telemetry, not modern Mars suit specifications.",
    ],
  },

  "nasa-std-3001-nominal": {
    id: "nasa-std-3001-nominal",
    name: "NASA-STD-3001 Volume 2 — Human Performance Baseline",
    description:
      "NASA Human-System Standard physiological baseline. Specifies human metabolic oxygen demand and structural suit leakage limits, but does NOT define spacesuit electrical power or cooling-water consumption.",
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
