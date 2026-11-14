"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  Clock,
  Navigation,
  Compass,
  Home,
  Shield,
  AlertTriangle,
  Info,
  CornerDownLeft,
  ArrowRight,
  Sliders,
} from "lucide-react";
import type {
  WaypointPlan,
  MarsWaypoint,
} from "@/lib/mission/waypoint-planning";
import {
  calculateMissionTimeline,
  TIMELINE_DISCLAIMER,
  type TimelineAssumptions,
  type MissionTimelineResult,
  type TimelineEntry,
} from "@/lib/mission/timeline";
import type { RegionManifest } from "@/lib/contracts/region";
import { Badge, Notice } from "@/components/ui/primitives";
import { formatCoordinates, roleDisplay } from "./waypoint-itinerary";

// ---------------------------------------------------------------------------
// Pure Formatting Helpers (Group A Verification)
// ---------------------------------------------------------------------------

/**
 * Formats elapsed seconds into an HH:MM:SS string.
 * Returns "--:--:--" if seconds is null, negative, or non-finite.
 */
export function formatElapsedSeconds(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "--:--:--";
  }
  const totalSec = Math.floor(seconds);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Formats elapsed mission time as a mission clock string (e.g. "T+01:15:00").
 * Returns "Unavailable" if seconds is null, negative, or non-finite.
 */
export function formatMissionClock(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "Unavailable";
  }
  return `T+${formatElapsedSeconds(seconds)}`;
}

/**
 * Formats a duration in seconds into a concise human-readable string (e.g. "2h 15m", "45m", "0m").
 * Returns "Unavailable" if seconds is null, negative, or non-finite.
 */
export function formatDurationHuman(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "Unavailable";
  }
  const totalSec = Math.round(seconds);
  if (totalSec === 0) return "0m";

  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || (h > 0 && s > 0)) parts.push(`${m}m`);
  if (h === 0 && m === 0 && s > 0) parts.push(`${s}s`);

  return parts.join(" ") || "0m";
}

/**
 * Formats a distance in meters into planetary metric string.
 * Returns "Unavailable" if meters is null, negative, or non-finite.
 */
export function formatTimelineDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters) || meters < 0) {
    return "Unavailable";
  }
  if (meters === 0) return "0 m";
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km (${Math.round(meters).toLocaleString()} m)`;
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

export interface MissionTimelineDashboardProps {
  /** The active immutable waypoint plan. */
  plan: WaypointPlan;
  /** Regional context for scientific integrity and isolation. */
  region?: RegionManifest;
  /** Configured walking speed in meters per hour (hypothetical planning assumption). */
  walkingSpeedMPerHour?: number;
  /** Callback when user changes assumed walking speed. */
  onWalkingSpeedChange?: (speed: number) => void;
  /** Configured default science stop duration in minutes. */
  scienceStopDurationMinutes?: number;
  /** Callback when user changes default science stop duration. */
  onScienceStopDurationChange?: (minutes: number) => void;
  /** Optional per-waypoint explicit stop durations in minutes. */
  perWaypointStopDurationsMinutes?: Record<string, number>;
  /** Callback when user updates a specific waypoint's stop duration. */
  onPerWaypointStopDurationChange?: (waypointId: string, minutes: number) => void;
  /** Callback when user clicks a waypoint to inspect or focus on map. */
  onSelectWaypoint?: (waypointId: string) => void;
  /** Currently selected waypoint ID. */
  selectedWaypointId?: string | null;
  /** Callback to switch to Surface Waypoints view. */
  onSwitchToWaypoints?: () => void;
  /** Callback to navigate to Science Catalog. */
  onExploreScience?: () => void;
  /** Whether the controls are in read-only mode. */
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Main Component: MissionTimelineDashboard
// ---------------------------------------------------------------------------

export function MissionTimelineDashboard({
  plan,
  region,
  walkingSpeedMPerHour,
  onWalkingSpeedChange,
  scienceStopDurationMinutes,
  onScienceStopDurationChange,
  perWaypointStopDurationsMinutes,
  onSelectWaypoint,
  selectedWaypointId,
  onSwitchToWaypoints,
  onExploreScience,
  readOnly = false,
}: MissionTimelineDashboardProps) {
  // Local state for uncontrolled inputs
  const [uncontrolledSpeed, setUncontrolledSpeed] = useState<number>(walkingSpeedMPerHour ?? 1000);
  const [uncontrolledStopMinutes, setUncontrolledStopMinutes] = useState<number>(scienceStopDurationMinutes ?? 15);
  const [speedInputText, setSpeedInputText] = useState<string>(String(walkingSpeedMPerHour ?? 1000));
  const [stopInputText, setStopInputText] = useState<string>(String(scienceStopDurationMinutes ?? 15));
  const [inputWarning, setInputWarning] = useState<string | null>(null);

  const localSpeed = walkingSpeedMPerHour ?? uncontrolledSpeed;
  const localStopMinutes = scienceStopDurationMinutes ?? uncontrolledStopMinutes;

  // Handle walking speed change
  const handleSpeedInput = useCallback(
    (valStr: string) => {
      setSpeedInputText(valStr);
      const parsed = parseFloat(valStr);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setInputWarning("Walking speed must be a strictly positive number (m/h).");
        return;
      }
      setInputWarning(null);
      setUncontrolledSpeed(parsed);
      onWalkingSpeedChange?.(parsed);
    },
    [onWalkingSpeedChange],
  );

  // Handle stop duration change
  const handleStopDurationInput = useCallback(
    (valStr: string) => {
      setStopInputText(valStr);
      const parsed = parseFloat(valStr);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setInputWarning("Stop duration must be a non-negative number of minutes.");
        return;
      }
      setInputWarning(null);
      setUncontrolledStopMinutes(parsed);
      onScienceStopDurationChange?.(parsed);
    },
    [onScienceStopDurationChange],
  );

  // Construct typed timeline assumptions
  const assumptions: TimelineAssumptions = useMemo(() => {
    const waypointStopsSec: Record<string, number> = {};
    if (perWaypointStopDurationsMinutes) {
      for (const [id, mins] of Object.entries(perWaypointStopDurationsMinutes)) {
        if (Number.isFinite(mins) && mins >= 0) {
          waypointStopsSec[id] = mins * 60;
        }
      }
    }

    return {
      walking_speed_m_per_hour: localSpeed > 0 ? localSpeed : 1000,
      default_science_stop_duration_seconds: localStopMinutes >= 0 ? localStopMinutes * 60 : 900,
      waypoint_stop_durations_seconds: waypointStopsSec,
      base_preparation_duration_seconds: 0,
      final_destination_duration_seconds: 0,
    };
  }, [localSpeed, localStopMinutes, perWaypointStopDurationsMinutes]);

  // Execute deterministic timeline calculation
  const timelineResult: MissionTimelineResult | null = useMemo(() => {
    if (!plan || !plan.waypoints || plan.waypoints.length === 0) {
      return null;
    }
    return calculateMissionTimeline(plan, assumptions);
  }, [plan, assumptions]);

  // Count supported and total segments
  const { supportedLegCount, totalLegCount } = useMemo(() => {
    if (!timelineResult || !timelineResult.segments) {
      return { supportedLegCount: 0, totalLegCount: 0 };
    }
    const supported = timelineResult.segments.filter((s) => s.status === "SUPPORTED").length;
    return {
      supportedLegCount: supported,
      totalLegCount: timelineResult.segments.length,
    };
  }, [timelineResult]);

  // Map waypoint lookup
  const waypointMap = useMemo(() => {
    const map = new Map<string, MarsWaypoint>();
    if (plan && plan.waypoints) {
      for (const wp of plan.waypoints) {
        map.set(wp.id, wp);
      }
    }
    return map;
  }, [plan]);

  // Empty itinerary state
  if (!plan || !plan.waypoints || plan.waypoints.length === 0) {
    return (
      <div className="timeline-dashboard" data-testid="timeline-dashboard-empty">
        <div className="section-intro">
          <span className="eyebrow">Mission Timing</span>
          <h2>Deterministic Route Timeline</h2>
          <p>Elapsed time schedule and travel estimates along surface trajectories.</p>
        </div>

        <Notice title="No Waypoints Placed">
          No surface waypoints have been added to this mission plan yet. Add an Origin Base Camp and science stops to
          generate a deterministic mission timeline.
        </Notice>

        {onSwitchToWaypoints && (
          <button
            type="button"
            className="file-button"
            onClick={onSwitchToWaypoints}
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            data-testid="timeline-empty-switch-waypoints-btn"
          >
            <Compass size={17} aria-hidden="true" />
            <span>Open Surface Waypoints Editor</span>
          </button>
        )}
      </div>
    );
  }

  // Single-waypoint state
  if (plan.waypoints.length === 1) {
    return (
      <div className="timeline-dashboard" data-testid="timeline-dashboard-single">
        <div className="section-intro">
          <span className="eyebrow">Mission Timing</span>
          <h2>Deterministic Route Timeline</h2>
          <p>Elapsed time schedule and travel estimates along surface trajectories.</p>
        </div>

        <Notice title="Single Waypoint — Traverse Incomplete">
          Origin Base Camp is placed, but a traverse requires at least two waypoints to form an excursion leg. Add a
          destination or science stop on the map or in the Waypoints panel to calculate route travel timing.
        </Notice>

        <div className="timeline-single-waypoint-card">
          <div className="timeline-stop-header">
            <Home size={18} className="role-icon base" aria-hidden="true" />
            <strong>{plan.waypoints[0].label || "Base Camp"}</strong>
            <Badge tone="cyan">Origin Base</Badge>
          </div>
          <p className="supporting mono">
            {formatCoordinates(plan.waypoints[0].coordinates)} · Departure: T+00:00:00
          </p>
        </div>

        {onSwitchToWaypoints && (
          <button
            type="button"
            className="file-button"
            onClick={onSwitchToWaypoints}
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            data-testid="timeline-single-switch-waypoints-btn"
          >
            <Compass size={17} aria-hidden="true" />
            <span>Add Next Stop in Waypoints Editor</span>
          </button>
        )}
      </div>
    );
  }

  const isComplete = timelineResult?.status === "COMPLETE_SCENARIO";
  const isIncomplete = timelineResult?.status === "INCOMPLETE_SCENARIO";
  const isInvalid = timelineResult?.status === "INVALID_INPUT";

  return (
    <div className="timeline-dashboard" data-testid="timeline-dashboard">
      {/* 1. Header & Status Banner */}
      <div className="section-intro">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">{region ? `${region.name} · ` : ""}Mission Timing</span>
            <h2>Route Timeline Dashboard</h2>
          </div>
          <div className="status-badge-container">
            {isComplete && (
              <Badge tone="cyan" data-testid="timeline-status-badge">
                Complete Scenario
              </Badge>
            )}
            {isIncomplete && (
              <Badge tone="caution" data-testid="timeline-status-badge">
                Incomplete Scenario
              </Badge>
            )}
            {isInvalid && (
              <Badge tone="caution" data-testid="timeline-status-badge">
                Invalid Configuration
              </Badge>
            )}
          </div>
        </div>
        <p className="supporting">
          Hypothetical elapsed-time schedule along spherical Mars great-circle arcs (R = 3,396,190 m).
        </p>
      </div>

      {/* 2. Planning Assumptions Bar */}
      <section className="timeline-assumptions-section" data-testid="timeline-assumptions-card">
        <div className="timeline-assumptions-header">
          <div className="assumptions-title">
            <Sliders size={16} aria-hidden="true" />
            <strong>Hypothetical Planning Assumptions</strong>
          </div>
          <Badge tone="science">Scenario Inputs</Badge>
        </div>

        <p className="supporting disclaimer-subtext">
          Planning assumptions only. Does not reflect verified astronaut physical exertion, suit life support, or terrain
          impedance.
        </p>

        <div className="timeline-assumptions-grid">
          {/* Walking Speed Control */}
          <div className="assumption-field">
            <label className="field-label" htmlFor="timeline-walking-speed">
              Assumed walking speed <span className="mono">({localSpeed} m/h)</span>
            </label>
            <div className="input-with-unit">
              <input
                id="timeline-walking-speed"
                type="number"
                min="100"
                max="10000"
                step="50"
                value={speedInputText}
                onChange={(e) => handleSpeedInput(e.target.value)}
                disabled={readOnly}
                aria-describedby="timeline-speed-hint"
                data-testid="input-walking-speed"
              />
              <span className="unit-suffix">m/h</span>
            </div>
            <div className="preset-buttons">
              {[800, 1000, 1200, 1500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-pill ${localSpeed === preset ? "active" : ""}`}
                  onClick={() => handleSpeedInput(String(preset))}
                  disabled={readOnly}
                  data-testid={`preset-speed-${preset}`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <span id="timeline-speed-hint" className="supporting field-hint">
              Hypothetical speed along surface trajectory.
            </span>
          </div>

          {/* Science Stop Duration Control */}
          <div className="assumption-field">
            <label className="field-label" htmlFor="timeline-stop-duration">
              Default science stop dwell <span className="mono">({localStopMinutes} min)</span>
            </label>
            <div className="input-with-unit">
              <input
                id="timeline-stop-duration"
                type="number"
                min="0"
                max="480"
                step="5"
                value={stopInputText}
                onChange={(e) => handleStopDurationInput(e.target.value)}
                disabled={readOnly}
                aria-describedby="timeline-stop-hint"
                data-testid="input-stop-duration"
              />
              <span className="unit-suffix">min</span>
            </div>
            <div className="preset-buttons">
              {[10, 15, 30, 45, 60].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-pill ${localStopMinutes === preset ? "active" : ""}`}
                  onClick={() => handleStopDurationInput(String(preset))}
                  disabled={readOnly}
                  data-testid={`preset-stop-${preset}`}
                >
                  {preset}m
                </button>
              ))}
            </div>
            <span id="timeline-stop-hint" className="supporting field-hint">
              Applied to waypoints with role=&quot;science_stop&quot;.
            </span>
          </div>
        </div>

        {inputWarning && (
          <div className="input-warning-notice" role="alert">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{inputWarning}</span>
          </div>
        )}
      </section>

      {/* 3. Overview Metrics Grid */}
      <section className="timeline-summary-grid" data-testid="timeline-summary">
        {/* Total Mission Duration */}
        <div className="timeline-metric-card primary" data-testid="card-total-duration">
          <div className="card-top">
            <Clock size={16} aria-hidden="true" className="metric-icon" />
            <span className="card-label">Total Mission Time</span>
          </div>
          <div className="card-value mono" data-testid="timeline-total-duration">
            {formatDurationHuman(timelineResult?.total_mission_seconds)}
          </div>
          <div className="card-subtext mono">
            {timelineResult?.total_mission_seconds !== null
              ? formatMissionClock(timelineResult?.total_mission_seconds)
              : "Unavailable"}
          </div>
        </div>

        {/* Travel Duration */}
        <div className="timeline-metric-card" data-testid="card-travel-duration">
          <div className="card-top">
            <Navigation size={16} aria-hidden="true" className="metric-icon" />
            <span className="card-label">Travel Time</span>
          </div>
          <div className="card-value mono" data-testid="timeline-travel-duration">
            {formatDurationHuman(timelineResult?.total_travel_seconds)}
          </div>
          <div className="card-subtext">
            {plan.mode === "round_trip" ? "Round-trip loop" : "One-way transect"}
          </div>
        </div>

        {/* Stop / Stationary Duration */}
        <div className="timeline-metric-card" data-testid="card-stop-duration">
          <div className="card-top">
            <Compass size={16} aria-hidden="true" className="metric-icon" />
            <span className="card-label">Science Dwell</span>
          </div>
          <div className="card-value mono" data-testid="timeline-stop-duration">
            {formatDurationHuman(timelineResult?.total_stop_seconds)}
          </div>
          <div className="card-subtext">
            {plan.waypoints.filter((w) => w.role === "science_stop").length} science{" "}
            {plan.waypoints.filter((w) => w.role === "science_stop").length === 1 ? "stop" : "stops"}
          </div>
          {onExploreScience && (
            <button
              type="button"
              className="small-action-button"
              onClick={onExploreScience}
              style={{ marginTop: 4, width: "fit-content" }}
              data-testid="timeline-explore-science-btn"
            >
              Explore Science Catalog
            </button>
          )}
        </div>

        {/* Segment Support Metric */}
        <div className="timeline-metric-card" data-testid="card-leg-support">
          <div className="card-top">
            <Shield size={16} aria-hidden="true" className="metric-icon" />
            <span className="card-label">Leg Support</span>
          </div>
          <div className="card-value mono" data-testid="timeline-leg-support">
            {supportedLegCount}/{totalLegCount}
          </div>
          <div className="card-subtext mono">
            {formatTimelineDistance(timelineResult?.total_distance_metres)}
          </div>
        </div>
      </section>

      {/* 4. Warning Notices if Incomplete or Invalid */}
      {timelineResult?.warnings && timelineResult.warnings.length > 0 && (
        <div className="timeline-warnings-container" data-testid="timeline-warnings">
          {timelineResult.warnings.map((warning, idx) => (
            <Notice key={idx} title="Planning Notice">
              {warning}
            </Notice>
          ))}
        </div>
      )}

      {/* 5. Chronological Event Timeline */}
      <section className="chronological-timeline-section" data-testid="chronological-timeline">
        <div className="section-heading">
          <h3>Chronological Trajectory Schedule</h3>
          <Badge tone={plan.mode === "round_trip" ? "cyan" : "science"}>
            {plan.mode === "round_trip" ? "Round-Trip Closure" : "One-Way Traverse"}
          </Badge>
        </div>

        <ol className="timeline-events-list">
          {timelineResult?.timeline.map((entry: TimelineEntry, index: number) => {
            const isReturnClosure = entry.is_return === true;
            const wp = waypointMap.get(entry.waypoint_id);
            const role = isReturnClosure ? "base" : (entry.role ?? wp?.role ?? "intermediate");
            const roleInfo = roleDisplay(role);
            const RoleIcon = roleInfo.icon;
            const isSelected = selectedWaypointId === entry.waypoint_id;

            // Find connecting segment outbound from this stop (if any)
            const outboundLeg =
              index < (timelineResult.segments?.length ?? 0) ? timelineResult.segments[index] : null;

            return (
              <li key={`stop-node-${index}-${entry.waypoint_id}`} className="timeline-event-item">
                {/* A. Waypoint Stop Card */}
                <div
                  className={`timeline-stop-card ${role} ${isSelected ? "selected-node" : ""} ${isReturnClosure ? "return-closure-node" : ""}`}
                  data-testid={`timeline-stop-${index}`}
                  onClick={() => onSelectWaypoint?.(entry.waypoint_id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectWaypoint?.(entry.waypoint_id);
                    }
                  }}
                >
                  <div className="stop-card-main">
                    <div className="stop-card-left">
                      <div className="stop-index-circle mono">
                        {isReturnClosure ? <CornerDownLeft size={14} aria-hidden="true" /> : index + 1}
                      </div>
                      <div className="stop-identity">
                        <div className="stop-name-row">
                          <RoleIcon size={16} aria-hidden="true" className={`role-glyph ${role}`} />
                          <strong className="stop-name">
                            {isReturnClosure
                              ? `Return to Base Camp (${wp?.label || "Base"})`
                              : (wp?.label || `Waypoint ${index + 1}`)}
                          </strong>
                        </div>
                        <div className="stop-role-provenance">
                          <span className="role-text-label">{isReturnClosure ? "Traverse Closure" : roleInfo.label}</span>
                          {wp?.coordinates && (
                            <span className="stop-coords mono">{formatCoordinates(wp.coordinates)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timing Chips */}
                    <div className="stop-timing-chips" data-testid={`stop-timing-${index}`}>
                      <div className="timing-chip arrival">
                        <span className="chip-label">Arrival</span>
                        <span className="chip-time mono" data-testid={`arrival-time-${index}`}>
                          {formatMissionClock(entry.arrival_elapsed_seconds)}
                        </span>
                      </div>

                      {entry.stop_duration_seconds > 0 && (
                        <div className="timing-chip dwell">
                          <span className="chip-label">Dwell</span>
                          <span className="chip-time mono" data-testid={`dwell-time-${index}`}>
                            {formatDurationHuman(entry.stop_duration_seconds)}
                          </span>
                        </div>
                      )}

                      <div className="timing-chip departure">
                        <span className="chip-label">Departure</span>
                        <span className="chip-time mono" data-testid={`departure-time-${index}`}>
                          {formatMissionClock(entry.departure_elapsed_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* B. Inter-segment Travel Leg Connector */}
                {outboundLeg && (
                  <div
                    className={`timeline-transit-leg-card ${outboundLeg.status === "UNSUPPORTED" ? "unsupported-leg" : ""} ${outboundLeg.is_return_segment ? "return-leg" : ""}`}
                    data-testid={`timeline-leg-${index}`}
                  >
                    <div className="leg-vertical-connector" aria-hidden="true">
                      <div className="connector-line" />
                      <ArrowRight size={12} className="connector-arrow" />
                    </div>

                    <div className="leg-content">
                      <div className="leg-header">
                        <div className="leg-title-row">
                          <strong>
                            {outboundLeg.is_return_segment
                              ? "Return Transit to Base Camp"
                              : `Transit Leg ${index + 1} → ${index + 2}`}
                          </strong>
                          <span className="leg-route-endpoints mono">
                            ({outboundLeg.from_waypoint_id} → {outboundLeg.to_waypoint_id})
                          </span>
                        </div>
                        <Badge tone={outboundLeg.status === "SUPPORTED" ? "cyan" : "caution"}>
                          {outboundLeg.status === "SUPPORTED" ? "Supported" : "Unsupported"}
                        </Badge>
                      </div>

                      <div className="leg-metrics-row">
                        <div className="leg-metric">
                          <span className="metric-label">Leg Travel Time:</span>
                          <span className="metric-value mono" data-testid={`leg-travel-time-${index}`}>
                            {formatDurationHuman(outboundLeg.travel_duration_seconds)}
                          </span>
                          {outboundLeg.travel_duration_seconds !== null && (
                            <span className="metric-clock mono">
                              ({formatMissionClock(outboundLeg.travel_duration_seconds)})
                            </span>
                          )}
                        </div>

                        <div className="leg-metric">
                          <span className="metric-label">Distance:</span>
                          <span className="metric-value mono" data-testid={`leg-distance-${index}`}>
                            {formatTimelineDistance(outboundLeg.distance_metres)}
                          </span>
                        </div>
                      </div>

                      {outboundLeg.status === "UNSUPPORTED" && (
                        <p className="leg-unsupported-warning supporting">
                          <AlertTriangle size={13} aria-hidden="true" />
                          Distance or surface trajectory cannot be calculated for this leg. Downstream times are
                          indeterminate.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* 6. Scientific Disclaimer Notice */}
      <footer className="timeline-disclaimer-card" data-testid="timeline-disclaimer">
        <div className="disclaimer-header">
          <Info size={16} aria-hidden="true" className="disclaimer-icon" />
          <strong>Scientific Planning Restriction</strong>
        </div>
        <p className="disclaimer-body">{TIMELINE_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
