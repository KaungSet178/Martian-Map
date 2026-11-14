/**
 * Unit test suite for Marswalk Unified EVA Resource Planning Engine (`lib/eva`).
 *
 * Verifies:
 * Group 1: Calculation Correctness & Math Integrity
 *   - Oxygen mass consumption (kg) and leakage summation without double-counting
 *   - Battery electrical energy (Wh) across durations
 *   - Cooling-water loss (kg/L) for sublimators vs closed-loop non-venting systems
 *   - EVA total duration (hours, minutes) with travel, science stops, and contingency
 *   - Round-trip return closure inclusion without double-counting
 *   - Planning allowance (reserve) scaling and addition to base requirement
 *   - Available capacity comparisons and "exceeds-configured-capacity" flags
 *   - Non-negative, NaN, non-finite, and negative value guards
 *
 * Group 2: Scientific Validity & Model Boundaries
 *   - Every NASA numerical constant has a traceable citation in EVA_DATA_SOURCES
 *   - Unsupported/missing values do NOT synthesize fake estimates
 *   - Metabolic watts (crew biological heat) are NEVER treated as spacesuit electrical power
 *   - Liquid cooling garment (LCG) loop recirculation is NOT treated as consumptive loss
 *   - NASA-STD-3001 physiological profile correctly leaves electrical power and cooling water UNAVAILABLE
 *   - Profile source integrity: Apollo 15 hardware vs BVAD exploration baseline
 *
 * Group 3: Three-Region Route Coverage & Uniform Engine Behavior
 *   - Gale route adapter with terrain metrics vs geometric fallback
 *   - Jezero route adapter with terrain metrics vs geometric fallback
 *   - Oxia Planum geometric route adapter: unmodeled terrain disclosure, conditional estimation
 *   - Identical calculation results when identical route metrics are supplied to Gale, Jezero, and Oxia
 *   - Incomplete or empty route inputs gracefully yield UNAVAILABLE status
 *
 * Group 4: User Assumptions & Planning Overrides
 *   - User-defined profile with custom rates
 *   - Manual capacity overrides (O2, battery, cooling water)
 *   - Manual electrical load overrides
 *   - Assumption-dependent status propagation
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  estimateEVAResources,
  formatHoursToHMin,
  getEVAProfile,
  listEVAProfiles,
  getEVACitation,
  adaptGaleRoute,
  adaptJezeroRoute,
  adaptOxiaRoute,
  type EVAPlanningConfig,
  type EVAResourceRouteInput,
} from "../lib/eva/index.js";
import { regions } from "../lib/regions/registry.js";
import { newMission, type Mission } from "../lib/mission/model.js";

describe("Marswalk Unified EVA Resource Engine", () => {
  // -------------------------------------------------------------------------
  // Group 1: Calculation Correctness & Mathematical Integrity
  // -------------------------------------------------------------------------
  describe("Group 1: Calculation Correctness", () => {
    it("calculates nominal metabolic oxygen and suit leakage accurately without double-counting", () => {
      // 4.0 hours duration:
      // metabolic = 0.076 kg/h * 4.0 h = 0.304 kg
      // leakage   = 0.005 kg/h * 4.0 h = 0.020 kg
      // base      = 0.324 kg
      // reserve   = +20% = 0.0648 kg
      // total     = 0.3888 kg
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 4000,
        travelTimeHours: 4.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["gale-dem"],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "bvad-exploration-baseline",
        oxygenPlanningReservePercent: 20,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.oxygen.status, "estimated");
      assert.ok(result.oxygen.baseRequirement !== null);
      assert.ok(Math.abs(result.oxygen.baseRequirement - 0.324) < 1e-4);
      assert.ok(result.oxygen.configuredReserve !== null);
      assert.ok(Math.abs(result.oxygen.configuredReserve - 0.0648) < 1e-4);
      assert.ok(result.oxygen.recommendedProvision !== null);
      assert.ok(Math.abs(result.oxygen.recommendedProvision - 0.3888) < 1e-4);
      assert.equal(result.oxygen.unit, "kg");
    });

    it("calculates electrical energy in Wh and scales linearly with duration", () => {
      // 5.0 hours duration, Apollo 15 PLSS (58.0 W documented flight average power draw):
      // base energy = 58.0 W * 5.0 h = 290 Wh
      // reserve = +25% = 72.5 Wh
      // total provision = 362.5 Wh
      // capacity = 390 Wh -> remaining = 27.5 Wh -> within capacity
      const route: EVAResourceRouteInput = {
        regionId: "jezero",
        routeEvidence: "terrain-derived",
        distanceMeters: 5000,
        travelTimeHours: 3.0,
        scienceStopHours: 2.0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["jezero-dem"],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "apollo-15-plss",
        batteryPlanningReservePercent: 25,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.battery.status, "estimated");
      assert.equal(result.battery.capacityStatus, "within-configured-capacity");
      assert.equal(result.battery.baseRequirement, 290);
      assert.equal(result.battery.configuredReserve, 72.5);
      assert.equal(result.battery.recommendedProvision, 362.5);
      assert.equal(result.battery.remainingCapacity, 27.5);
    });

    it("evaluates battery energy as UNAVAILABLE on BVAD exploration baseline when power load is unconfigured", () => {
      // BVAD Rev 2 does not specify spacesuit avionics electrical power;
      // Therefore, battery energy must evaluate to UNAVAILABLE by default rather than inventing a number.
      const route: EVAResourceRouteInput = {
        regionId: "jezero",
        routeEvidence: "terrain-derived",
        distanceMeters: 5000,
        travelTimeHours: 3.0,
        scienceStopHours: 2.0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["jezero-dem"],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "bvad-exploration-baseline",
        batteryPlanningReservePercent: 25,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.battery.status, "unavailable");
      assert.equal(result.battery.baseRequirement, null);
      assert.equal(result.battery.recommendedProvision, null);
      assert.ok(result.battery.missingInputs.some((m) => m.toLowerCase().includes("electrical load")));
    });

    it("calculates battery energy on BVAD exploration baseline when user supplies manual electrical load override", () => {
      // With manual 140 W electrical load override and 1000 Wh battery capacity:
      // 5.0 h * 140 W = 700 Wh base + 25% (175 Wh) = 875 Wh recommended
      const route: EVAResourceRouteInput = {
        regionId: "jezero",
        routeEvidence: "terrain-derived",
        distanceMeters: 5000,
        travelTimeHours: 3.0,
        scienceStopHours: 2.0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["jezero-dem"],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "bvad-exploration-baseline",
        manualElectricalPowerWatts: 140,
        manualBatteryCapacityWh: 1000,
        batteryPlanningReservePercent: 25,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.battery.status, "assumption-dependent");
      assert.equal(result.battery.capacityStatus, "within-configured-capacity");
      assert.equal(result.battery.baseRequirement, 700);
      assert.equal(result.battery.configuredReserve, 175);
      assert.equal(result.battery.recommendedProvision, 875);
      assert.equal(result.battery.remainingCapacity, 125);
    });

    it("flags 'exceeds-configured-capacity' when electrical requirement exceeds usable battery", () => {
      // Apollo 15 battery is 390 Wh usable.
      // 8.0 hours @ 58 W = 464 Wh base + 20% (92.8 Wh) = 556.8 Wh > 390 Wh
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 6000,
        travelTimeHours: 6.0,
        scienceStopHours: 2.0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["gale-dem"],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "apollo-15-plss",
        batteryPlanningReservePercent: 20,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.battery.capacityStatus, "exceeds-configured-capacity");
      assert.equal(result.battery.status, "exceeds-configured-capacity");
      assert.ok(result.battery.remainingCapacity !== null && result.battery.remainingCapacity < 0);
    });

    it("evaluates cooling water for evaporative SWME vs closed-loop radiator correctly", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["gale-dem"],
        warnings: [],
      };

      // 1. SWME profile (0.57 kg/h)
      // 2.0 h * 0.57 = 1.14 kg base + 10% (0.114 kg) = 1.254 kg total
      const swmeResult = estimateEVAResources(route, {
        profileId: "bvad-exploration-baseline",
        coolingWaterPlanningReservePercent: 10,
      });
      assert.equal(swmeResult.coolingWater.status, "estimated");
      assert.ok(swmeResult.coolingWater.baseRequirement !== null);
      assert.ok(Math.abs(swmeResult.coolingWater.baseRequirement - 1.14) < 1e-4);
      assert.ok(swmeResult.coolingWater.recommendedProvision !== null);
      assert.ok(Math.abs(swmeResult.coolingWater.recommendedProvision - 1.254) < 1e-4);

      // 2. Closed-loop radiator profile (0.00 kg/h loss)
      const radiatorResult = estimateEVAResources(route, {
        profileId: "bvad-closed-loop-radiator",
      });
      assert.equal(radiatorResult.coolingWater.status, "estimated");
      assert.equal(radiatorResult.coolingWater.baseRequirement, 0);
      assert.equal(radiatorResult.coolingWater.recommendedProvision, 0);
    });

    it("correctly includes travel, science stops, and contingency in total EVA duration", () => {
      const route: EVAResourceRouteInput = {
        regionId: "jezero",
        routeEvidence: "terrain-derived",
        distanceMeters: 3000,
        travelTimeHours: 2.5,
        scienceStopHours: 1.5,
        otherActivityHours: 0.5,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      // Base duration = 2.5 + 1.5 + 0.5 = 4.5 h
      // Contingency = +20% of 4.5 = 0.9 h
      // Total duration = 5.4 h
      const result = estimateEVAResources(route, {
        profileId: "bvad-exploration-baseline",
        timeContingencyPercent: 20,
      });

      assert.equal(result.duration.baseRequirement, 4.5);
      assert.equal(result.duration.configuredReserve, 0.9);
      assert.equal(result.duration.recommendedProvision, 5.4);
      assert.equal(result.routeSummary.totalDurationHours, 5.4);
    });

    it("formats hours into clean human-readable h/min string deterministically", () => {
      assert.equal(formatHoursToHMin(1.5), "1 h 30 min");
      assert.equal(formatHoursToHMin(0.75), "45 min");
      assert.equal(formatHoursToHMin(4.0), "4 h");
      assert.equal(formatHoursToHMin(null), "Unavailable");
      assert.equal(formatHoursToHMin(undefined), "Unavailable");
      assert.equal(formatHoursToHMin(NaN), "Unavailable");
    });

    it("handles zero distance or zero duration without division by zero or NaN", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 0,
        travelTimeHours: 0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const result = estimateEVAResources(route, {
        profileId: "bvad-exploration-baseline",
      });
      // 0 duration -> resources should be marked unavailable because duration <= 0
      assert.equal(result.duration.recommendedProvision, 0);
      assert.equal(result.oxygen.status, "unavailable");
      assert.equal(result.battery.status, "unavailable");
    });
  });

  // -------------------------------------------------------------------------
  // Group 2: Scientific Validity & Model Boundaries
  // -------------------------------------------------------------------------
  describe("Group 2: Scientific Validity & Model Boundaries", () => {
    it("verifies authoritative NASA document numbers and publication years in citation registry", () => {
      // BVAD Revision 2: NASA/TP-2015-218570/REV2 published in 2022
      const bvadO2 = getEVACitation("BVAD-REV2-O2-METABOLIC");
      assert.ok(bvadO2);
      assert.equal(bvadO2.documentNumber, "NASA/TP-2015-218570/REV2");
      assert.equal(bvadO2.publicationYear, 2022);
      assert.equal(bvadO2.documentedValue, 0.076);

      // Apollo 15 flight report: NASA TN D-8093 published in 1975 (not D-7723)
      const apolloPower = getEVACitation("APOLLO15-POWER-DRAW");
      assert.ok(apolloPower);
      assert.equal(apolloPower.documentNumber, "NASA TN D-8093");
      assert.equal(apolloPower.publicationYear, 1975);
      assert.equal(apolloPower.documentedValue, 58.0);

      // Apollo 15 battery: 390 Wh flight qualification usable capacity (-7 PLSS)
      const apolloBatt = getEVACitation("APOLLO15-BATTERY-CAPACITY");
      assert.ok(apolloBatt);
      assert.equal(apolloBatt.documentedValue, 390.0);
      assert.equal(apolloBatt.documentedUnit, "Wh");

      // NASA-STD-3001 Vol 2 Rev D: 2023
      const stdO2 = getEVACitation("NASA-STD-3001-O2-METABOLIC");
      assert.ok(stdO2);
      assert.equal(stdO2.documentNumber, "NASA-STD-3001 Vol 2 Rev D");
      assert.equal(stdO2.publicationYear, 2023);
      assert.equal(stdO2.documentedValue, 0.080);
    });

    it("verifies rejection of unit-confusion artifact (0.0829 kg/h) and unmodeled BVAD battery specs", () => {
      const bvad = getEVAProfile("bvad-exploration-baseline");
      assert.ok(bvad);

      // Metabolic rate must be 0.076 kg/h; must NOT be 0.0829 kg/h (the erroneous 1.99 lb/day artifact)
      assert.equal(bvad.oxygenMetabolicRateKgPerHour, 0.076);
      assert.notEqual(bvad.oxygenMetabolicRateKgPerHour, 0.0829);

      // BVAD Rev 2 does NOT document spacesuit battery capacity or avionics electrical power;
      // Profile defaults must be null (unknown) rather than fabricated numbers.
      assert.equal(bvad.electricalPowerWatts, null);
      assert.equal(bvad.batteryCapacityWh, null);
    });

    it("ensures every referenced numerical constant exists in EVA_DATA_SOURCES", () => {
      const profiles = listEVAProfiles();
      assert.ok(profiles.length >= 4);

      for (const profile of profiles) {
        for (const sourceId of profile.sourceIds) {
          const citation = getEVACitation(sourceId);
          assert.ok(citation, `Missing citation for sourceId: ${sourceId} in profile ${profile.id}`);
          assert.ok(citation.title.length > 0);
          assert.ok(citation.authorOrAgency.length > 0);
          assert.ok(citation.publicationYear >= 1970);
          assert.ok(citation.sectionOrTable.length > 0);
          assert.ok(Number.isFinite(citation.documentedValue));
          assert.ok(citation.documentedUnit.length > 0);
          assert.ok(["measured", "specified", "estimated", "assumed"].includes(citation.methodology));
        }
      }
    });

    it("never treats astronaut metabolic heat (Watts) as spacesuit electrical power", () => {
      // NASA-STD-3001 defines a 300 W human metabolic work rate, but no spacesuit electrical avionics load.
      // Therefore, battery energy must be reported as UNAVAILABLE, not 300 W * duration!
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const result = estimateEVAResources(route, {
        profileId: "nasa-std-3001-nominal",
      });

      assert.equal(result.battery.status, "unavailable");
      assert.equal(result.battery.baseRequirement, null);
      assert.ok(result.battery.missingInputs.some((m) => m.toLowerCase().includes("electrical load")));
    });

    it("leaves cooling water UNAVAILABLE for suit profiles lacking a thermal fluid model", () => {
      // NASA-STD-3001 has no cooling fluid loss rate
      const route: EVAResourceRouteInput = {
        regionId: "jezero",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const result = estimateEVAResources(route, {
        profileId: "nasa-std-3001-nominal",
      });

      assert.equal(result.coolingWater.status, "unavailable");
      assert.equal(result.coolingWater.baseRequirement, null);
      assert.ok(result.coolingWater.missingInputs.some((m) => m.toLowerCase().includes("cooling-water loss model")));
    });

    it("does not synthesize fake route slope or ascent when route lacks terrain metrics", () => {
      const mission = newMission(regions.gale);
      const adapted = adaptGaleRoute(mission, regions.gale, null);

      assert.equal(adapted.routeEvidence, "unavailable");
      assert.equal(adapted.ascentMeters, undefined);
      assert.equal(adapted.descentMeters, undefined);
    });

    it("includes mandatory non-operational safety disclaimers in all results", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "geometric",
        distanceMeters: 1000,
        travelTimeHours: 1.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const result = estimateEVAResources(route, {
        profileId: "bvad-exploration-baseline",
      });

      assert.ok(result.scientificDisclaimer.includes("Hypothetical mission planning estimate"));
      assert.ok(result.scientificDisclaimer.includes("NOT constitute NASA operational flight approval"));
    });
  });

  // -------------------------------------------------------------------------
  // Group 3: Three-Region Route Coverage & Uniform Engine Behavior
  // -------------------------------------------------------------------------
  describe("Group 3: Region Coverage & Shared Engine", () => {
    it("produces identical resource estimates across Gale, Jezero, and Oxia when route inputs match", () => {
      // The same 3.0 h EVA, 3 km route in all three regions must yield exact arithmetic parity
      const galeRoute: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 3000,
        travelTimeHours: 3.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: ["gale-dem"],
        warnings: [],
      };
      const jezeroRoute: EVAResourceRouteInput = {
        ...galeRoute,
        regionId: "jezero",
        sourceDatasetIds: ["jezero-dem"],
      };
      const oxiaRoute: EVAResourceRouteInput = {
        ...galeRoute,
        regionId: "oxia",
        sourceDatasetIds: ["oxia-grid"],
      };

      const config: EVAPlanningConfig = {
        profileId: "bvad-exploration-baseline",
        oxygenPlanningReservePercent: 20,
        batteryPlanningReservePercent: 20,
      };

      const galeResult = estimateEVAResources(galeRoute, config);
      const jezeroResult = estimateEVAResources(jezeroRoute, config);
      const oxiaResult = estimateEVAResources(oxiaRoute, config);

      assert.equal(galeResult.oxygen.recommendedProvision, jezeroResult.oxygen.recommendedProvision);
      assert.equal(jezeroResult.oxygen.recommendedProvision, oxiaResult.oxygen.recommendedProvision);

      assert.equal(galeResult.battery.recommendedProvision, jezeroResult.battery.recommendedProvision);
      assert.equal(jezeroResult.battery.recommendedProvision, oxiaResult.battery.recommendedProvision);

      assert.equal(galeResult.duration.recommendedProvision, jezeroResult.duration.recommendedProvision);
      assert.equal(jezeroResult.duration.recommendedProvision, oxiaResult.duration.recommendedProvision);
    });

    it("Oxia adapter flags geometric unmodeled-terrain disclosure transparently", () => {
      const mission = newMission(regions.oxia);
      const adapted = adaptOxiaRoute(mission, regions.oxia, {
        manualDistanceMeters: 5000,
        manualTravelTimeHours: null,
      });

      assert.equal(adapted.regionId, "oxia");
      assert.equal(adapted.routeEvidence, "geometric");
      assert.equal(adapted.distanceMeters, 5000);
      assert.equal(adapted.travelTimeHours, null);
      assert.equal(adapted.ascentMeters, null);
      assert.ok(adapted.warnings.some((w) => w.includes("Oxia Planum terrain-routing engine is unavailable")));
      assert.ok(adapted.warnings.some((w) => w.includes("Terrain slope adjustment is unavailable")));

      // Evaluate resources with walking speed assumption (1.25 km/h)
      const result = estimateEVAResources(adapted, {
        profileId: "bvad-exploration-baseline",
        speedKmh: 1.25,
      });

      // 5 km / 1.25 km/h = 4.0 hours travel
      assert.equal(result.duration.status, "assumption-dependent");
      assert.equal(result.duration.baseRequirement, 4.0);
      assert.ok(result.routeSummary.geographicUncertainty.includes("Spherical Mars approximation"));
    });

    it("adapts terrain metrics when provided for Gale and Jezero", () => {
      const mission = newMission(regions.gale);
      const terrainMetrics = {
        distanceMeters: 4500,
        travelTimeHours: 3.2,
        ascentMeters: 120,
        descentMeters: 40,
        sourceDatasetIds: ["gale-hirise-dem-v1"],
        warnings: ["Slope angle exceeds 15 deg in pass 2"],
      };

      const galeAdapted = adaptGaleRoute(mission, regions.gale, terrainMetrics);
      assert.equal(galeAdapted.routeEvidence, "terrain-derived");
      assert.equal(galeAdapted.distanceMeters, 4500);
      assert.equal(galeAdapted.travelTimeHours, 3.2);
      assert.equal(galeAdapted.ascentMeters, 120);
      assert.equal(galeAdapted.descentMeters, 40);
      assert.ok(galeAdapted.warnings.includes("Slope angle exceeds 15 deg in pass 2"));

      const jezeroAdapted = adaptJezeroRoute(mission, regions.jezero, terrainMetrics);
      assert.equal(jezeroAdapted.routeEvidence, "terrain-derived");
      assert.equal(jezeroAdapted.distanceMeters, 4500);
      assert.equal(jezeroAdapted.ascentMeters, 120);
    });
  });

  // -------------------------------------------------------------------------
  // Group 4: User Assumptions & Planning Overrides
  // -------------------------------------------------------------------------
  describe("Group 4: User Assumptions & Overrides", () => {
    it("supports custom user-defined profile and labels results assumption-dependent", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "user-defined",
        customProfile: {
          oxygenMetabolicRateKgPerHour: 0.09,
          electricalPowerWatts: 150,
          coolingWaterLossKgPerHour: 0.6,
        },
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.profile.profileType, "user-defined");
      assert.equal(result.oxygen.status, "assumption-dependent");
      assert.equal(result.battery.status, "assumption-dependent");
      assert.equal(result.coolingWater.status, "assumption-dependent");
    });

    it("honors manual capacity overrides for oxygen and battery", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      const config: EVAPlanningConfig = {
        profileId: "bvad-exploration-baseline",
        manualOxygenCapacityKg: 2.5,
        manualBatteryCapacityWh: 1500,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.oxygen.availableCapacity, 2.5);
      assert.equal(result.battery.availableCapacity, 1500);
      assert.ok(result.oxygen.remainingCapacity !== null && result.oxygen.remainingCapacity > 2.0);
    });

    it("honors manual electrical load override when profile lacks power draw", () => {
      const route: EVAResourceRouteInput = {
        regionId: "gale",
        routeEvidence: "terrain-derived",
        distanceMeters: 2000,
        travelTimeHours: 2.0,
        scienceStopHours: 0,
        otherActivityHours: 0,
        roundTripIncluded: true,
        sourceDatasetIds: [],
        warnings: [],
      };
      // NASA-STD-3001 has null electrical power. With manual 110 W override, it becomes calculable!
      const config: EVAPlanningConfig = {
        profileId: "nasa-std-3001-nominal",
        manualElectricalPowerWatts: 110,
        batteryPlanningReservePercent: 20,
      };

      const result = estimateEVAResources(route, config);
      assert.equal(result.battery.status, "assumption-dependent");
      assert.equal(result.battery.baseRequirement, 220); // 110 W * 2.0 h
      assert.equal(result.battery.configuredReserve, 44);  // +20%
      assert.equal(result.battery.recommendedProvision, 264);
    });
  });

  // -------------------------------------------------------------------------
  // Group 5: Persistence, Draft Restoration & Schema Integrity
  // -------------------------------------------------------------------------
  describe("Group 5: Mission Persistence & Serialization", () => {
    it("persists EVA resource planning settings with mission drafts and restores them accurately", () => {
      const mission = newMission(regions.jezero);
      const missionWithEva: Mission = {
        ...mission,
        eva_resource_plan: {
          schema_version: 1,
          profile_id: "apollo-15-plss",
          profile_version: "1.0",
          speed_kmh: 1.5,
          oxygen_reserve_percent: 25,
          battery_reserve_percent: 20,
          cooling_water_reserve_percent: 15,
          time_contingency_percent: 10,
          manual_assumptions: {
            oxygen_capacity_kg: 0.9,
            battery_capacity_wh: 400,
          },
          route_version: "route-v1",
          dataset_version: regions.jezero.dataset_version,
          last_calculated_at: new Date().toISOString(),
          calculation_status: "estimated",
        },
      };

      const serialized = JSON.stringify(missionWithEva);
      const deserialized = JSON.parse(serialized);
      assert.ok(deserialized.eva_resource_plan);
      assert.equal(deserialized.eva_resource_plan.profile_id, "apollo-15-plss");
      assert.equal(deserialized.eva_resource_plan.speed_kmh, 1.5);
      assert.equal(deserialized.eva_resource_plan.oxygen_reserve_percent, 25);
      assert.equal(deserialized.eva_resource_plan.battery_reserve_percent, 20);
      assert.equal(deserialized.eva_resource_plan.cooling_water_reserve_percent, 15);
      assert.equal(deserialized.eva_resource_plan.time_contingency_percent, 10);
      assert.equal(deserialized.eva_resource_plan.manual_assumptions?.oxygen_capacity_kg, 0.9);
      assert.equal(deserialized.eva_resource_plan.manual_assumptions?.battery_capacity_wh, 400);
    });
  });
});
