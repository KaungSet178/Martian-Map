"use client";

import React from "react";
import { Info, ExternalLink } from "lucide-react";
import type { EVAPlanResult } from "@/lib/eva/types";
import { getEVACitation } from "@/lib/eva/sources";

interface ScientificExplanationProps {
  readonly result: EVAPlanResult;
}

export function ScientificExplanation({ result }: ScientificExplanationProps) {
  const { profile, battery, duration } = result;

  const citations = profile.sourceIds
    .map((id) => getEVACitation(id))
    .filter((c) => c !== undefined);

  return (
    <details className="eva-details" data-testid="eva-scientific-explanation">
      <summary>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Info size={16} className="text-cyan-400" aria-hidden="true" />
          <span>Scientific Basis, Formulas & Traceable Data Provenance</span>
        </span>
      </summary>

      <div className="eva-details-content">
        <div>
          <h4 style={{ margin: "0 0 0.35rem 0", color: "#f8fafc", fontSize: "0.88rem" }}>
            Mathematical Consumption Formulas
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem", color: "#cbd5e1" }}>
            <div>
              <strong>1. Oxygen Provision (kg):</strong>
              <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#38bdf8", padding: "0.2rem 0" }}>
                O₂_provision = (metabolic_rate × duration + suit_leakage × duration) × (1 + reserve_pct / 100)
              </div>
              <span>
                Applied metabolic rate: {profile.oxygenMetabolicRateKgPerHour?.toFixed(3) ?? "—"} kg/h · Suit leakage:{" "}
                {profile.oxygenSupplyLossRateKgPerHour?.toFixed(3) ?? "0.000"} kg/h.
              </span>
            </div>

            <div>
              <strong>2. Electrical Energy (Wh):</strong>
              <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#fbbf24", padding: "0.2rem 0" }}>
                Energy_Wh = (electrical_load_W × duration) × (1 + reserve_pct / 100)
              </div>
              <span>
                Applied electrical load: {battery.baseRequirement && duration.recommendedProvision
                  ? `${(battery.baseRequirement / duration.recommendedProvision).toFixed(0)} W`
                  : "Unavailable / Unspecified"}
                . Excludes astronaut metabolic heat.
              </span>
            </div>

            <div>
              <strong>3. Cooling Water Provision (kg / L):</strong>
              <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#60a5fa", padding: "0.2rem 0" }}>
                Water_loss = (evaporative_rate × duration) × (1 + reserve_pct / 100)
              </div>
              <span>
                Applied loss rate: {profile.coolingWaterLossKgPerHour !== null && profile.coolingWaterLossKgPerHour !== undefined
                  ? `${profile.coolingWaterLossKgPerHour.toFixed(2)} kg/h (${profile.coolingSystemType ?? "evaporative"})`
                  : "Unavailable (No supported loss model)"}
                . Garment circulation flow is non-consumptive.
              </span>
            </div>

            <div>
              <strong>4. Planned EVA Duration:</strong>
              <div style={{ fontFamily: "var(--font-mono, monospace)", color: "#4ade80", padding: "0.2rem 0" }}>
                Total_EVA = travel_time + science_stops + other_activity + time_contingency
              </div>
              <span>
                Time basis: {duration.calculationAssumptions.join(" ")}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ margin: "0 0 0.35rem 0", color: "#f8fafc", fontSize: "0.88rem" }}>
            Traceable NASA Primary Sources
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {citations.length > 0 ? (
              citations.map((c) => (
                <div key={c.id} className="eva-source-item">
                  <div className="eva-source-title">{c.title}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>
                    <strong>Document:</strong> {c.documentNumber ?? "—"} ({c.publicationYear}) ·{" "}
                    <strong>Section:</strong> {c.sectionOrTable} · <strong>Methodology:</strong> {c.methodology}
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: "0.75rem" }}>
                    <strong>Documented Value:</strong> {c.documentedValue} {c.documentedUnit} ({c.parameterName})
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.72rem", fontStyle: "italic" }}>
                    Limitations: {c.limitations}
                  </div>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        color: "#38bdf8",
                        fontSize: "0.72rem",
                        marginTop: "0.15rem",
                      }}
                    >
                      <span>NASA Technical Report Citation</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                Custom user planning inputs; no NASA archival citations attached.
              </div>
            )}
          </div>
        </div>

        <div className="eva-notice-box">
          <p>
            <strong>Scientific Boundary Notice:</strong> Calculations represent hypothetical planning
            estimates under documented engineering assumptions. They do NOT certify astronaut safety,
            physiological survival, or operational NASA mission approval. Real planetary EVA performance
            depends on dynamic astronaut exertion, suit pressure, ambient temperature, topography, and real-time life-support telemetry.
          </p>
        </div>
      </div>
    </details>
  );
}
