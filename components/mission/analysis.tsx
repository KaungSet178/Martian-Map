"use client";

import type { TerrainRoute } from "@/lib/routing/contracts";
import { Shield, Timer, Microscope, LockKeyhole } from "lucide-react";
import { assessments, type RegionManifest } from "@/lib/contracts/region";
import type { Mission } from "@/lib/mission/model";
import { routeAvailability } from "@/lib/api/planning";
import { Badge, Notice } from "@/components/ui/primitives";

export function RouteComparison({
  mission,
  region,
  online,
  onEvidence,
  terrainRoute,
  onTerrainRouting,
}: {
  mission: Mission;
  region: RegionManifest;
  online: boolean;
  onEvidence: () => void;
  terrainRoute?: TerrainRoute | null;
  onTerrainRouting?: () => void;
}) {
  const availability = routeAvailability(mission, region, online);
  const icons = [Shield, Timer, Microscope];
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Mission assessment</span>
        <h2>Review route readiness</h2>
        <p>
          Routes become comparable when the same verified inputs support each
          objective.
        </p>
      </div>
      {terrainRoute ? <Notice title="Terrain route computed - absolute registration unverified">
        <p>{terrainRoute.preference === "shortest" ? "Shortest distance" : "Lower terrain cost"}: {terrainRoute.distanceMeters?.toFixed(1)} m 3D DEM distance; {terrainRoute.horizontalDistanceMeters?.toFixed(1)} m horizontal Mars distance. Source: {terrainRoute.sourceDatasetIds.join(", ")}.</p>
        <p>This research path does not establish the science-objective readiness or operational assessments below.</p>
        <button onClick={onTerrainRouting}>Inspect terrain alternatives and scenario estimates</button>
      </Notice> : <Notice title="Detailed routing unavailable">
        No candidate paths have been calculated. You can continue editing and saving this draft.
      </Notice>}
      <div className="route-list">
        {availability.objectives.map((objective, i) => {
          const Icon = icons[i];
          return (
            <div className="route-item" key={objective.id}>
              <Icon size={21} aria-hidden="true" />
              <div>
                <strong>{objective.name}</strong>
                <p>{objective.requirement}</p>
              </div>
              <LockKeyhole size={16} aria-label="Unavailable" />
            </div>
          );
        })}
      </div>
      <h3>What is missing</h3>
      <ul className="missing-list">
        {availability.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <FeasibilityPanel hasTerrain={!!terrainRoute} />
      <button className="full" onClick={onEvidence}>
        Inspect data and limitations
      </button>
    </>
  );
}
export function FeasibilityPanel({hasTerrain=false}:{hasTerrain?:boolean}={}) {
  return (
    <section className="feasibility">
      <div className="section-heading">
        <h3>Mission feasibility</h3>
        <Badge tone="caution">Unverified</Badge>
      </div>
      <p className="supporting">
        All six checks require evidence. No operational safety determination is
        available.
      </p>
      <dl>
        {assessments.map((label) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>Unverified</dd>
          </div>
        ))}
      </dl>
      <p className="supporting">
        {hasTerrain ? "Terrain distance and path-grade estimates are available above. Validated EVA time, oxygen, battery, radiation dose and return margin remain unavailable." : "Distance, EVA time, slope, oxygen, battery, radiation dose and return margin: unavailable."}
      </p>
    </section>
  );
}
