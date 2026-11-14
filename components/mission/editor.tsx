"use client";

import { ArrowDown, ArrowUp, X, MapPin, CornerDownLeft, Compass } from "lucide-react";
import type { RegionManifest } from "@/lib/contracts/region";
import { moveStop, type Mission } from "@/lib/mission/model";
import { missionPlanningSnapshot } from "@/lib/mission/planning-snapshot";
import { Badge, Notice } from "@/components/ui/primitives";

export function MissionEditor({
  mission,
  region,
  onChange,
  onScience,
  onSwitchToWaypoints,
}: {
  mission: Mission;
  region: RegionManifest;
  onChange: (change: Partial<Mission>) => void;
  onScience: () => void;
  onSwitchToWaypoints?: () => void;
}) {
  const snapshot = missionPlanningSnapshot(mission, region);
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Mission setup</span>
        <h2>Build the field plan</h2>
        <p>Arrange objectives and document your return assumptions.</p>
      </div>
      {onSwitchToWaypoints && (
        <button
          type="button"
          className="file-button"
          onClick={onSwitchToWaypoints}
          style={{ marginBottom: "1rem", width: "100%", justifyContent: "center" }}
          data-testid="switch-to-waypoints-btn"
        >
          <Compass size={17} aria-hidden="true" />
          <span>Switch to Geometric Waypoints View</span>
        </button>
      )}
      <label className="field-label" htmlFor="mission-name">
        Mission name
      </label>
      <input
        id="mission-name"
        name="mission-name"
        maxLength={100}
        value={mission.name}
        onChange={(e) => onChange({ name: e.target.value })}
        autoComplete="off"
        aria-invalid={!mission.name.trim()}
        aria-describedby={
          !mission.name.trim() ? "mission-name-error" : undefined
        }
      />
      {!mission.name.trim() && (
        <p id="mission-name-error" className="supporting">
          Enter a mission name before saving.
        </p>
      )}
      <fieldset className="direction-fieldset">
        <legend>Mission direction</legend>
        <div className="segmented">
          {(
            [
              ["round", "Round trip"],
              ["one", "One way"],
            ] as const
          ).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="direction"
                value={value}
                checked={mission.direction === value}
                onChange={() => onChange({ direction: value })}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="location-field">
        <MapPin size={18} />
        <div>
          <strong>Start location</strong>
          <p>{snapshot.start ? `${snapshot.start.label ?? "Base"} · ${snapshot.start.coordinate_text} · Registration unverified` : "Not designated — select Make Base in Surface Waypoints"}</p>
        </div>
      </div>
      {mission.direction === "one" ? (
        <>
          <div className="location-field">
            <MapPin size={18} />
            <div>
              <strong>Recovery endpoint required</strong>
              <p>{snapshot.destination ? `${snapshot.destination.label ?? "Terminus"} — ${snapshot.destination.coordinate_text} · Registration unverified` : "Not designated — select Make Terminus in Surface Waypoints"}</p>
            </div>
          </div>
          <label className="field-label" htmlFor="recovery">
            Recovery assumption
          </label>
          <textarea
            id="recovery"
            name="recovery"
            maxLength={2000}
            rows={3}
            placeholder="Describe the planned recovery arrangement…"
            value={mission.recovery_assumption}
            onChange={(e) => onChange({ recovery_assumption: e.target.value })}
          />
          <p className="supporting">
            An assumption does not replace a verified recovery location.
          </p>
        </>
      ) : (
        <div className="location-field">
          <CornerDownLeft size={18} />
          <div>
            <strong>Return to start</strong>
            <p>Geometric return is calculated from planned waypoints; operational recovery remains unverified.</p>
          </div>
        </div>
      )}
      <div className="section-heading">
        <h3>Ordered objectives</h3>
        <Badge>
          {mission.target_ids.length}{" "}
          {mission.target_ids.length === 1 ? "objective" : "objectives"}
        </Badge>
      </div>
      {!mission.target_ids.length ? (
        <div className="empty-list">
          <p>No objectives yet.</p>
          <button onClick={onScience}>Explore science catalog</button>
        </div>
      ) : (
        <ol className="itinerary">
          {mission.target_ids.map((id, index) => {
            const target = region.targets.find((t) => t.id === id);
            if (!target) return <li key={id}><strong>{id}</strong><p>Retired or unavailable objective; retained for historical context. Not a route destination.</p><button onClick={() => onChange({target_ids:mission.target_ids.filter(t => t !== id)})}>Remove objective {id}</button></li>;
            return (
              <li key={id}>
                <span className="stop-number mono">{index + 1}</span>
                <div className="stop-copy">
                  <strong>{target.title}</strong>
                  <span>
                    {target.evidence} ·{" "}
                    {target.coordinate_verified
                      ? "Location verified"
                      : "Location unverified"}
                  </span>
                  <div className="stop-actions">
                    <button
                      className="icon-button"
                      aria-label={`Move ${target.title} up`}
                      disabled={index === 0}
                      onClick={() =>
                        onChange({
                          target_ids: moveStop(mission.target_ids, id, -1),
                        })
                      }
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Move ${target.title} down`}
                      disabled={index === mission.target_ids.length - 1}
                      onClick={() =>
                        onChange({
                          target_ids: moveStop(mission.target_ids, id, 1),
                        })
                      }
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${target.title} from itinerary`}
                      onClick={() =>
                        onChange({
                          target_ids: mission.target_ids.filter(
                            (t) => t !== id,
                          ),
                        })
                      }
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <details className="constraints">
        <summary>
          Resource preferences <Badge tone="science">Scenario</Badge>
        </summary>
        <p className="supporting">
          Preferences only. No supported suit profile or consumption model is
          connected.
        </p>
        {(
          [
            ["oxygen_reserve_percent", "Oxygen"],
            ["battery_reserve_percent", "Battery"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="field-label" htmlFor={key}>
              {label} reserve <span className="mono">{mission[key]}%</span>
            </label>
            <input
              type="range"
              id={key}
              min="10"
              max="50"
              step="5"
              value={mission[key]}
              onChange={(e) => onChange({ [key]: Number(e.target.value) })}
            />
          </div>
        ))}
      </details>
      <Notice title="Planning inputs and operational limits">
        {snapshot.countLabel}. Geometric distance: {snapshot.geometric.total_surface_distance_m.toFixed(1)} m. Waypoint edits invalidate prior terrain results. Operational feasibility remains unverified.
      </Notice>
    </>
  );
}
