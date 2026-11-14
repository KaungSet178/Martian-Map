"use client";

import React, { useState } from "react";
import { Sliders, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import type { EVAPlanningConfig, EVAReferenceProfile } from "@/lib/eva/types";
import { DEFAULT_PLANNING_SPEED_KMH } from "@/lib/eva/timeline";

interface AssumptionsPanelProps {
  readonly config: EVAPlanningConfig;
  readonly onChangeConfig: (newConfig: EVAPlanningConfig) => void;
  readonly profile: EVAReferenceProfile;
}

export function AssumptionsPanel({
  config,
  onChangeConfig,
  profile,
}: AssumptionsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const speedKmh = config.speedKmh ?? DEFAULT_PLANNING_SPEED_KMH;
  const o2Reserve = config.oxygenPlanningReservePercent ?? 20;
  const batteryReserve = config.batteryPlanningReservePercent ?? 20;
  const coolingReserve = config.coolingWaterPlanningReservePercent ?? 20;
  const timeContingency = config.timeContingencyPercent ?? 0;

  return (
    <div className="eva-section" data-testid="eva-planning-settings">
      <div className="eva-section-title">
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Sliders size={17} className="text-cyan-400" aria-hidden="true" />
          <span>Planning Settings & Allowances</span>
        </span>
        <span className="eva-badge eva-badge--assumption">Configurable</span>
      </div>

      <div className="eva-form-grid">
        <div className="eva-form-group">
          <label htmlFor="eva-speed-input" className="eva-form-label">
            Walking Speed Assumption (km/h)
          </label>
          <input
            id="eva-speed-input"
            type="number"
            step="0.1"
            min="0.1"
            max="10.0"
            className="eva-input"
            value={speedKmh}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                speedKmh: Number.isFinite(val) && val > 0 ? val : null,
              });
            }}
            data-testid="eva-speed-input"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Used when terrain routing does not supply travel velocity.
          </span>
        </div>

        <div className="eva-form-group">
          <label htmlFor="eva-o2-reserve" className="eva-form-label">
            O₂ Planning Allowance (+%)
          </label>
          <input
            id="eva-o2-reserve"
            type="number"
            step="5"
            min="0"
            max="100"
            className="eva-input"
            value={o2Reserve}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                oxygenPlanningReservePercent: Number.isFinite(val) && val >= 0 ? val : 0,
              });
            }}
            data-testid="eva-o2-reserve"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Contingency margin added to base metabolic requirement.
          </span>
        </div>

        <div className="eva-form-group">
          <label htmlFor="eva-battery-reserve" className="eva-form-label">
            Battery Planning Allowance (+%)
          </label>
          <input
            id="eva-battery-reserve"
            type="number"
            step="5"
            min="0"
            max="100"
            className="eva-input"
            value={batteryReserve}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                batteryPlanningReservePercent: Number.isFinite(val) && val >= 0 ? val : 0,
              });
            }}
            data-testid="eva-battery-reserve"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Electrical energy margin added to base consumption.
          </span>
        </div>

        <div className="eva-form-group">
          <label htmlFor="eva-cooling-reserve" className="eva-form-label">
            Cooling Water Reserve (+%)
          </label>
          <input
            id="eva-cooling-reserve"
            type="number"
            step="5"
            min="0"
            max="100"
            className="eva-input"
            value={coolingReserve}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                coolingWaterPlanningReservePercent: Number.isFinite(val) && val >= 0 ? val : 0,
              });
            }}
            data-testid="eva-cooling-reserve"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Feedwater margin for thermal contingencies.
          </span>
        </div>

        <div className="eva-form-group">
          <label htmlFor="eva-time-contingency" className="eva-form-label">
            EVA Time Contingency (+%)
          </label>
          <input
            id="eva-time-contingency"
            type="number"
            step="5"
            min="0"
            max="100"
            className="eva-input"
            value={timeContingency}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                timeContingencyPercent: Number.isFinite(val) && val >= 0 ? val : 0,
              });
            }}
            data-testid="eva-time-contingency"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Buffer for unexpected delays or terrain obstacles.
          </span>
        </div>

        <div className="eva-form-group">
          <label htmlFor="eva-manual-distance" className="eva-form-label">
            Manual Route Distance (m)
          </label>
          <input
            id="eva-manual-distance"
            type="number"
            step="250"
            min="0"
            className="eva-input"
            placeholder="e.g. 5000"
            value={config.manualDistanceMeters ?? ""}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({
                ...config,
                manualDistanceMeters: Number.isFinite(val) && val > 0 ? val : null,
              });
            }}
            data-testid="eva-manual-distance"
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted, #94a3b8)" }}>
            Planning distance assumption when route geometry is unavailable.
          </span>
        </div>
      </div>

      {/* Collapsible Manual Hardware Overrides */}
      <button
        type="button"
        className="icon-button"
        style={{
          width: "100%",
          justifyContent: "space-between",
          fontSize: "0.78rem",
          color: "var(--text-muted, #94a3b8)",
          padding: "0.4rem 0.5rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border, #223250)",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "0.25rem",
        }}
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Settings2 size={15} />
          <span>Manual Capacity & Electrical Load Overrides</span>
        </span>
        {showAdvanced ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showAdvanced && (
        <div
          className="eva-form-grid"
          style={{
            background: "rgba(0,0,0,0.2)",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px dashed var(--border, #223250)",
          }}
        >
          <div className="eva-form-group">
            <label htmlFor="eva-manual-o2-cap" className="eva-form-label">
              Manual O₂ Tank Capacity (kg)
            </label>
            <input
              id="eva-manual-o2-cap"
              type="number"
              step="0.1"
              min="0"
              className="eva-input"
              placeholder={profile.oxygenCapacityKg?.toFixed(2) ?? "Unspecified"}
              value={config.manualOxygenCapacityKg ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeConfig({
                  ...config,
                  manualOxygenCapacityKg: Number.isFinite(val) && val >= 0 ? val : null,
                });
              }}
            />
          </div>

          <div className="eva-form-group">
            <label htmlFor="eva-manual-battery-cap" className="eva-form-label">
              Manual Battery Usable (Wh)
            </label>
            <input
              id="eva-manual-battery-cap"
              type="number"
              step="50"
              min="0"
              className="eva-input"
              placeholder={profile.batteryCapacityWh?.toFixed(0) ?? "Unspecified"}
              value={config.manualBatteryCapacityWh ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeConfig({
                  ...config,
                  manualBatteryCapacityWh: Number.isFinite(val) && val >= 0 ? val : null,
                });
              }}
            />
          </div>

          <div className="eva-form-group">
            <label htmlFor="eva-manual-power" className="eva-form-label">
              Manual Electrical Load (W)
            </label>
            <input
              id="eva-manual-power"
              type="number"
              step="10"
              min="0"
              className="eva-input"
              placeholder={profile.electricalPowerWatts?.toFixed(0) ?? "Unspecified"}
              value={config.manualElectricalPowerWatts ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeConfig({
                  ...config,
                  manualElectricalPowerWatts: Number.isFinite(val) && val >= 0 ? val : null,
                });
              }}
            />
          </div>

          <div className="eva-form-group">
            <label htmlFor="eva-manual-water-cap" className="eva-form-label">
              Manual Water Feedwater (kg)
            </label>
            <input
              id="eva-manual-water-cap"
              type="number"
              step="0.5"
              min="0"
              className="eva-input"
              placeholder={profile.coolingWaterCapacityKg?.toFixed(1) ?? "Unspecified"}
              value={config.manualCoolingWaterCapacityKg ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeConfig({
                  ...config,
                  manualCoolingWaterCapacityKg: Number.isFinite(val) && val >= 0 ? val : null,
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
