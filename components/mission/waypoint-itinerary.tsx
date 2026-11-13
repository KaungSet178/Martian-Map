"use client";

import {
  ArrowDown,
  ArrowUp,
  X,
  Home,
  Flag,
  MapPin,
  CornerDownLeft,
  Info,
  Check,
  Edit2,
  Shield,
  Compass,
  Sparkles,
} from "lucide-react";
import type {
  WaypointPlan,
  MarsWaypoint,
  WaypointRole,
  WaypointProvenance,
  ProposedGeometricTrajectory,
  GeometricDistanceSummary,
  TrajectorySegment,
} from "@/lib/mission/waypoint-planning";
import {
  generateGeometricTrajectory,
  calculateDistanceSummary,
  GEOMETRIC_TRAJECTORY_LABEL,
} from "@/lib/mission/waypoint-planning";
import type { MarsCoordinate } from "@/lib/map/geodesy";
import { Badge } from "@/components/ui/primitives";

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a geometric distance in meters into human-readable planetary metric units.
 */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "0 m";
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km (${Math.round(meters).toLocaleString()} m)`;
}

/**
 * Formats an initial forward azimuth into a 3-digit degree representation.
 */
export function formatBearing(degrees: number): string {
  if (!Number.isFinite(degrees) || Number.isNaN(degrees)) return "N/A";
  const normalized = ((Math.round(degrees) % 360) + 360) % 360;
  return `${normalized.toString().padStart(3, "0")}°`;
}

/**
 * Formats Mars planetocentric coordinates with East-positive longitude.
 */
export function formatCoordinates(coords: MarsCoordinate): string {
  const latStr = `${coords.latitude >= 0 ? "+" : ""}${coords.latitude.toFixed(4)}°`;
  const lonStr = `${coords.longitude_east.toFixed(4)}° E`;
  return `${latStr}, ${lonStr}`;
}

/**
 * Returns human-readable label and icon for a waypoint role.
 */
export function roleDisplay(role: WaypointRole): { label: string; icon: typeof MapPin } {
  switch (role) {
    case "base":
      return { label: "Origin Base Camp", icon: Home };
    case "science_stop":
      return { label: "Science Investigation Stop", icon: Compass };
    case "destination":
      return { label: "Outbound Destination Terminus", icon: Flag };
    case "recovery_endpoint":
      return { label: "Pre-Planned Recovery Site", icon: Shield };
    case "intermediate":
    default:
      return { label: "Intermediate Turn Point", icon: MapPin };
  }
}

// ---------------------------------------------------------------------------
// Provenance Badge Subcomponent
// ---------------------------------------------------------------------------

export function WaypointProvenanceBadge({ provenance }: { provenance: WaypointProvenance }) {
  switch (provenance) {
    case "verified_science_target":
      return (
        <span title="Location derived from audited NASA science catalog">
          <Badge tone="cyan">Observed · NASA Target</Badge>
        </span>
      );
    case "historical_landmark":
      return (
        <span title="Historical precursor mission landing site or landmark">
          <Badge tone="muted">Observed · Precursor Landmark</Badge>
        </span>
      );
    case "user_planning_input":
    default:
      return (
        <span title="Hypothetical planning coordinates chosen by mission architect">
          <Badge tone="science">Scenario · User Waypoint</Badge>
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

export interface WaypointItineraryProps {
  /** The active immutable waypoint plan. */
  plan: WaypointPlan;
  /** Whether the itinerary is in read-only mode. */
  readOnly?: boolean;
  /** Optional ID of the waypoint currently undergoing inline label editing. */
  editingWaypointId?: string | null;
  /** Optional ID of the currently selected/inspected waypoint. */
  selectedWaypointId?: string | null;
  /** Callback invoked when a waypoint is removed by ID. */
  onWaypointRemove?: (waypointId: string) => void;
  /** Callback invoked when a waypoint position moves by delta (+1 or -1). */
  onWaypointMove?: (waypointId: string, delta: number) => void;
  /** Callback invoked when a waypoint's attributes are patched. */
  onWaypointUpdate?: (waypointId: string, patch: Partial<MarsWaypoint>) => void;
  /** Callback invoked when a waypoint label edit begins. */
  onStartEditing?: (waypointId: string) => void;
  /** Callback invoked when a waypoint label edit finishes/cancels. */
  onStopEditing?: () => void;
  /** Callback invoked when a waypoint is promoted to origin base camp. */
  onSetOrigin?: (waypoint: MarsWaypoint) => void;
  /** Callback invoked when a waypoint is designated as destination terminus. */
  onSetDestination?: (waypoint: MarsWaypoint) => void;
  /** Callback invoked when the user requests science target selection. */
  onExploreScience?: () => void;
  /** Callback invoked when a waypoint item is selected. */
  onSelectWaypoint?: (waypointId: string) => void;
}

// ---------------------------------------------------------------------------
// Main Component (Pure Function Component)
// ---------------------------------------------------------------------------

export function WaypointItinerary({
  plan,
  readOnly = false,
  editingWaypointId = null,
  selectedWaypointId = null,
  onWaypointRemove,
  onWaypointMove,
  onWaypointUpdate,
  onStartEditing,
  onStopEditing,
  onSetOrigin,
  onSetDestination,
  onExploreScience,
  onSelectWaypoint,
}: WaypointItineraryProps) {
  // Compute geometric trajectory dynamically from pure M2 engine
  const trajectory: ProposedGeometricTrajectory = generateGeometricTrajectory(plan);
  const distanceSummary: GeometricDistanceSummary = calculateDistanceSummary(trajectory);
  const waypoints = plan.waypoints;

  if (waypoints.length === 0) {
    return (
      <div className="empty-list" data-testid="empty-itinerary">
        <h3>No surface waypoints established</h3>
        <p>
          Add a base camp, intermediate turn point, or verified science stop to
          begin geometric trajectory planning.
        </p>
        {onExploreScience && !readOnly && (
          <button
            type="button"
            className="surface-button"
            onClick={onExploreScience}
            data-testid="explore-science-btn"
          >
            <Compass size={16} aria-hidden="true" />
            Explore science catalog
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="waypoint-itinerary-container" data-testid="waypoint-itinerary">
      <ol className="itinerary" role="list" aria-label="Ordered surface itinerary">
        {waypoints.map((wp, index) => {
          const { label: roleName, icon: RoleIcon } = roleDisplay(wp.role);
          const isOrigin = index === 0;
          const isLast = index === waypoints.length - 1;
          const isEditing = editingWaypointId === wp.id;
          const isSelected = selectedWaypointId === wp.id;
          const legToNext: TrajectorySegment | null =
            index < trajectory.segments.length ? trajectory.segments[index] : null;

          return (
            <li
              key={wp.id}
              className={`waypoint-list-item ${isSelected ? "selected-waypoint" : ""}`}
              data-testid={`waypoint-item-${wp.id}`}
              data-selected={isSelected ? "true" : undefined}
              onClick={() => onSelectWaypoint?.(wp.id)}
            >
              {/* Waypoint Sequence Node */}
              <div className="waypoint-node">
                <span
                  className={`stop-number mono ${wp.role === "base" ? "base-stop" : ""}`}
                  aria-label={`Stop number ${index + 1}`}
                >
                  {index + 1}
                </span>
              </div>

              {/* Waypoint Card Content */}
              <div className="stop-copy waypoint-card-body">
                {/* Header Row: Role & Provenance */}
                <div className="waypoint-header-row">
                  <div className="waypoint-role-group">
                    <RoleIcon size={15} aria-hidden="true" className="role-icon" />
                    <span className="waypoint-role-title">{roleName}</span>
                  </div>
                  <WaypointProvenanceBadge provenance={wp.provenance} />
                </div>

                {/* Title / Label with Inline Editing */}
                <div className="waypoint-title-row">
                  {isEditing ? (
                    <div className="waypoint-edit-group">
                      <input
                        type="text"
                        className="waypoint-inline-input"
                        defaultValue={wp.label || ""}
                        maxLength={100}
                        autoFocus
                        onBlur={(e) => {
                          const trimmed = e.target.value.trim();
                          onWaypointUpdate?.(wp.id, { label: trimmed || undefined });
                          onStopEditing?.();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const trimmed = (e.target as HTMLInputElement).value.trim();
                            onWaypointUpdate?.(wp.id, { label: trimmed || undefined });
                            onStopEditing?.();
                          }
                          if (e.key === "Escape") {
                            onStopEditing?.();
                          }
                        }}
                        aria-label={`Edit label for stop ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="icon-button"
                        onClick={onStopEditing}
                        aria-label="Finish editing label"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="waypoint-label-display">
                      <strong className="waypoint-label-text">
                        {wp.label || `Waypoint ${index + 1}`}
                      </strong>
                      {!readOnly && onStartEditing && (
                        <button
                          type="button"
                          className="icon-button-subtle"
                          onClick={() => onStartEditing(wp.id)}
                          aria-label={`Rename ${wp.label || `Waypoint ${index + 1}`}`}
                          title="Rename waypoint"
                        >
                          <Edit2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Spatial Coordinates */}
                <div className="waypoint-coords-row">
                  <span className="waypoint-coords-label">Planetocentric:</span>
                  <span className="waypoint-coords-val mono">
                    {formatCoordinates(wp.coordinates)}
                  </span>
                </div>

                {/* Target Catalog Association */}
                {wp.target_id && (
                  <div className="waypoint-target-row">
                    <Sparkles size={13} aria-hidden="true" />
                    <span>Catalog Target ID: <span className="mono">{wp.target_id}</span></span>
                  </div>
                )}

                {/* Notes if documented */}
                {wp.notes && <p className="waypoint-notes">{wp.notes}</p>}

                {/* Action Toolbar */}
                {!readOnly && (
                  <div className="stop-actions waypoint-actions-toolbar">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move ${wp.label || `stop ${index + 1}`} up`}
                      disabled={isOrigin}
                      onClick={() => onWaypointMove?.(wp.id, -1)}
                      title="Move stop earlier in itinerary"
                    >
                      <ArrowUp size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Move ${wp.label || `stop ${index + 1}`} down`}
                      disabled={isLast}
                      onClick={() => onWaypointMove?.(wp.id, 1)}
                      title="Move stop later in itinerary"
                    >
                      <ArrowDown size={16} />
                    </button>

                    {!isOrigin && onSetOrigin && (
                      <button
                        type="button"
                        className="small-action-button"
                        aria-label={`Promote ${wp.label || `stop ${index + 1}`} to origin base camp`}
                        onClick={() => onSetOrigin(wp)}
                        title="Promote to Origin Base Camp (moves to start)"
                      >
                        <Home size={14} aria-hidden="true" />
                        <span>Make Base</span>
                      </button>
                    )}

                    {plan.mode === "one_way" && !isLast && onSetDestination && (
                      <button
                        type="button"
                        className="small-action-button"
                        aria-label={`Designate ${wp.label || `stop ${index + 1}`} as destination terminus`}
                        onClick={() => onSetDestination(wp)}
                        title="Designate as destination terminus"
                      >
                        <Flag size={14} aria-hidden="true" />
                        <span>Terminus</span>
                      </button>
                    )}

                    {onWaypointRemove && (
                      <button
                        type="button"
                        className="icon-button delete-button"
                        aria-label={`Remove ${wp.label || `stop ${index + 1}`} from itinerary`}
                        onClick={() => onWaypointRemove(wp.id)}
                        title="Remove waypoint"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                )}

                {/* Inter-segment Leg Distance Connector */}
                {legToNext && !legToNext.is_return_segment && (
                  <div className="trajectory-leg-card" data-testid={`leg-connector-${index}`}>
                    <div className="leg-indicator-line" aria-hidden="true" />
                    <div className="leg-metrics">
                      <span className="leg-metric-distance mono">
                        {formatDistance(legToNext.surface_distance_m)}
                      </span>
                      <span className="leg-metric-separator">·</span>
                      <span className="leg-metric-bearing mono">
                        Bearing {formatBearing(legToNext.initial_bearing_deg)}
                      </span>
                      <span className="leg-metric-chord supporting">
                        (Great-circle arc)
                      </span>
                    </div>
                  </div>
                )}

                {/* Return Closure Leg Connector (after last stop) */}
                {isLast &&
                  plan.mode === "round_trip" &&
                  waypoints.length >= 2 &&
                  trajectory.segments.some((s: TrajectorySegment) => s.is_return_segment) && (
                    <div className="trajectory-return-card" data-testid="return-closure-leg">
                      <div className="return-leg-header">
                        <CornerDownLeft size={16} aria-hidden="true" className="return-icon" />
                        <strong>Return Leg to Base Camp ({waypoints[0].label || "Base"})</strong>
                      </div>
                      <div className="return-metrics">
                        <span className="mono">{formatDistance(distanceSummary.return_distance_m)}</span>
                        <span className="leg-metric-separator">·</span>
                        <span className="mono">
                          Bearing{" "}
                          {formatBearing(
                            trajectory.segments[trajectory.segments.length - 1]
                              ?.initial_bearing_deg ?? 0,
                          )}
                        </span>
                        <span className="supporting">(Closing loop)</span>
                      </div>
                    </div>
                  )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Distance Summary Metrics Footer */}
      <section className="waypoint-distance-summary" data-testid="distance-summary">
        <h4 className="distance-summary-title">Geometric Distance Summary</h4>

        <div className="distance-breakdown-grid">
          <div className="distance-cell">
            <span className="distance-cell-label">Outbound Traverse</span>
            <span className="distance-cell-value mono" data-testid="outbound-distance">
              {formatDistance(distanceSummary.outbound_distance_m)}
            </span>
          </div>

          {plan.mode === "round_trip" && (
            <div className="distance-cell">
              <span className="distance-cell-label">Return to Base</span>
              <span className="distance-cell-value mono" data-testid="return-distance">
                {formatDistance(distanceSummary.return_distance_m)}
              </span>
            </div>
          )}

          <div className="distance-cell highlight">
            <span className="distance-cell-label">Total Geometric Distance</span>
            <span className="distance-cell-value mono" data-testid="total-distance">
              {formatDistance(distanceSummary.total_surface_distance_m)}
            </span>
          </div>
        </div>

        {/* Scientific Baseline Disclaimer */}
        <div className="trajectory-disclaimer-notice">
          <Info size={16} aria-hidden="true" className="disclaimer-icon" />
          <p className="disclaimer-text">
            <strong>{GEOMETRIC_TRAJECTORY_LABEL}.</strong> Horizontal great-circle
            arc distance only. Does not account for terrain slopes, impassable
            obstacles, astronaut metabolic rates, or mission walkback feasibility.
          </p>
        </div>
      </section>
    </div>
  );
}
