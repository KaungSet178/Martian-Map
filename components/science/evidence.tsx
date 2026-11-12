"use client";

import { ArrowUpRight } from "lucide-react";
import { type RegionManifest } from "@/lib/contracts/region";
import { Badge, Notice, EvidenceBadge } from "@/components/ui/primitives";

export function EvidenceDetails({ region }: { region: RegionManifest }) {
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Data register</span>
        <h2>Know the evidence</h2>
        <p>{region.name} · Shared UI fixtures</p>
      </div>
      <Notice title="Scientific integration pending">
        Mission references provide context. They are not integrated imagery,
        target observations, or approved route evidence.
      </Notice>
      <dl className="metadata">
        <div>
          <dt>Data status</dt>
          <dd>
            <EvidenceBadge value="Scenario" />
          </dd>
        </div>
        <div>
          <dt>Dataset version</dt>
          <dd className="mono">{region.dataset_version}</dd>
        </div>
        <div>
          <dt>Latitude</dt>
          <dd>Planetocentric</dd>
        </div>
        <div>
          <dt>Longitude</dt>
          <dd>East-positive, 0–360°</dd>
        </div>
        <div>
          <dt>Projected Mars CRS</dt>
          <dd>Pending source validation</dd>
        </div>
        <div>
          <dt>Coverage / resolution</dt>
          <dd>Unavailable / unaudited</dd>
        </div>
        <div>
          <dt>Routing policy / models</dt>
          <dd>Not connected</dd>
        </div>
      </dl>
      <h3>Mission references</h3>
      {region.source_references.map((source) => (
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
      <h3>Unavailable scientific products</h3>
      {region.layers.map((layer) => (
        <div className="data-product" key={layer.id}>
          <div className="section-heading">
            <strong>{layer.type}</strong>
            <Badge>Pending</Badge>
          </div>
          <p>{layer.limitations}</p>
          <p className="supporting">
            Source product, acquisition date, processing, resolution and
            footprint: unavailable.
          </p>
        </div>
      ))}
      <div className="data-product">
        <strong>Atmosphere, thermal and radiation context</strong>
        <p>
          No applicable products or engineering models are integrated.
          Historical rover observations, if added, must retain their date,
          instrument and measurement location.
        </p>
      </div>
      <h3>Evidence vocabulary</h3>
      <dl className="evidence-vocabulary">
        {Object.entries({
          Observed: "A direct observation or published mission record.",
          Derived: "Calculated from source data with a documented method.",
          Interpreted: "A published scientific classification.",
          Modeled: "An estimate based on documented inputs.",
          Scenario: "A hypothetical object or demonstration input.",
          Unavailable: "Required evidence or coverage is missing.",
        }).map(([label, description]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function LayerManager({
  preview,
  setPreview,
  contours,
  setContours,
  markers,
  setMarkers,
  opacity,
  setOpacity,
  onEvidence,
}: {
  preview: boolean;
  setPreview: (v: boolean) => void;
  contours: boolean;
  setContours: (v: boolean) => void;
  markers: boolean;
  setMarkers: (v: boolean) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  onEvidence: () => void;
}) {
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Map workspace</span>
        <h2>Layers and legend</h2>
        <p>
          Only integrated scientific layers will appear as available map
          controls.
        </p>
      </div>
      <Notice title="No scientific layers connected">
        Optical imagery, terrain, geology and coverage masks are pending.
        Unknown terrain is not safe terrain.
      </Notice>
      <h3>Interface preview</h3>
      <p className="supporting">
        Demonstration controls below affect schematic artwork only.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
        />
        Show schematic preview <Badge tone="science">Scenario</Badge>
      </label>
      {preview && (
        <>
          <label className="check-row">
            <input
              type="checkbox"
              checked={contours}
              onChange={(e) => setContours(e.target.checked)}
            />
            Schematic linework
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={markers}
              onChange={(e) => setMarkers(e.target.checked)}
            />
            Scenario objective markers
          </label>
          <label className="field-label" htmlFor="opacity">
            Linework opacity <span className="mono">{opacity}%</span>
          </label>
          <input
            id="opacity"
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            disabled={!contours}
          />
          <div className="legend-detail">
            {markers && (
              <p>
                <span className="diamond" /> Scenario objective · schematic
                location
              </p>
            )}
            {contours && (
              <p>
                <span className="legend-line" /> Decorative linework · no
                elevation units
              </p>
            )}
            <p>No route or coverage geometry is displayed.</p>
          </div>
        </>
      )}
      <button className="full" onClick={onEvidence}>
        View scientific data register
      </button>
    </>
  );
}
