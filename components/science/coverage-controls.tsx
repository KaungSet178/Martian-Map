"use client";

import type { RegionManifest } from "@/lib/contracts/region";
import { layerState, type LayerState, type LayerStates } from "@/lib/map/region-layers";

export function CoverageControls({
  region,
  states,
  onChange,
  onZoom,
  preview,
  presentationMode = "mission_view",
  onPresentationModeChange,
}: {
  region: RegionManifest;
  states: LayerStates;
  onChange: (id: string, change: Partial<LayerState>) => void;
  onZoom: (id: string) => void;
  preview: boolean;
  presentationMode?: "mission_view" | "full_coverage";
  onPresentationModeChange?: (mode: "mission_view" | "full_coverage") => void;
}) {
  const boundaries = region.layers.filter((layer) => layer.zoom_extent && layer.availability === "available");
  if (!boundaries.length) return null;
  return <section className="coverage-controls" aria-label="Terrain data coverage">
    <h3>Terrain data coverage</h3>
    <p className="supporting">Outlines mark the valid display crops, not geological contacts or safety boundaries. Outside is unavailable data. Use a fit action to see the full boundary.</p>
    {onPresentationModeChange && (
      <div className="presentation-mode-control" style={{ marginBottom: 16 }}>
        <label className="field-label" id="presentation-mode-label" style={{ marginBottom: 6, display: "block" }}>
          Presentation footprint
        </label>
        <div className="segmented" role="radiogroup" aria-labelledby="presentation-mode-label">
          <label>
            <input
              type="radio"
              name="presentation-mode"
              value="mission_view"
              checked={presentationMode === "mission_view"}
              onChange={() => onPresentationModeChange("mission_view")}
            />
            <span>Mission View (Default)</span>
          </label>
          <label>
            <input
              type="radio"
              name="presentation-mode"
              value="full_coverage"
              checked={presentationMode === "full_coverage"}
              onChange={() => onPresentationModeChange("full_coverage")}
            />
            <span>Full Data Coverage</span>
          </label>
        </div>
        <p className="supporting" style={{ marginTop: 6 }}>
          {presentationMode === "mission_view"
            ? "Overlays visually restricted to the reviewed optical mission overview footprint (~96.3 km²)."
            : "Complete authentic dataset extent displayed beyond optical overview (141.7 km² regional / 1,665 km² global)."}
        </p>
      </div>
    )}
    {boundaries.map((layer) => {
      const state = layerState(region, states, layer.id);
      const pattern = layer.rendering.kind === "geojson" ? layer.rendering.line_pattern : undefined;
      return <div className="data-product coverage-product" key={layer.id}>
        <label className="check-row">
          <input type="checkbox" checked={state.visible}
            onChange={(event) => onChange(layer.id, { visible: event.target.checked })} />
          <span className={`coverage-swatch ${pattern}`} aria-hidden="true" />
          {layer.display_name}
        </label>
        <p className="supporting">{layer.coverage}</p>
        <button type="button" className="full" disabled={preview}
          onClick={() => onZoom(layer.id)}>
          Zoom to {layer.display_name.toLowerCase()}
        </button>
        {state.visible && <>
          <label className="field-label" htmlFor={`opacity-${layer.id}`}>
            {layer.display_name} opacity <span className="mono">{state.opacity}%</span>
          </label>
          <input id={`opacity-${layer.id}`} type="range" min="0" max="100" value={state.opacity}
            onChange={(event) => onChange(layer.id, { opacity: Number(event.target.value) })} />
          <p className="supporting">{layer.limitations}</p>
        </>}
      </div>;
    })}
    <details className="posting-explanation">
      <summary>Posting and terrain derivative support</summary>
      <p className="supporting">Regional: 30 m nominal posting; 90 m north gradient support. Global-derived: 200 m nominal posting; 600 m north gradient support.</p>
      <p className="supporting">Posting is the spacing of elevation samples. Gradient support is the neighborhood used to calculate slope and hillshade. Neither value independently establishes effective spatial resolution or absolute measurement accuracy. Slope classes are numerical, not safety classes.</p>
    </details>
  </section>;
}
