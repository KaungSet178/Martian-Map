"use client";

import React from "react";
import { BookOpen, AlertCircle } from "lucide-react";
import { listEVAProfiles } from "@/lib/eva/profiles";
import type { EVAReferenceProfile } from "@/lib/eva/types";

interface ProfileSelectorProps {
  readonly selectedProfileId: string;
  readonly onSelectProfile: (profileId: string) => void;
  readonly currentProfile: EVAReferenceProfile;
}

export function ProfileSelector({
  selectedProfileId,
  onSelectProfile,
  currentProfile,
}: ProfileSelectorProps) {
  const profiles = listEVAProfiles();

  return (
    <div className="eva-section" data-testid="eva-profile-section">
      <div className="eva-section-title">
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <BookOpen size={17} className="text-cyan-400" aria-hidden="true" />
          <span>Life-Support Reference Profile</span>
        </span>
        <span
          className={`eva-badge ${
            currentProfile.profileType === "historical-hardware"
              ? "eva-badge--estimated"
              : currentProfile.profileType === "nasa-engineering-reference"
                ? "eva-badge--capacity-ok"
                : "eva-badge--assumption"
          }`}
        >
          {currentProfile.profileType === "historical-hardware"
            ? "Flight Hardware"
            : currentProfile.profileType === "nasa-engineering-reference"
              ? "NASA Reference"
              : "User Scenario"}
        </span>
      </div>

      <div className="eva-form-group">
        <label htmlFor="eva-profile-select" className="eva-form-label">
          Select Engineering Baseline
        </label>
        <select
          id="eva-profile-select"
          className="eva-select"
          value={selectedProfileId}
          onChange={(e) => onSelectProfile(e.target.value)}
          data-testid="eva-profile-select"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          background: "var(--surface-raised, #131d33)",
          border: "1px solid var(--border, #223250)",
          borderRadius: "6px",
          padding: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          fontSize: "0.82rem",
        }}
      >
        <div style={{ color: "#f8fafc", fontWeight: 600 }}>
          {currentProfile.name}
        </div>
        <div style={{ color: "var(--text-muted, #94a3b8)", fontSize: "0.78rem" }}>
          <strong>Institution:</strong> {currentProfile.sourceAgency} ·{" "}
          <strong>Tech:</strong> {currentProfile.applicableTechnology}
        </div>
        <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.78rem" }}>
          {currentProfile.description}
        </p>

        {currentProfile.limitations.length > 0 && (
          <div style={{ marginTop: "0.3rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                color: "#fbbf24",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                marginBottom: "0.2rem",
              }}
            >
              <AlertCircle size={12} /> Model Boundaries & Limitations:
            </span>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.2rem",
                fontSize: "0.74rem",
                color: "#94a3b8",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
              }}
            >
              {currentProfile.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
