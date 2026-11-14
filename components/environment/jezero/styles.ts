/**
 * Scoped styles for the Jezero environmental panel.
 *
 * Deliberately self-contained: the component injects this style element itself
 * so it can be imported anywhere (including a server-rendered screenshot
 * harness) without touching `app/globals.css` or any shared stylesheet. All
 * selectors are namespaced with `jz-` and all design tokens fall back to the
 * Marswalk palette when the app shell does not provide them.
 */
export const jezeroEnvironmentCss = `
.jz-env {
  --jz-bg: var(--color-bg, #09111f);
  --jz-surface: var(--color-surface, #111d30);
  --jz-raised: var(--color-surface-raised, #1b2a40);
  --jz-border: var(--color-border, #334761);
  --jz-control: var(--color-control-border, #647c9a);
  --jz-text: var(--color-text, #f0f5fc);
  --jz-muted: var(--color-text-muted, #a8b8cd);
  --jz-cyan: var(--color-route, #59e3fa);
  --jz-science: var(--color-science, #d0bdff);
  --jz-caution: var(--color-caution, #ffc36b);
  --jz-critical: var(--color-critical, #ff8d9a);
  --jz-ok: #7ce0b8;
  --jz-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--jz-text);
  background: var(--jz-surface);
  border: 1px solid var(--jz-border);
  border-radius: 12px;
  padding: 24px;
  font-family: Geist, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.5;
  container-type: inline-size;
  max-width: 100%;
  overflow-wrap: anywhere;
}
.jz-env * { box-sizing: border-box; }
.jz-env h2, .jz-env h3, .jz-env h4 { margin: 0; font-weight: 600; letter-spacing: -0.01em; }
.jz-env p { margin: 0; }
.jz-env a { color: var(--jz-cyan); }

.jz-head { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: flex-start; justify-content: space-between; }
.jz-eyebrow {
  margin: 0 0 4px; font-family: var(--jz-mono); font-size: 11px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--jz-muted);
}
.jz-title { font-size: 28px; line-height: 1.2; }
.jz-subtitle { color: var(--jz-muted); font-size: 15px; margin-top: 4px; }
.jz-head-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

.jz-tag {
  display: inline-flex; align-items: center; gap: 6px; min-height: 26px;
  padding: 2px 10px; border-radius: 999px; border: 1px solid var(--jz-border);
  background: var(--jz-raised); color: var(--jz-muted);
  font-family: var(--jz-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
  white-space: nowrap;
}
.jz-tag--obs { color: var(--jz-cyan); border-color: rgba(89, 227, 250, 0.45); }
.jz-tag--der { color: var(--jz-science); border-color: rgba(208, 189, 255, 0.45); }

.jz-verify {
  margin-top: 20px; padding: 12px 14px; border: 1px solid var(--jz-border);
  border-radius: 10px; background: rgba(9, 17, 31, 0.55);
  display: grid; gap: 8px 20px; grid-template-columns: repeat(3, minmax(0, 1fr));
}
.jz-verify-item { display: flex; gap: 8px; align-items: flex-start; min-width: 0; }
.jz-dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 6px; flex: none; background: var(--jz-muted); }
.jz-dot--verified { background: var(--jz-ok); box-shadow: 0 0 0 3px rgba(124, 224, 184, 0.16); }
.jz-dot--not_evaluated { background: var(--jz-caution); }
.jz-dot--unverified { background: var(--jz-muted); }
.jz-dot--invalid { background: var(--jz-critical); }
.jz-verify-key { font-family: var(--jz-mono); font-size: 11px; letter-spacing: 0.08em; color: var(--jz-muted); text-transform: uppercase; }
.jz-verify-value { font-size: 13px; font-weight: 600; }
.jz-verify-note { font-size: 12px; color: var(--jz-muted); }

.jz-toolbar {
  margin-top: 20px; display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: flex-end;
  justify-content: space-between;
}
.jz-field { display: grid; gap: 6px; min-width: 0; }
.jz-field-label { font-family: var(--jz-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--jz-muted); }
.jz-sols { display: flex; flex-wrap: wrap; gap: 6px; }
.jz-sol {
  min-height: 36px; padding: 6px 12px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--jz-control); background: var(--jz-raised); color: var(--jz-text);
  font-family: var(--jz-mono); font-size: 13px; font-variant-numeric: tabular-nums;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.jz-sol:hover { border-color: var(--jz-cyan); }
.jz-sol[aria-pressed="true"] { background: var(--jz-cyan); border-color: var(--jz-cyan); color: #06212b; font-weight: 600; }
.jz-sol:focus-visible { outline: 2px solid var(--jz-cyan); outline-offset: 2px; }
.jz-sol-meta { font-size: 12px; color: var(--jz-muted); font-family: var(--jz-mono); font-variant-numeric: tabular-nums; }

.jz-section { margin-top: 28px; }
.jz-section-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; padding-bottom: 8px; border-bottom: 1px solid var(--jz-border); }
.jz-section-title { font-size: 20px; }
.jz-section-note { font-size: 13px; color: var(--jz-muted); }

.jz-cards { margin-top: 16px; display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); }
.jz-card {
  background: var(--jz-raised); border: 1px solid var(--jz-border); border-radius: 10px;
  padding: 14px; display: flex; flex-direction: column; gap: 6px; min-width: 0;
}
.jz-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.jz-card-label { font-size: 13px; color: var(--jz-muted); font-weight: 500; }
.jz-card-value { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.jz-value { font-family: var(--jz-mono); font-variant-numeric: tabular-nums; font-size: 26px; line-height: 1.15; font-weight: 600; }
.jz-unit { font-family: var(--jz-mono); font-size: 12px; color: var(--jz-muted); }
.jz-card-caption { font-size: 12px; color: var(--jz-muted); }
.jz-card-foot { display: flex; flex-wrap: wrap; gap: 2px 10px; font-family: var(--jz-mono); font-size: 11px; color: var(--jz-muted); font-variant-numeric: tabular-nums; }
.jz-spark { display: block; width: 100%; margin: 2px 0; }
.jz-card--empty { border-style: dashed; background: transparent; }

.jz-charts { margin-top: 16px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
.jz-chartcard {
  border: 1px solid var(--jz-border); border-radius: 10px; padding: 14px;
  background: rgba(9, 17, 31, 0.45); display: grid; gap: 8px; min-width: 0;
}
.jz-chartcard--wide { grid-column: 1 / -1; }
.jz-chartcard-head { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; justify-content: space-between; }
.jz-chartcard-title { font-size: 15px; font-weight: 600; }
.jz-chartcard-sub { font-family: var(--jz-mono); font-size: 11px; color: var(--jz-muted); letter-spacing: 0.04em; }
.jz-chartcard-note { font-size: 12px; color: var(--jz-muted); }
.jz-legend { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--jz-muted); }
.jz-legend-item { display: inline-flex; align-items: center; gap: 6px; }
.jz-swatch { width: 10px; height: 10px; border-radius: 2px; flex: none; }

.jz-chart { margin: 0; display: grid; gap: 4px; min-width: 0; }
.jz-chart-frame { display: flex; gap: 8px; align-items: stretch; min-width: 0; }
.jz-chart-yaxis { position: relative; width: 56px; flex: none; font-family: var(--jz-mono); font-size: 11px; color: var(--jz-muted); font-variant-numeric: tabular-nums; text-align: right; }
.jz-chart-yaxis span { position: absolute; right: 0; line-height: 1; }
.jz-chart-yaxis span:nth-child(1) { top: 0; transform: translateY(-40%); }
.jz-chart-yaxis span:nth-child(2) { top: 50%; transform: translateY(-50%); }
.jz-chart-yaxis span:nth-child(3) { bottom: 0; transform: translateY(40%); }
.jz-chart-plot { position: relative; flex: 1 1 auto; min-width: 0; }
.jz-chart-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.jz-chart-grid { stroke: rgba(51, 71, 97, 0.75); stroke-width: 1; }
.jz-chart-unit { position: absolute; top: 2px; right: 4px; font-family: var(--jz-mono); font-size: 10px; color: var(--jz-muted); background: rgba(9, 17, 31, 0.72); padding: 0 4px; border-radius: 3px; }
.jz-chart-xaxis { display: flex; justify-content: space-between; padding-left: 64px; font-family: var(--jz-mono); font-size: 11px; color: var(--jz-muted); font-variant-numeric: tabular-nums; }
.jz-chart-caption { font-size: 11px; color: var(--jz-muted); padding-left: 64px; font-variant-numeric: tabular-nums; }

.jz-empty {
  border: 1px dashed var(--jz-control); border-radius: 10px; padding: 14px;
  background: rgba(9, 17, 31, 0.35); display: grid; gap: 4px;
}
.jz-empty-title { font-size: 14px; font-weight: 600; color: var(--jz-caution); }
.jz-empty-text { font-size: 13px; color: var(--jz-muted); }

.jz-notes { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-top: 16px; }
.jz-note { border: 1px solid var(--jz-border); border-radius: 10px; padding: 12px 14px; background: rgba(9, 17, 31, 0.35); }
.jz-note-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
.jz-note-body { font-size: 12.5px; color: var(--jz-muted); }

.jz-dl { margin: 16px 0 0; display: grid; gap: 10px 24px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.jz-dl div { min-width: 0; }
.jz-dl dt { font-family: var(--jz-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--jz-muted); }
.jz-dl dd { margin: 2px 0 0; font-size: 13px; }

.jz-details { margin-top: 16px; border: 1px solid var(--jz-border); border-radius: 10px; background: rgba(9, 17, 31, 0.35); }
.jz-details > summary {
  cursor: pointer; padding: 12px 14px; font-size: 13px; font-weight: 600;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; list-style: none;
}
.jz-details > summary::-webkit-details-marker { display: none; }
.jz-details > summary::after { content: "+"; font-family: var(--jz-mono); color: var(--jz-muted); }
.jz-details[open] > summary::after { content: "−"; }
.jz-details > summary:focus-visible { outline: 2px solid var(--jz-cyan); outline-offset: -2px; border-radius: 10px; }
.jz-details-body { padding: 0 14px 14px; display: grid; gap: 10px; }
.jz-product {
  display: grid; gap: 2px 12px; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline;
  padding: 8px 0; border-top: 1px solid var(--jz-border); font-size: 12px;
}
.jz-product:first-child { border-top: 0; }
.jz-product-id { font-family: var(--jz-mono); font-size: 11.5px; overflow-wrap: anywhere; }
.jz-product-meta { font-family: var(--jz-mono); font-size: 11px; color: var(--jz-muted); font-variant-numeric: tabular-nums; text-align: right; }
.jz-product a { font-size: 11px; }

.jz-foot {
  margin-top: 20px; padding-top: 12px; border-top: 1px solid var(--jz-border);
  font-size: 12px; color: var(--jz-muted); display: flex; flex-wrap: wrap; gap: 4px 16px;
}
.jz-sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (max-width: 720px) {
  .jz-env { padding: 16px; border-radius: 10px; }
  .jz-title { font-size: 22px; }
  .jz-verify { grid-template-columns: 1fr; }
  .jz-chart-yaxis { width: 46px; }
  .jz-chart-xaxis, .jz-chart-caption { padding-left: 54px; }
  .jz-value { font-size: 22px; }
}
@media (max-width: 420px) {
  .jz-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .jz-card { padding: 11px; }
  .jz-value { font-size: 20px; }
  .jz-chart-yaxis { width: 40px; font-size: 10px; }
  .jz-chart-xaxis, .jz-chart-caption { padding-left: 48px; }
  .jz-chart-xaxis span:nth-child(2), .jz-chart-xaxis span:nth-child(4) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .jz-sol { transition: none; }
}
`;
