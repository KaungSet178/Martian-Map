"use client";

import { ArrowUpRight, Check, Plus } from "lucide-react";
import type { RegionManifest, Target } from "@/lib/contracts/region";
import { Badge, Notice, EvidenceBadge } from "@/components/ui/primitives";

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
                {target.coordinate_verified
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
}: {
  target: Target;
  region: RegionManifest;
  added: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="inline-labels">
        <EvidenceBadge value={target.evidence} />
        <Badge>
          {target.coordinate_verified
            ? "Location verified"
            : "Location unverified"}
        </Badge>
      </div>
      <p className="lead">{target.scientific_goal}</p>
      <h3>Proposed field activity</h3>
      <p>{target.activity}</p>
      {target.routing_eligibility.status === "unavailable" && (
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
      <button className={added ? "full" : "primary full"} onClick={onToggle}>
        {added ? "Remove objective from mission" : "Add objective to mission"}
      </button>
    </>
  );
}
