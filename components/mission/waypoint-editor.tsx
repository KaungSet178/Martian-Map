"use client";

import { useState } from "react";
import {
  Compass,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  Home,
  Flag,
  Info,
  MapPin,
  Plus,
} from "lucide-react";
import type {
  WaypointPlan,
  MarsWaypoint,
  WaypointRole,
  TrajectoryMode,
} from "@/lib/mission/waypoint-planning";
import {
  validateWaypointPlan,
  createWaypoint,
  GEOMETRIC_TRAJECTORY_LABEL,
} from "@/lib/mission/waypoint-planning";
import { Badge, Notice } from "@/components/ui/primitives";
import {
  WaypointItinerary,
  WaypointProvenanceBadge,
  formatCoordinates,
} from "./waypoint-itinerary";

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

export interface WaypointEditorProps {
  /** The active immutable waypoint plan. */
  plan: WaypointPlan;
  /** Display name of the active exploration region (optional context). */
  regionName?: string;
  /** Whether the active region has reviewed georeferenced scientific map coverage. */
  hasScientificMap?: boolean;
  /** Whether the editor is in read-only mode. */
  readOnly?: boolean;
  /** Whether the interactive map placement tool is currently armed. */
  isPlacingOnMap?: boolean;
  /** Optional ID of the waypoint currently undergoing inline label editing. */
  editingWaypointId?: string | null;
  /** Optional ID of the currently selected/inspected waypoint. */
  selectedWaypointId?: string | null;
  /** Callback invoked when the user updates the plan title. */
  onPlanNameChange?: (name: string) => void;
  /** Callback invoked when the trajectory mode toggles between round_trip and one_way. */
  onModeChange?: (mode: TrajectoryMode, recoveryAssumption?: string) => void;
  /** Callback invoked when the recovery assumption text changes. */
  onRecoveryAssumptionChange?: (recoveryAssumption: string) => void;
  /** Callback invoked when a waypoint is added. */
  onWaypointAdd?: (waypoint: MarsWaypoint, index?: number) => void;
  /** Callback invoked when a waypoint is removed by ID. */
  onWaypointRemove?: (waypointId: string) => void;
  /** Callback invoked when a waypoint is moved up or down. */
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
  /** Callback requesting the parent container to arm/disarm map placement. */
  onRequestMapPlacement?: () => void;
  /** Callback requesting navigation to the science catalog. */
  onExploreScience?: () => void;
  /** Callback invoked when a waypoint item is selected. */
  onSelectWaypoint?: (waypointId: string) => void;
}

// ---------------------------------------------------------------------------
// Manual Coordinate Entry Subcomponent (Stateful)
// ---------------------------------------------------------------------------

export interface ManualCoordinateEntryProps {
  onWaypointAdd: (waypoint: MarsWaypoint, index?: number) => void;
  waypointsLength: number;
}

export function ManualCoordinateEntry({
  onWaypointAdd,
  waypointsLength,
}: ManualCoordinateEntryProps) {
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [manualError, setManualError] = useState("");

  return (
    <details className="manual-coordinates-card" data-testid="manual-coordinates-card">
      <summary className="manual-coordinates-summary">
        <MapPin size={16} aria-hidden="true" />
        <span>Enter coordinates manually</span>
      </summary>
      <form
        className="manual-coordinates-form"
        onSubmit={(e) => {
          e.preventDefault();
          const lat = parseFloat(manualLat);
          const lon = parseFloat(manualLon);
          if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            setManualError("Latitude must be a valid number between -90° and +90°.");
            return;
          }
          if (!Number.isFinite(lon) || lon < 0 || lon > 360) {
            setManualError("Longitude must be a valid East-positive angle between 0° and 360°.");
            return;
          }
          setManualError("");
          const isFirst = waypointsLength === 0;
          const role: WaypointRole = isFirst ? "base" : "intermediate";
          const defaultLabel = isFirst ? "Base Camp" : `Waypoint ${waypointsLength + 1}`;
          const newWp = createWaypoint({
            coordinates: {
              latitude: Number(lat.toFixed(6)),
              longitude_east: Number(lon.toFixed(6)),
            },
            role,
            label: manualLabel.trim() || defaultLabel,
            provenance: "user_planning_input",
          });
          onWaypointAdd(newWp);
          setManualLat("");
          setManualLon("");
          setManualLabel("");
        }}
      >
        <div className="manual-inputs-grid">
          <div>
            <label className="field-label" htmlFor="manual-coord-lat">
              Latitude (°N/S) <span className="required-star">*</span>
            </label>
            <input
              id="manual-coord-lat"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="-4.6500"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="manual-coord-lon">
              East Longitude (°E) <span className="required-star">*</span>
            </label>
            <input
              id="manual-coord-lon"
              type="number"
              step="any"
              min="0"
              max="360"
              value={manualLon}
              onChange={(e) => setManualLon(e.target.value)}
              placeholder="137.4000"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="manual-coord-label">
              Waypoint label (optional)
            </label>
            <input
              id="manual-coord-label"
              type="text"
              maxLength={100}
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              placeholder={waypointsLength === 0 ? "Base Camp" : `Waypoint ${waypointsLength + 1}`}
            />
          </div>
        </div>
        {manualError && (
          <p className="supporting manual-error" role="alert">
            {manualError}
          </p>
        )}
        <button
          type="submit"
          className="file-button add-manual-btn"
          data-testid="add-manual-waypoint-btn"
        >
          <Plus size={16} aria-hidden="true" />
          <span>Add waypoint</span>
        </button>
      </form>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Main Waypoint Editor Component (Pure Function Component)
// ---------------------------------------------------------------------------

export function WaypointEditor({
  plan,
  regionName,
  hasScientificMap = true,
  readOnly = false,
  isPlacingOnMap = false,
  editingWaypointId = null,
  selectedWaypointId = null,
  onPlanNameChange,
  onModeChange,
  onRecoveryAssumptionChange,
  onWaypointAdd,
  onWaypointRemove,
  onWaypointMove,
  onWaypointUpdate,
  onStartEditing,
  onStopEditing,
  onSetOrigin,
  onSetDestination,
  onRequestMapPlacement,
  onExploreScience,
  onSelectWaypoint,
}: WaypointEditorProps) {
  // Validate plan rules using pure M2 validation engine
  const validation = validateWaypointPlan(plan);
  const waypoints = plan.waypoints;
  const originBase = waypoints.length > 0 && waypoints[0].role === "base" ? waypoints[0] : null;
  const lastWaypoint = waypoints.length > 0 ? waypoints[waypoints.length - 1] : null;
  const hasValidDestination =
    lastWaypoint !== null &&
    (lastWaypoint.role === "destination" || lastWaypoint.role === "recovery_endpoint");

  return (
    <div className="waypoint-editor-container" data-testid="waypoint-editor">
      {/* Section Header */}
      <div className="section-intro">
        <span className="eyebrow">Mission setup · Geometric planning</span>
        <h2>Surface Waypoint Plan</h2>
        <p>
          Configure mission base camp, intermediate turn points, and verified science stops.
          {regionName ? ` Context: ${regionName}.` : ""}
        </p>
      </div>

      {/* Plan Name Field */}
      <label className="field-label" htmlFor="waypoint-plan-name">
        Plan identifier / Title
      </label>
      <input
        id="waypoint-plan-name"
        name="waypoint-plan-name"
        type="text"
        maxLength={100}
        value={plan.name}
        disabled={readOnly}
        onChange={(e) => onPlanNameChange?.(e.target.value)}
        autoComplete="off"
        aria-invalid={!plan.name.trim()}
        aria-describedby={!plan.name.trim() ? "plan-name-error" : undefined}
      />
      {!plan.name.trim() && (
        <p id="plan-name-error" className="supporting" role="alert">
          Enter a plan name before saving or reviewing.
        </p>
      )}

      {/* Trajectory Direction Mode Selector */}
      <fieldset className="direction-fieldset">
        <legend>Trajectory traversal mode</legend>
        <div className="segmented" role="radiogroup" aria-label="Trajectory traversal mode">
          <label>
            <input
              type="radio"
              name="trajectory-mode"
              value="round_trip"
              checked={plan.mode === "round_trip"}
              disabled={readOnly}
              onChange={() => onModeChange?.("round_trip", plan.recovery_assumption)}
            />
            <span>Round trip to base</span>
          </label>
          <label>
            <input
              type="radio"
              name="trajectory-mode"
              value="one_way"
              checked={plan.mode === "one_way"}
              disabled={readOnly}
              onChange={() => onModeChange?.("one_way", plan.recovery_assumption)}
            />
            <span>One way traverse</span>
          </label>
        </div>
      </fieldset>

      {/* Plan Validation Messages */}
      {!validation.valid && (
        <div className="error-notice" role="alert" data-testid="validation-errors">
          <div className="notice-header">
            <AlertTriangle size={18} aria-hidden="true" />
            <strong>Plan validation issues ({validation.errors.length})</strong>
          </div>
          <ul className="notice-list">
            {validation.errors.map((err, idx) => (
              <li key={`${err.code}-${idx}`}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="notice warning-notice" role="status" data-testid="validation-warnings">
          <div className="notice-header">
            <Info size={18} aria-hidden="true" />
            <strong>Advisory notices ({validation.warnings.length})</strong>
          </div>
          <div className="supporting">
            <ul className="notice-list">
              {validation.warnings.map((warn, idx) => (
                <li key={`${warn.code}-${idx}`}>{warn.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Origin Base Camp Status Section */}
      <div className="location-field" data-testid="origin-status">
        <Home size={18} aria-hidden="true" />
        <div>
          <strong>Origin Base Camp</strong>
          {originBase ? (
            <div className="origin-details">
              <span className="origin-label">{originBase.label || "Base Camp"}</span>
              <span className="origin-coords mono">{formatCoordinates(originBase.coordinates)}</span>
              <div className="origin-provenance">
                <WaypointProvenanceBadge provenance={originBase.provenance} />
              </div>
            </div>
          ) : (
            <p className="supporting">
              No origin base established. Place a base waypoint or designate an existing stop as Base.
            </p>
          )}
        </div>
      </div>

      {/* One-Way Traverse Requirements (Destination & Recovery) */}
      {plan.mode === "one_way" && (
        <div className="one-way-requirements-section" data-testid="one-way-section">
          {/* Destination Status */}
          <div className="location-field destination-field">
            <Flag size={18} aria-hidden="true" />
            <div>
              <strong>Recovery Terminus</strong>
              {hasValidDestination && lastWaypoint ? (
                <div className="destination-details">
                  <span className="destination-label">
                    {lastWaypoint.label || "Recovery Terminus"}
                  </span>
                  <span className="destination-coords mono">
                    {formatCoordinates(lastWaypoint.coordinates)}
                  </span>
                  <span className="destination-status-ok">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Designated {lastWaypoint.role === "destination" ? "Destination" : "Recovery Endpoint"}
                  </span>
                </div>
              ) : (
                <p className="supporting" role="alert">
                  Missing required destination terminus. Mark the final waypoint as Destination or Recovery Endpoint.
                </p>
              )}
            </div>
          </div>

          {/* Recovery Assumption Input */}
          <label className="field-label" htmlFor="recovery-assumption">
            Recovery assumption <span className="required-star">*</span>
          </label>
          <textarea
            id="recovery-assumption"
            name="recovery-assumption"
            maxLength={2000}
            rows={3}
            disabled={readOnly}
            placeholder="Describe the planned extraction or rendezvous arrangement (e.g. pressurized rover intercept, prepositioned ascent vehicle)..."
            value={plan.recovery_assumption || ""}
            onChange={(e) => onRecoveryAssumptionChange?.(e.target.value)}
            aria-invalid={!plan.recovery_assumption?.trim()}
          />
          <p className="supporting">
            Required for one-way missions. Operational assumption only; does not replace an authorized recovery asset.
          </p>
        </div>
      )}

      {/* Interactive Waypoint Placement Controls */}
      {!readOnly && (
        <div className="waypoint-controls-bar">
          {onRequestMapPlacement && (
            <button
              type="button"
              className={`file-button map-placement-button ${isPlacingOnMap ? "active-placement" : ""}`}
              onClick={onRequestMapPlacement}
              disabled={!hasScientificMap}
              aria-pressed={isPlacingOnMap}
              title={
                !hasScientificMap
                  ? "Map placement requires georeferenced scientific map coverage."
                  : undefined
              }
              data-testid="toggle-map-placement-btn"
            >
              <Crosshair size={17} aria-hidden="true" />
              <span>{isPlacingOnMap ? "Cancel map placement" : "Place waypoint on map"}</span>
            </button>
          )}

          {onExploreScience && (
            <button
              type="button"
              className="file-button"
              onClick={onExploreScience}
              data-testid="editor-explore-science-btn"
            >
              <Compass size={17} aria-hidden="true" />
              <span>Add science stop</span>
            </button>
          )}
        </div>
      )}

      {/* Notice when map placement is unavailable for this region */}
      {!readOnly && !hasScientificMap && (
        <p className="supporting" role="note" data-testid="placement-unavailable-note">
          Map placement requires georeferenced scientific map coverage. Use manual coordinate entry below.
        </p>
      )}

      {/* Manual Coordinate Entry for Accessibility & Non-Mouse Users */}
      {!readOnly && onWaypointAdd && (
        <ManualCoordinateEntry
          onWaypointAdd={onWaypointAdd}
          waypointsLength={waypoints.length}
        />
      )}

      {/* Itinerary Section Heading */}
      <div className="section-heading">
        <h3>Ordered surface stops</h3>
        <Badge tone={waypoints.length > 0 ? "cyan" : "muted"}>
          {waypoints.length} {waypoints.length === 1 ? "stop" : "stops"}
        </Badge>
      </div>

      {/* Nested Waypoint Itinerary Component */}
      <WaypointItinerary
        plan={plan}
        readOnly={readOnly}
        editingWaypointId={editingWaypointId}
        selectedWaypointId={selectedWaypointId}
        onWaypointRemove={onWaypointRemove}
        onWaypointMove={onWaypointMove}
        onWaypointUpdate={onWaypointUpdate}
        onStartEditing={onStartEditing}
        onStopEditing={onStopEditing}
        onSetOrigin={onSetOrigin}
        onSetDestination={onSetDestination}
        onExploreScience={onExploreScience}
        onSelectWaypoint={onSelectWaypoint}
      />

      {/* Scenario Resource Preferences */}
      <details className="constraints">
        <summary>
          Scenario resource preferences <Badge tone="science">Scenario</Badge>
        </summary>
        <p className="supporting">
          Planning preferences only. No supported suit profile or life-support consumable model is connected.
        </p>
        <div className="scenario-prefs-grid">
          <div>
            <label className="field-label" htmlFor="scenario-oxygen">
              Nominal oxygen margin reserve <span className="mono">25%</span>
            </label>
            <input
              type="range"
              id="scenario-oxygen"
              min="10"
              max="50"
              step="5"
              defaultValue="25"
              disabled
            />
          </div>
          <div>
            <label className="field-label" htmlFor="scenario-battery">
              Nominal battery margin reserve <span className="mono">25%</span>
            </label>
            <input
              type="range"
              id="scenario-battery"
              min="10"
              max="50"
              step="5"
              defaultValue="25"
              disabled
            />
          </div>
        </div>
      </details>

      {/* Scientific Baseline Notice */}
      <Notice title="Proposed geometric trajectory">
        Calculations use {GEOMETRIC_TRAJECTORY_LABEL}. No 3D terrain slopes,
        boulder hazards, walking speeds, or life-support consumption models are
        connected. Traversal feasibility remains <strong>Unverified</strong>.
      </Notice>
    </div>
  );
}
