"use client";

import React, { useMemo } from "react";
import type { RegionId } from "@/lib/contracts/region";
import { GaleEnvironmentalPanel } from "./gale/gale-environmental-panel";
import { EnvironmentalConditionsPanel as JezeroPanel } from "./jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";
import { OxiaUnavailablePanel } from "./oxia/oxia-unavailable-panel";
import { sharedEnvironmentCss } from "./styles";

export interface EnvironmentalConditionsPanelProps {
  regionId: RegionId;
  sol?: number;
  onSelectRegion?: (regionId: RegionId) => void;
  onExploreLayers?: () => void;
  onEvidence?: () => void;
}

/**
 * Unified Environmental Conditions Panel
 *
 * Integrates Curiosity REMS & RAD historical ground truth for Gale Crater,
 * Perseverance MEDA historical ground truth for Jezero Crater,
 * and a deliberate, scientifically honest unavailable state for Oxia Planum.
 */
export function EnvironmentalConditionsPanel({
  regionId,
  sol,
  onSelectRegion,
  onExploreLayers,
  onEvidence,
}: EnvironmentalConditionsPanelProps) {
  // Ensure sol selection is region-scoped
  const validatedSol = useMemo(() => {
    if (regionId === "gale") {
      return 100;
    }
    if (regionId === "jezero") {
      const validSols = jezeroEnvironmentalDataset.displayWindow.solSelection;
      if (sol !== undefined && validSols.includes(sol)) {
        return sol;
      }
      return 100;
    }
    return undefined;
  }, [regionId, sol]);

  return (
    <div
      className="env-container"
      data-testid="environmental-conditions-panel"
      data-region={regionId}
    >
      <style>{sharedEnvironmentCss}</style>

      {regionId === "gale" && (
        <div className="gale-env" data-testid="gale-environmental-panel">
          <GaleEnvironmentalPanel />
        </div>
      )}

      {regionId === "jezero" && (
        <div className="jz-env-wrap" data-testid="jezero-environmental-panel">
          <JezeroPanel
            key={`jezero-sol-${validatedSol}`}
            dataset={jezeroEnvironmentalDataset}
            initialSol={validatedSol}
          />
        </div>
      )}

      {regionId === "oxia" && (
        <OxiaUnavailablePanel
          onSelectRegion={onSelectRegion}
          onExploreLayers={onExploreLayers}
          onEvidence={onEvidence}
        />
      )}
    </div>
  );
}

export default EnvironmentalConditionsPanel;
