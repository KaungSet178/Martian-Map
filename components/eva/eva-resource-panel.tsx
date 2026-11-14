"use client";

import React, { useMemo, useState } from "react";
import type { RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import {
  adaptMissionToEVARoute,
  DEFAULT_PROFILE_ID,
  DEFAULT_PLANNING_SPEED_KMH,
  estimateEVAResources,
  type EVAPlanningConfig,
  type EVAPlanResult,
} from "@/lib/eva";
import { evaPanelStyles } from "./styles";
import { RouteSummarySection } from "./route-summary-section";
import { ProfileSelector } from "./profile-selector";
import { ResourceCard } from "./resource-card";
import { AssumptionsPanel } from "./assumptions-panel";
import { ScientificExplanation } from "./scientific-explanation";

interface EVAResourcePanelProps {
  readonly region: RegionManifest;
  readonly mission: Mission;
  readonly onMissionChange: (change: Partial<Mission>) => void;
  readonly onEvidence?: () => void;
  readonly onSwitchToPlan?: () => void;
}

export function EVAResourcePanel({
  region,
  mission,
  onMissionChange,
  onEvidence,
  onSwitchToPlan,
}: EVAResourcePanelProps) {
  // Initialize config from persisted mission state if available
  const [config, setConfig] = useState<EVAPlanningConfig>(() => {
    const persisted = mission.eva_resource_plan;
    if (persisted) {
      return {
        profileId: persisted.profile_id ?? DEFAULT_PROFILE_ID,
        speedKmh: persisted.speed_kmh ?? DEFAULT_PLANNING_SPEED_KMH,
        oxygenPlanningReservePercent:
          persisted.oxygen_reserve_percent ?? mission.oxygen_reserve_percent ?? 20,
        batteryPlanningReservePercent:
          persisted.battery_reserve_percent ?? mission.battery_reserve_percent ?? 20,
        coolingWaterPlanningReservePercent:
          persisted.cooling_water_reserve_percent ?? 20,
        timeContingencyPercent: persisted.time_contingency_percent ?? 0,
        manualDistanceMeters: persisted.manual_assumptions?.distance_meters ?? null,
        manualOxygenCapacityKg: persisted.manual_assumptions?.oxygen_capacity_kg ?? null,
        manualBatteryCapacityWh: persisted.manual_assumptions?.battery_capacity_wh ?? null,
        manualCoolingWaterCapacityKg:
          persisted.manual_assumptions?.cooling_water_capacity_kg ?? null,
        manualElectricalPowerWatts:
          persisted.manual_assumptions?.electrical_power_w ?? null,
      };
    }
    return {
      profileId: DEFAULT_PROFILE_ID,
      speedKmh: DEFAULT_PLANNING_SPEED_KMH,
      oxygenPlanningReservePercent: mission.oxygen_reserve_percent ?? 20,
      batteryPlanningReservePercent: mission.battery_reserve_percent ?? 20,
      coolingWaterPlanningReservePercent: 20,
      timeContingencyPercent: 0,
    };
  });

  // Effective config combining manual config with mission reserves
  const effectiveConfig: EVAPlanningConfig = useMemo(() => {
    return {
      ...config,
      oxygenPlanningReservePercent:
        config.oxygenPlanningReservePercent ?? mission.oxygen_reserve_percent ?? 20,
      batteryPlanningReservePercent:
        config.batteryPlanningReservePercent ?? mission.battery_reserve_percent ?? 20,
    };
  }, [config, mission.oxygen_reserve_percent, mission.battery_reserve_percent]);

  // Handle config changes and propagate persistence to mission draft
  const handleConfigChange = (newConfig: EVAPlanningConfig) => {
    setConfig(newConfig);

    // Persist to mission
    onMissionChange({
      oxygen_reserve_percent: Math.min(
        50,
        Math.max(10, newConfig.oxygenPlanningReservePercent ?? 20),
      ),
      battery_reserve_percent: Math.min(
        50,
        Math.max(10, newConfig.batteryPlanningReservePercent ?? 20),
      ),
      eva_resource_plan: {
        schema_version: 1,
        profile_id: newConfig.profileId,
        profile_version: "1.0",
        speed_kmh: newConfig.speedKmh ?? null,
        oxygen_reserve_percent: newConfig.oxygenPlanningReservePercent,
        battery_reserve_percent: newConfig.batteryPlanningReservePercent,
        cooling_water_reserve_percent: newConfig.coolingWaterPlanningReservePercent,
        time_contingency_percent: newConfig.timeContingencyPercent,
        manual_assumptions: {
          distance_meters: newConfig.manualDistanceMeters ?? null,
          oxygen_capacity_kg: newConfig.manualOxygenCapacityKg ?? null,
          battery_capacity_wh: newConfig.manualBatteryCapacityWh ?? null,
          cooling_water_capacity_kg: newConfig.manualCoolingWaterCapacityKg ?? null,
          electrical_power_w: newConfig.manualElectricalPowerWatts ?? null,
        },
        route_version: mission.id,
        dataset_version: region.dataset_version,
        last_calculated_at: new Date().toISOString(),
      },
    });
  };

  // Derive route input for current region and mission
  const routeInput = useMemo(() => {
    return adaptMissionToEVARoute(region.id as "gale" | "jezero" | "oxia", mission, region, {
      manualDistanceMeters: config.manualDistanceMeters,
    });
  }, [region, mission, config.manualDistanceMeters]);

  // Compute live resource estimates
  const evaluationResult: EVAPlanResult = useMemo(() => {
    return estimateEVAResources(routeInput, effectiveConfig);
  }, [routeInput, effectiveConfig]);

  const activeProfile = evaluationResult.profile;

  return (
    <div className="eva-panel" data-testid="eva-resource-panel">
      <style>{evaPanelStyles}</style>

      <div className="eva-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <span className="eyebrow">EVA Mission Architecture</span>
          <h2>Unified Life-Support Planning</h2>
          <p>
            Evidence-based oxygen, electrical energy, cooling water, and sortie duration
            estimates for {region.name}.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
          {onSwitchToPlan && (
            <button
              type="button"
              className="file-button"
              style={{ fontSize: "0.78rem" }}
              onClick={onSwitchToPlan}
              title="Edit Mission Waypoints"
            >
              Edit Route
            </button>
          )}
          {onEvidence && (
            <button
              type="button"
              className="file-button"
              style={{ fontSize: "0.78rem" }}
              onClick={onEvidence}
              title="Inspect Evidence & Citations"
            >
              Evidence
            </button>
          )}
        </div>
      </div>

      {/* Section A: Route Summary */}
      <RouteSummarySection result={evaluationResult} />

      {/* Section B: Reference Profile */}
      <ProfileSelector
        selectedProfileId={config.profileId}
        onSelectProfile={(profileId) =>
          handleConfigChange({ ...config, profileId })
        }
        currentProfile={activeProfile}
      />

      {/* Section C: Recommended Resources (4 Primary Cards) */}
      <div className="eva-section" data-testid="eva-cards-section">
        <div className="eva-section-title">
          <span>Recommended Life-Support Provisions</span>
          <span className="eva-badge eva-badge--estimated">Phase R1</span>
        </div>

        <div className="eva-resource-grid">
          <ResourceCard estimate={evaluationResult.oxygen} />
          <ResourceCard estimate={evaluationResult.battery} />
          <ResourceCard estimate={evaluationResult.coolingWater} />
          <ResourceCard estimate={evaluationResult.duration} />
        </div>
      </div>

      {/* Section D: Planning Settings & Reserves */}
      <AssumptionsPanel
        config={config}
        onChangeConfig={handleConfigChange}
        profile={activeProfile}
      />

      {/* Section E: Scientific Explanation & Sources */}
      <ScientificExplanation result={evaluationResult} />
    </div>
  );
}
