"use client";

import React from "react";
import {
  AlertTriangle,
  Compass,
  Layers,
  MapPin,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { RegionId } from "@/lib/contracts/region";

export interface OxiaUnavailablePanelProps {
  onSelectRegion?: (regionId: RegionId) => void;
  onExploreLayers?: () => void;
  onEvidence?: () => void;
}

export function OxiaUnavailablePanel({
  onSelectRegion,
  onExploreLayers,
  onEvidence,
}: OxiaUnavailablePanelProps) {
  return (
    <div
      className="oxia-env"
      data-testid="oxia-environmental-panel"
      role="region"
      aria-label="Oxia Planum Environmental Conditions"
    >
      {/* Header matching shared specification */}
      <header className="env-head">
        <div>
          <div className="env-eyebrow">ExoMars Rosalind Franklin Planned Site</div>
          <h2 className="env-title">Environmental Conditions</h2>
          <p className="env-subtitle">
            Oxia Planum · Exploration Region
          </p>
        </div>
        <div className="env-head-tags">
          <span className="env-tag env-tag--unavailable">
            No Surface Meteorological Station
          </span>
          <span className="env-tag">Data Unavailable</span>
        </div>
      </header>

      {/* Main Deliberate Unavailable Callout */}
      <div className="oxia-unavailable-card" data-testid="oxia-unavailable-notice">
        <div className="oxia-card-header">
          <div className="oxia-icon-wrap" aria-hidden="true">
            <AlertTriangle className="oxia-icon" />
          </div>
          <div>
            <h3 className="oxia-main-title">Environmental observations unavailable</h3>
            <p className="oxia-primary-explanation">
              No verified local historical rover observations are currently integrated for Oxia Planum.
            </p>
          </div>
        </div>

        {/* Critical Safety & Physical Reality Notice */}
        <div className="oxia-safety-notice">
          <div className="oxia-safety-header">
            <ShieldAlert className="oxia-safety-icon" aria-hidden="true" />
            <h4 className="oxia-safety-title">
              Critical Planning Notice: Lack of Data Is Not Proof of Safety
            </h4>
          </div>
          <p className="oxia-safety-body">
            Do not interpret this unavailable state as evidence that the physical environment is safe
            or benign. Martian global surface hazards—including sub-zero atmospheric temperatures
            (typically -100 °C to 0 °C), near-vacuum atmospheric pressures (~700–850 Pa, below the
            Armstrong limit), intense unshielded solar ultraviolet radiation, and continuous galactic
            cosmic-ray ionizing radiation—apply equally across Oxia Planum.
          </p>
        </div>

        {/* Scientific Context Grid */}
        <div className="oxia-context-grid">
          <div className="oxia-context-card">
            <div className="oxia-context-head">
              <MapPin className="oxia-context-icon" aria-hidden="true" />
              <span className="oxia-context-label">Landing Site Geodesy</span>
            </div>
            <div className="oxia-context-value">18.28°N, 335.37°E</div>
            <p className="oxia-context-text">
              Low-elevation clay-bearing plain (~ -3,000 m relative to MOLA datum) selected
              for the ESA/Roscosmos ExoMars Rosalind Franklin rover mission.
            </p>
          </div>

          <div className="oxia-context-card">
            <div className="oxia-context-head">
              <Compass className="oxia-context-icon" aria-hidden="true" />
              <span className="oxia-context-label">Archival In Situ Status</span>
            </div>
            <div className="oxia-context-value">Zero In Situ Surface Records</div>
            <p className="oxia-context-text">
              Because no surface lander meteorological station has operated in Oxia Planum to date,
              no calibrated in situ weather (REMS/MEDA-equivalent) or dosimetry (RAD-equivalent) records
              exist in NASA PDS or ESA PSA repositories.
            </p>
          </div>
        </div>

        {/* Actionable Alternatives for Mission Planning */}
        <div className="oxia-actions-section">
          <h4 className="oxia-actions-title">
            Recommended Mission Planning Alternatives
          </h4>
          <div className="oxia-buttons-group">
            {onSelectRegion && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectRegion("gale")}
                  className="env-button env-button--primary"
                  title="Switch workspace to Gale Crater to inspect MSL Curiosity REMS and RAD observations"
                >
                  <span>Inspect Gale Historical Data (Curiosity REMS + RAD)</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectRegion("jezero")}
                  className="env-button"
                  title="Switch workspace to Jezero Crater to inspect Perseverance MEDA observations"
                >
                  <span>Inspect Jezero Historical Data (Perseverance MEDA)</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}

            {onExploreLayers && (
              <button
                type="button"
                onClick={onExploreLayers}
                className="env-button"
                title="Inspect orbital remote sensing layers: CTX optical, HRSC/MOLA elevation, slope, and THEMIS night thermal"
              >
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>Explore Oxia Orbital Science Layers</span>
              </button>
            )}
          </div>
        </div>

        {/* Archival Note */}
        <div className="oxia-provenance-note">
          <span>
            Authentic NASA and ESA mission data policy · Oxia Planum exploration region
          </span>
          {onEvidence && (
            <button
              type="button"
              onClick={onEvidence}
              className="oxia-link-button"
            >
              Data register and evidence <ExternalLink className="h-3 w-3 inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
