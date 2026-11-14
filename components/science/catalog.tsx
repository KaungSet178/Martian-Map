"use client";

import { ArrowUpRight, Check, Plus, Maximize2 } from "lucide-react";
import type { RegionManifest, Target } from "@/lib/contracts/region";
import { Badge, Notice, EvidenceBadge } from "@/components/ui/primitives";
import { isRetiredTarget } from "@/lib/mission/target-lookup";
import { PhotographEvidence } from "./photograph";

export function TargetCatalog({
  region,
  selected,
  stops,
  onInspect,
  onToggle,
}: {
  region: RegionManifest;
  selected: string | null;
  stops: string[];
  onInspect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Science catalog</span>
        <h2>Choose your objectives</h2>
        <p>
          Explore a science question, then add objectives to your draft mission.
        </p>
      </div>
      {region.targets.some((t) => t.evidence === "Scenario") && (
        <Notice title="Scenario objectives">
          Hypothetical activities are labeled Scenario. Published science
          context does not establish a verified waypoint location.
        </Notice>
      )}
      <div className="target-list">
        {region.targets.map((target) => (
          <article
            className={`target-row ${selected === target.id ? "selected" : ""}`}
            key={target.id}
          >
            <div className="target-heading">
              <span className="diamond" />
              <EvidenceBadge value={target.evidence} />
              <span className="supporting">
                {stops.includes(target.id)
                  ? `Stop ${stops.indexOf(target.id) + 1}`
                  : "Not added"}
              </span>
            </div>
            <button
              className="target-title"
              onClick={() => onInspect(target.id)}
            >
              {target.title}
              <ArrowUpRight size={17} aria-hidden="true" />
            </button>
            <p>{target.scientific_goal}</p>
            <div className="target-actions">
              <span className="supporting">
                {target.boundary?.status === "available"
                  ? target.boundary.classification === "mapped"
                    ? "Mapped extent"
                    : target.boundary.classification === "approximate"
                    ? "Approximate area"
                    : "Candidate search region"
                  : target.coordinate_verified
                  ? "Location verified"
                  : "Location unverified"}
              </span>
              <button
                className="small-button"
                aria-label={`${stops.includes(target.id) ? "Remove" : "Add"} ${target.title}`}
                aria-pressed={stops.includes(target.id)}
                onClick={() => onToggle(target.id)}
              >
                {stops.includes(target.id) ? (
                  <Check size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {stops.includes(target.id) ? "Added" : "Add"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function TargetDetails({
  target,
  region,
  added,
  onToggle,
  onFitArea,
}: {
  target: Target;
  region: RegionManifest;
  added: boolean;
  onToggle: () => void;
  onFitArea?: (target: Target) => void;
}) {
  const isRetired = isRetiredTarget(region.id, target.id);
  const boundary = target.boundary?.status === "available" ? target.boundary : null;
  const hasArea = boundary !== null;

  return (
    <>
      <div className="inline-labels">
        <EvidenceBadge value={target.evidence} />
        {target.feature_kind === "geological_area" && (
          <Badge>Geological area</Badge>
        )}
        {hasArea ? (
          <Badge>
            {boundary.classification === "mapped"
              ? "Mapped extent"
              : boundary.classification === "approximate"
              ? "Approximate area"
              : "Candidate search region"}
          </Badge>
        ) : target.coordinates && target.coordinate_verified ? (
          <Badge>Verified point</Badge>
        ) : (
          <Badge>Location unverified</Badge>
        )}
        {isRetired && <Badge tone="muted">Retired scenario</Badge>}
      </div>
      <p className="lead">{target.scientific_goal}</p>
      {isRetired && (
        <Notice title="Retired scenario objective">
          This demonstration objective has been retired from the active
          scientific catalog in milestone G-S2. It is retained only for
          saved-mission backward compatibility and cannot be added to new
          missions.
        </Notice>
      )}
      {target.location_notes && (
        <section aria-label="Location evidence">
          <div className="section-header-row">
            <h3>Geographic location and evidence</h3>
            {hasArea && onFitArea && (
              <button
                type="button"
                className="small-button secondary fit-area-btn"
                onClick={() => onFitArea(target)}
                aria-label={`Fit map to ${target.title} area`}
              >
                <Maximize2 size={14} /> Fit map to area
              </button>
            )}
          </div>
          <p>{target.location_notes}</p>
          {hasArea && (
            <div className="audit-dimensions">
              <h4>Verification dimensions</h4>
              <dl className="dimension-list">
                <div>
                  <dt>Source verification</dt>
                  <dd>
                    {boundary.source_verified ? "Verified" : "Pending"}
                  </dd>
                </div>
                <div>
                  <dt>Processing verification</dt>
                  <dd>
                    {boundary.processing_verified
                      ? "Verified"
                      : "Pending"}
                  </dd>
                </div>
                <div>
                  <dt>Registration verification</dt>
                  <dd>
                    {boundary.registration_verified
                      ? "Verified"
                      : "Unverified (Operations CTX alignment pending)"}
                  </dd>
                </div>
                {boundary.uncertainty_m != null && (
                  <div>
                    <dt>Positional uncertainty</dt>
                    <dd>±{boundary.uncertainty_m} m</dd>
                  </div>
                )}
              </dl>
              {!!boundary.limitations?.length && (
                <ul className="limitations-list">
                  {boundary.limitations.map((lim: string, i: number) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {target.boundary?.status === "unavailable" && (
            <p className="supporting">
              Boundary unavailable: {target.boundary.reason}
            </p>
          )}
        </section>
      )}
      {!!target.photographs?.length && (
        <section aria-label="Ground-level photographs">
          <h3>Ground-level photographs</h3>
          <p className="supporting">
            Photographic association establishes scientific context only; it
            does not verify a target location or geological boundary.
          </p>
          {target.photographs.map((photo) => (
            <PhotographEvidence key={photo.id} photo={photo} />
          ))}
        </section>
      )}
      <h3>Proposed field activity</h3>
      <p>{target.activity}</p>
      {target.feature_kind === "geological_area" && (
        <Notice title="Not an automatic waypoint">
          Geological areas represent regional formations or candidate search
          areas. Waypoints cannot be derived automatically from area centroids.
          To plan an investigation, select a specific destination point within
          the area using the Waypoint Editor.
        </Notice>
      )}
      {target.routing_eligibility.status === "unavailable" &&
        target.feature_kind !== "geological_area" && (
          <Notice title="Not a routable waypoint">
            {target.routing_eligibility.reason} You can save this concept in a
            draft mission.
          </Notice>
        )}
      {target.coordinates && target.coordinate_verified && (
        <p className="mono">
          {target.coordinates.latitude}° planetocentric ·{" "}
          {target.coordinates.longitude_east}° E
        </p>
      )}
      {target.geological_significance && (
        <p>{target.geological_significance}</p>
      )}
      <h3>Supporting evidence</h3>
      {!target.source_ids.length && (
        <p>
          Target source products, dates, resolution and mapped coverage are
          unavailable. The reference below provides mission context only; it
          does not verify this proposed target.
        </p>
      )}
      {region.source_references
        .filter(
          (source) =>
            !target.source_ids.length || target.source_ids.includes(source.id),
        )
        .map((source) => (
          <a
            className="source-link"
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            {source.title}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ))}
      {isRetired && !added ? (
        <button className="secondary full" disabled>
          Retired scenario (cannot be added)
        </button>
      ) : (
        <button
          className={added ? "full" : "primary full"}
          onClick={onToggle}
        >
          {added ? "Remove objective from mission" : "Add objective to mission"}
        </button>
      )}
    </>
  );
}
