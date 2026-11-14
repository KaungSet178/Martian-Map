"use client";

import React, { useState } from "react";
import {
  Wind,
  Zap,
  Droplet,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { EVAResourceEstimate } from "@/lib/eva/types";

interface ResourceCardProps {
  readonly estimate: EVAResourceEstimate;
}

export function ResourceCard({ estimate }: ResourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (estimate.resourceType) {
      case "oxygen":
        return <Wind size={16} className="text-cyan-400" aria-hidden="true" />;
      case "battery":
        return <Zap size={16} className="text-amber-400" aria-hidden="true" />;
      case "cooling-water":
        return <Droplet size={16} className="text-blue-400" aria-hidden="true" />;
      case "duration":
        return <Clock size={16} className="text-emerald-400" aria-hidden="true" />;
    }
  };

  const getStatusBadge = () => {
    switch (estimate.status) {
      case "estimated":
        return <span className="eva-badge eva-badge--estimated">Estimated</span>;
      case "assumption-dependent":
        return <span className="eva-badge eva-badge--assumption">Assumption</span>;
      case "exceeds-configured-capacity":
        return <span className="eva-badge eva-badge--exceeds">Exceeds Cap</span>;
      case "unavailable":
      default:
        return <span className="eva-badge eva-badge--unavailable">Unavailable</span>;
    }
  };

  const displayValue = () => {
    if (estimate.status === "unavailable" || estimate.recommendedProvision === null) {
      return "—";
    }
    if (estimate.resourceType === "duration") {
      return estimate.displayUnit;
    }
    if (estimate.resourceType === "oxygen") {
      return estimate.recommendedProvision.toFixed(2);
    }
    if (estimate.resourceType === "cooling-water") {
      return estimate.recommendedProvision.toFixed(2);
    }
    // Battery Wh
    return Math.round(estimate.recommendedProvision).toLocaleString();
  };

  const displayUnit = () => {
    if (estimate.status === "unavailable" || estimate.recommendedProvision === null) {
      return "";
    }
    if (estimate.resourceType === "duration") {
      return ""; // formatted already in displayValue
    }
    return estimate.displayUnit;
  };

  return (
    <div className="eva-card" data-testid={`eva-card-${estimate.resourceType}`}>
      <div className="eva-card-top">
        <div className="eva-card-label">
          {getIcon()}
          <span>{estimate.recommendedLabel}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="eva-card-value-container">
        <span className="eva-card-number">{displayValue()}</span>
        {displayUnit() && <span className="eva-card-unit">{displayUnit()}</span>}
      </div>

      {estimate.availableCapacity !== null && estimate.availableCapacity !== undefined && (
        <div className="eva-card-capacity-line">
          <span>Capacity: {estimate.availableCapacity.toLocaleString()} {estimate.unit}</span>
          {estimate.remainingCapacity !== null && (
            <span
              style={{
                color:
                  estimate.remainingCapacity < 0
                    ? "#f87171"
                    : "#4ade80",
                fontWeight: 600,
              }}
            >
              {estimate.remainingCapacity < 0
                ? `Short by ${Math.abs(estimate.remainingCapacity).toFixed(1)} ${estimate.unit}`
                : `Margin: ${estimate.remainingCapacity.toFixed(1)} ${estimate.unit}`}
            </span>
          )}
        </div>
      )}

      {estimate.missingInputs.length > 0 && (
        <div className="eva-card-note" style={{ color: "#f87171" }}>
          Missing: {estimate.missingInputs[0]}
        </div>
      )}

      <button
        type="button"
        className="icon-button"
        style={{
          width: "100%",
          justifyContent: "space-between",
          fontSize: "0.72rem",
          color: "var(--text-muted, #94a3b8)",
          padding: "0.3rem 0",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          marginTop: "0.2rem",
          cursor: "pointer",
          background: "transparent",
        }}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>{expanded ? "Hide Breakdown" : "View Breakdown & Source"}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="eva-card-breakdown">
          {estimate.breakdown.length > 0 && (
            <div style={{ marginBottom: "0.4rem" }}>
              {estimate.breakdown.map((item, idx) => (
                <div key={idx} className="eva-breakdown-row">
                  <span>{item.label}:</span>
                  <span style={{ fontFamily: "var(--font-mono, monospace)", color: "#f1f5f9" }}>
                    {typeof item.amount === "number"
                      ? estimate.resourceType === "battery"
                        ? Math.round(item.amount).toLocaleString()
                        : item.amount.toFixed(2)
                      : item.amount}{" "}
                    {item.unit}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="eva-card-note" style={{ color: "#cbd5e1" }}>
            <strong>Source:</strong> {estimate.modelAndSource}
          </div>

          <div className="eva-card-note" style={{ marginTop: "0.2rem" }}>
            <strong>Uncertainty:</strong> {estimate.scientificUncertainty}
          </div>

          {estimate.calculationAssumptions.length > 0 && (
            <div className="eva-card-note" style={{ marginTop: "0.2rem" }}>
              <strong>Assumptions:</strong> {estimate.calculationAssumptions.join(" ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
