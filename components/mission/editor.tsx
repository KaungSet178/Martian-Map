"use client";

import { ArrowDown, ArrowUp, X, MapPin, CornerDownLeft, Compass } from "lucide-react";
import type { RegionManifest } from "@/lib/contracts/region";
import { moveStop, type Mission } from "@/lib/mission/model";
import { findTarget, isRetiredTarget } from "@/lib/mission/target-lookup";
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
          <p>Unavailable · No verified base or coverage</p>
        </div>
      </div>
      {mission.direction === "one" ? (
        <>
          <div className="location-field">
            <MapPin size={18} />
            <div>
              <strong>Recovery endpoint required</strong>
              <p>No verified endpoint can be selected yet.</p>
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
            <p>Return geometry awaits verified locations.</p>
          </div>
        </div>
      )}
      <div className="section-heading">
        <h3>Ordered objectives</h3>
        <Badge>
          {mission.target_ids.length}{" "}
          {mission.target_ids.length === 1 ? "stop" : "stops"}
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
            const target = findTarget(region, id);
            const isRetired = isRetiredTarget(region.id, id);
            const title = target?.title ?? `Unknown objective (${id})`;
            return (
              <li key={id}>
                <span className="stop-number mono">{index + 1}</span>
                <div className="stop-copy">
                  <div className="stop-title-row">
                    <strong>{title}</strong>
                    {isRetired && <Badge tone="muted">Retired</Badge>}
                  </div>
                  <span>
                    {target?.evidence ?? "Unknown"} ·{" "}
                    {isRetired
                      ? "Scenario retired from active catalog"
                      : target?.coordinate_verified
                      ? "Location verified"
                      : "Location unverified"}
                  </span>
                  <div className="stop-actions">
                    <button
                      className="icon-button"
                      aria-label={`Move ${title} up`}
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
                      aria-label={`Move ${title} down`}
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
                      aria-label={`Remove ${title} from itinerary`}
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
      <Notice title="Calculations unavailable">
        Draft edits invalidate previous results. No distance, time, consumption
        or return margin is calculated from these objectives.
      </Notice>
    </>
  );
}
