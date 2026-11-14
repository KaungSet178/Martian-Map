"use client";

import React from "react";
import { Navigation } from "lucide-react";
import type { EVAPlanResult } from "@/lib/eva/types";
import { formatHoursToHMin } from "@/lib/eva/timeline";

interface RouteSummarySectionProps {
  readonly result: EVAPlanResult;
}

export function RouteSummarySection({ result }: RouteSummarySectionProps) {
  const { routeSummary, regionId, routeEvidence } = result;

  const getRegionName = () => {
    switch (regionId) {
      case "gale":
        return "Gale Crater";
      case "jezero":
        return "Jezero Crater";
      case "oxia":
        return "Oxia Planum";
    }
  };

  const formatDistance = (meters: number | null) => {
    if (meters === null || !Number.isFinite(meters)) return "Unavailable";
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km (${meters.toLocaleString(undefined, { maximumFractionDigits: 0 })} m)`;
    }
    return `${meters.toFixed(0)} m`;
  };

  return (
    <div className="eva-section" data-testid="eva-route-summary">
      <div className="eva-section-title">
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Navigation size={17} className="text-cyan-400" aria-hidden="true" />
          <span>Mission Route Summary</span>
        </span>
        <span
          className={`eva-badge ${
            routeEvidence === "terrain-derived"
              ? "eva-badge--estimated"
              : routeEvidence === "geometric"
                ? "eva-badge--assumption"
                : "eva-badge--unavailable"
          }`}
        >
          {routeSummary.routeStatusText}
        </span>
      </div>

      <div className="eva-route-summary-list">
        <div className="eva-summary-item">
          <div className="eva-summary-label">Region</div>
          <div className="eva-summary-value">{getRegionName()}</div>
        </div>

        <div className="eva-summary-item">
          <div className="eva-summary-label">Route Distance</div>
          <div className="eva-summary-value">{formatDistance(routeSummary.distanceMeters)}</div>
        </div>

        <div className="eva-summary-item">
          <div className="eva-summary-label">Travel Time</div>
          <div className="eva-summary-value">
            {formatHoursToHMin(routeSummary.travelDurationHours)}
          </div>
        </div>

        <div className="eva-summary-item">
          <div className="eva-summary-label">Science Stops</div>
          <div className="eva-summary-value">
            {formatHoursToHMin(routeSummary.scienceStopDurationHours)}
          </div>
        </div>

        <div className="eva-summary-item">
          <div className="eva-summary-label">Direction Mode</div>
          <div className="eva-summary-value">
            {routeSummary.roundTripIncluded ? "Round Trip" : "One Way"}
          </div>
        </div>

        {routeSummary.ascentMeters !== null && routeSummary.ascentMeters !== undefined && (
          <div className="eva-summary-item">
            <div className="eva-summary-label">Elevation Gain</div>
            <div className="eva-summary-value">+{routeSummary.ascentMeters.toFixed(0)} m</div>
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted, #94a3b8)",
          lineHeight: 1.4,
          background: "rgba(0,0,0,0.25)",
          padding: "0.5rem 0.65rem",
          borderRadius: "4px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <strong>Geographic Uncertainty:</strong> {routeSummary.geographicUncertainty}
      </div>
    </div>
  );
}
