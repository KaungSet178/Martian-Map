"use client";

import { CoverageControls } from "./coverage-controls";
import { ProductMetadata } from "./product-metadata";
import { ArrowUpRight } from "lucide-react";
import { type RegionManifest } from "@/lib/contracts/region";
import { Badge, Notice, EvidenceBadge } from "@/components/ui/primitives";
import {
  layerState,
  type LayerStates,
  type LayerState,
} from "@/lib/map/region-layers";

export function EvidenceDetails({ region }: { region: RegionManifest }) {
  return (
    <>
      <div className="section-intro">
        <span className="eyebrow">Data register</span>
        <h2>Know the evidence</h2>
        <p>
          {region.name} ·{" "}
          {region.data_status === "illustrative"
            ? "Shared UI fixtures"
            : region.data_status}
        </p>
      </div>
      {region.data_status === "illustrative" && (
        <Notice title="Scientific integration pending">
          Mission references provide context. They are not integrated imagery,
          target observations, or approved route evidence.
        </Notice>
      )}
      <dl className="metadata">
        <div>
          <dt>Data status</dt>
          <dd>
            <Badge>{region.data_status}</Badge>
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
          <dd>{region.coordinate_system.projected_crs}</dd>
        </div>
        <div>
          <dt>Coverage / resolution</dt>
          <dd>
            {region.capabilities.terrain_coverage.status} ·{" "}
            {region.capabilities.terrain_coverage.reason}
          </dd>
        </div>
        <div>
          <dt>Routing policy / models</dt>
          <dd>{region.capabilities.validated_routing.reason}</dd>
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
      <h3>Scientific products</h3>
      {region.layers.map((layer) => (
        <div className="data-product" key={layer.id}>
          <div className="section-heading">
            <strong>{layer.display_name}</strong>
            <Badge>{layer.availability}</Badge>
          </div>
          <p>{layer.limitations}</p>
          <ProductMetadata layer={layer} />
          <p className="supporting">
            Source: {layer.source_id ?? "unavailable"} · Date:{" "}
            {layer.observation_date ?? "unavailable"} · Resolution:{" "}
            {layer.data_details ? "effective resolution unmeasured; posting documented separately" : layer.spatial_resolution_m === null
              ? "unavailable"
              : `${layer.spatial_resolution_m} m`}{" "}
            · Coverage: {layer.coverage ?? "unavailable"}
          </p>
        </div>
      ))}
      {region.contextual_datasets.map((dataset) => (
        <div className="data-product" key={dataset.id}>
          <strong>{dataset.name}</strong>
          <p>{dataset.availability.reason}</p>
          <p>{dataset.limitations}</p>
        </div>
      ))}
      <h3>Source provenance</h3>
      {region.source_references.map((source) => (
        <dl className="metadata" key={source.id}>
          <div>
            <dt>{source.title}</dt>
            <dd>
              {source.agency ?? "Agency unavailable"} ·{" "}
              {source.instrument ?? "Instrument unavailable"}
            </dd>
          </div>
          <div>
            <dt>Product / acquisition</dt>
            <dd>
              {source.product_id ?? "Unavailable"} ·{" "}
              {source.acquisition_date ?? "Date unavailable"}
              {source.sol !== null && ` · Sol ${source.sol}`}
            </dd>
          </div>
          <div>
            <dt>Processing and limitations</dt>
            <dd>
              {[...source.processing_notes, ...source.limitations].join(" ") ||
                "Unavailable"}
            </dd>
          </div>
        </dl>
      ))}
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
  region,
  layerStates,
  onLayerChange,
  preview,
  setPreview,
  contours,
  setContours,
  markers,
  setMarkers,
  opacity,
  setOpacity,
  onEvidence,
  onZoomToCoverage,
}: {
  region: RegionManifest;
  layerStates: LayerStates;
  onLayerChange: (id: string, change: Partial<LayerState>) => void;
  preview: boolean;
  setPreview: (v: boolean) => void;
  contours: boolean;
  setContours: (v: boolean) => void;
  markers: boolean;
  setMarkers: (v: boolean) => void;
  opacity: number;
  setOpacity: (v: number) => void;
  onEvidence: () => void;
  onZoomToCoverage: (id: string) => void;
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
      <CoverageControls region={region} states={layerStates} onChange={onLayerChange}
        onZoom={onZoomToCoverage} preview={preview} />
      {region.map.visualization.status === "unavailable" ? (
        <Notice title="No scientific layers connected">
          Optical imagery, terrain, geology and coverage masks are pending.
          Unknown terrain is not safe terrain.
        </Notice>
      ) : (
        region.layers
          .filter((l) => l.availability === "available" && !l.zoom_extent)
          .map((layer) => {
            const state = layerState(region, layerStates, layer.id);
            return (
              <div key={layer.id} className="data-product">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={state.visible}
                    onChange={(e) =>
                      onLayerChange(layer.id, { visible: e.target.checked })
                    }
                  />
                  {layer.display_name}
                  <EvidenceBadge value={layer.evidence} />
                </label>
                {state.visible && (
                  <>
                    <label
                      className="field-label"
                      htmlFor={`opacity-${layer.id}`}
                    >
                      {layer.display_name} opacity{" "}
                      <span className="mono">{state.opacity}%</span>
                    </label>
                    <input
                      id={`opacity-${layer.id}`}
                      type="range"
                      min="0"
                      max="100"
                      value={state.opacity}
                      onChange={(e) =>
                        onLayerChange(layer.id, {
                          opacity: Number(e.target.value),
                        })
                      }
                    />
                    {layer.legend && (
                      <div className="legend-detail">
                        <strong>
                          {layer.legend.title}
                          {layer.legend.units ? ` (${layer.legend.units})` : ""}
                        </strong>
                        {layer.legend.items.map((item) => (
                          <div key={item.label}>
                            <p>
                            <span
                              aria-hidden="true"
                              style={{
                                backgroundColor: item.color,
                                width: 16,
                                height: 12,
                              }}
                            />
                            {item.label}
                            </p>
                            {item.description && <p className="supporting">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="supporting">
                      {layer.attribution} · {layer.limitations}
                    </p>
                    {layer.coverage && <p className="supporting">Coverage: {layer.coverage}</p>}
                    <ProductMetadata layer={layer} />
                  </>
                )}
              </div>
            );
          })
      )}
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
