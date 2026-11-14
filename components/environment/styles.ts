/**
 * Unified Scoped Styles for Marswalk Environmental Conditions
 *
 * Provides a self-contained stylesheet that covers:
 * - Shared Environmental Conditions shell (.env-*)
 * - Gale Crater REMS/RAD components (.gale-env)
 * - Jezero Crater MEDA components (.jz-*)
 * - Oxia Planum deliberate unavailable state (.oxia-*)
 *
 * Adheres strictly to the Marswalk dark space-themed design system,
 * uses CSS custom properties with resilient hex fallbacks,
 * and eliminates horizontal scrolling at desktop, tablet, and mobile widths.
 */

import { jezeroEnvironmentCss } from "./jezero/styles";

export const sharedEnvironmentCss = `
${jezeroEnvironmentCss}

/* Shared Environmental Container & Shell */
.env-container {
  --env-bg: var(--color-bg, #09111f);
  --env-surface: var(--color-surface, #111d30);
  --env-raised: var(--color-surface-raised, #1b2a40);
  --env-border: var(--color-border, #334761);
  --env-control: var(--color-control-border, #647c9a);
  --env-text: var(--color-text, #f0f5fc);
  --env-muted: var(--color-text-muted, #a8b8cd);
  --env-cyan: var(--color-route, #59e3fa);
  --env-science: var(--color-science, #d0bdff);
  --env-caution: var(--color-caution, #ffc36b);
  --env-critical: var(--color-critical, #ff8d9a);
  --env-ok: #7ce0b8;
  --env-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--env-text);
  background: var(--env-surface);
  border: 1px solid var(--env-border);
  border-radius: 12px;
  padding: 20px;
  font-family: Geist, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.5;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.env-container * {
  box-sizing: border-box;
}

/* Common Headings & Badges */
.env-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--env-border);
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.env-eyebrow {
  margin: 0 0 4px;
  font-family: var(--env-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--env-cyan);
}

.env-title {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  margin: 0;
  color: var(--env-text);
  letter-spacing: -0.01em;
}

.env-subtitle {
  color: var(--env-muted);
  font-size: 14px;
  margin: 4px 0 0;
}

.env-head-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.env-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid var(--env-border);
  background: var(--env-raised);
  color: var(--env-muted);
  font-family: var(--env-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.env-tag--verified {
  color: var(--env-ok);
  border-color: rgba(124, 224, 184, 0.4);
}

.env-tag--unavailable {
  color: var(--env-caution);
  border-color: rgba(255, 195, 107, 0.4);
}

/* Common Buttons & Actions */
.env-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid var(--env-control);
  background: var(--env-raised);
  color: var(--env-text);
  font-family: Geist, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  transition: all 120ms ease;
  text-decoration: none;
}

.env-button:hover {
  border-color: var(--env-cyan);
  background: rgba(89, 227, 250, 0.1);
}

.env-button--primary {
  background: var(--env-cyan);
  border-color: var(--env-cyan);
  color: #06212b;
  font-weight: 600;
}

.env-button--primary:hover {
  background: #7ef0ff;
  border-color: #7ef0ff;
}

/* Oxia Planum Scoped Styles */
.oxia-env {
  width: 100%;
}

.oxia-unavailable-card {
  background: rgba(9, 17, 31, 0.6);
  border: 1px solid var(--env-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.oxia-card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.oxia-icon-wrap {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 195, 107, 0.12);
  border: 1px solid rgba(255, 195, 107, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.oxia-icon {
  width: 24px;
  height: 24px;
  color: var(--env-caution);
}

.oxia-main-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--env-text);
  margin: 0 0 4px;
}

.oxia-primary-explanation {
  font-size: 14px;
  color: var(--env-caution);
  font-weight: 500;
  margin: 0;
}

.oxia-safety-notice {
  border: 1px solid rgba(255, 141, 154, 0.35);
  background: rgba(255, 141, 154, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
}

.oxia-safety-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.oxia-safety-icon {
  width: 18px;
  height: 18px;
  color: var(--env-critical);
  flex-shrink: 0;
}

.oxia-safety-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffadb6;
  margin: 0;
}

.oxia-safety-body {
  font-size: 13px;
  color: var(--env-text);
  line-height: 1.5;
  margin: 0;
}

.oxia-context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
}

.oxia-context-card {
  background: var(--env-raised);
  border: 1px solid var(--env-border);
  border-radius: 10px;
  padding: 14px;
}

.oxia-context-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.oxia-context-icon {
  width: 15px;
  height: 15px;
  color: var(--env-cyan);
}

.oxia-context-label {
  font-family: var(--env-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--env-muted);
}

.oxia-context-value {
  font-family: var(--env-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--env-text);
  margin-bottom: 6px;
}

.oxia-context-text {
  font-size: 12.5px;
  color: var(--env-muted);
  line-height: 1.45;
  margin: 0;
}

.oxia-actions-section {
  border-top: 1px solid var(--env-border);
  padding-top: 16px;
}

.oxia-actions-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--env-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 12px;
}

.oxia-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.oxia-provenance-note {
  border-top: 1px solid var(--env-border);
  padding-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: var(--env-muted);
}

.oxia-link-button {
  background: transparent;
  border: none;
  color: var(--env-cyan);
  cursor: pointer;
  font-size: 11.5px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: underline;
}

/* Gale Crater Scoped & Utility Styles */
.gale-env {
  width: 100%;
}

.gale-env .space-y-6 > * + * { margin-top: 1.5rem; }
.gale-env .space-y-4 > * + * { margin-top: 1rem; }
.gale-env .space-y-3 > * + * { margin-top: 0.75rem; }
.gale-env .space-y-2 > * + * { margin-top: 0.5rem; }
.gale-env .space-y-1\\.5 > * + * { margin-top: 0.375rem; }
.gale-env .space-y-1 > * + * { margin-top: 0.25rem; }

.gale-env .grid { display: grid; }
.gale-env .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.gale-env .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.gale-env .gap-2 { gap: 0.5rem; }
.gale-env .gap-2\\.5 { gap: 0.625rem; }
.gale-env .gap-3 { gap: 0.75rem; }
.gale-env .gap-4 { gap: 1rem; }

@media (min-width: 640px) {
  .gale-env .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gale-env .sm\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (min-width: 768px) {
  .gale-env .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gale-env .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .gale-env .md\\:flex-row { flex-direction: row; }
  .gale-env .md\\:items-center { align-items: center; }
  .gale-env .md\\:items-start { align-items: flex-start; }
  .gale-env .md\\:justify-between { justify-content: space-between; }
}

@media (min-width: 1024px) {
  .gale-env .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .gale-env .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

.gale-env .flex { display: flex; }
.gale-env .flex-col { flex-direction: column; }
.gale-env .flex-wrap { flex-wrap: wrap; }
.gale-env .items-center { align-items: center; }
.gale-env .items-start { align-items: flex-start; }
.gale-env .items-baseline { align-items: baseline; }
.gale-env .justify-between { justify-content: space-between; }
.gale-env .justify-center { justify-content: center; }

.gale-env .rounded-2xl { border-radius: 1rem; }
.gale-env .rounded-xl { border-radius: 0.75rem; }
.gale-env .rounded-lg { border-radius: 0.5rem; }
.gale-env .rounded-md { border-radius: 0.375rem; }
.gale-env .rounded-full { border-radius: 9999px; }
.gale-env .rounded { border-radius: 0.25rem; }

.gale-env .border { border: 1px solid var(--env-border); }
.gale-env .border-b { border-bottom: 1px solid var(--env-border); }
.gale-env .border-t { border-top: 1px solid var(--env-border); }
.gale-env .border-slate-800 { border-color: var(--env-border); }
.gale-env .border-slate-700 { border-color: var(--env-control); }

.gale-env .bg-slate-950 { background-color: var(--env-bg); }
.gale-env .bg-slate-900 { background-color: var(--env-surface); }
.gale-env .bg-slate-900\\/40 { background-color: rgba(17, 29, 48, 0.4); }
.gale-env .bg-slate-900\\/50 { background-color: rgba(17, 29, 48, 0.5); }
.gale-env .bg-slate-900\\/60 { background-color: rgba(27, 42, 64, 0.6); }
.gale-env .bg-slate-900\\/80 { background-color: rgba(27, 42, 64, 0.8); }
.gale-env .bg-slate-900\\/90 { background-color: rgba(27, 42, 64, 0.9); }
.gale-env .bg-slate-950\\/40 { background-color: rgba(9, 17, 31, 0.4); }
.gale-env .bg-slate-950\\/70 { background-color: rgba(9, 17, 31, 0.7); }
.gale-env .bg-slate-950\\/90 { background-color: rgba(9, 17, 31, 0.9); }

.gale-env .text-white { color: #ffffff; }
.gale-env .text-slate-100 { color: #f0f5fc; }
.gale-env .text-slate-200 { color: #e2e8f0; }
.gale-env .text-slate-300 { color: #cbd5e1; }
.gale-env .text-slate-400 { color: var(--env-muted); }
.gale-env .text-slate-500 { color: #718096; }

.gale-env .text-sky-300 { color: #7dd3fc; }
.gale-env .text-sky-400 { color: var(--env-cyan); }
.gale-env .text-amber-200 { color: #fde68a; }
.gale-env .text-amber-300 { color: #fcd34d; }
.gale-env .text-amber-400 { color: var(--env-caution); }
.gale-env .text-rose-200 { color: #fecdd3; }
.gale-env .text-rose-300 { color: #fda4af; }
.gale-env .text-rose-400 { color: var(--env-critical); }
.gale-env .text-emerald-300 { color: #6ee7b7; }
.gale-env .text-emerald-400 { color: var(--env-ok); }
.gale-env .text-cyan-300 { color: #67e8f9; }
.gale-env .text-cyan-400 { color: var(--env-cyan); }

.gale-env .font-mono { font-family: var(--env-mono); }
.gale-env .font-sans { font-family: Geist, system-ui, sans-serif; }
.gale-env .font-medium { font-weight: 500; }
.gale-env .font-semibold { font-weight: 600; }
.gale-env .font-bold { font-weight: 700; }
.gale-env .font-black { font-weight: 900; }

.gale-env .p-0\\.5 { padding: 0.125rem; }
.gale-env .p-1 { padding: 0.25rem; }
.gale-env .p-1\\.5 { padding: 0.375rem; }
.gale-env .p-2 { padding: 0.5rem; }
.gale-env .p-2\\.5 { padding: 0.625rem; }
.gale-env .p-3 { padding: 0.75rem; }
.gale-env .p-3\\.5 { padding: 0.875rem; }
.gale-env .p-4 { padding: 1rem; }
.gale-env .p-5 { padding: 1.25rem; }
.gale-env .p-6 { padding: 1.5rem; }
.gale-env .p-8 { padding: 2rem; }
.gale-env .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.gale-env .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
.gale-env .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.gale-env .px-4 { padding-left: 1rem; padding-right: 1rem; }
.gale-env .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.gale-env .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.gale-env .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.gale-env .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.gale-env .pt-2 { padding-top: 0.5rem; }
.gale-env .pt-3 { padding-top: 0.75rem; }
.gale-env .pb-2 { padding-bottom: 0.5rem; }
.gale-env .pb-3 { padding-bottom: 0.75rem; }
.gale-env .pb-4 { padding-bottom: 1rem; }
.gale-env .pb-6 { padding-bottom: 1.5rem; }

.gale-env .text-\\[10px\\] { font-size: 10px; }
.gale-env .text-\\[11px\\] { font-size: 11px; }
.gale-env .text-xs { font-size: 12px; }
.gale-env .text-sm { font-size: 14px; }
.gale-env .text-base { font-size: 16px; }
.gale-env .text-lg { font-size: 18px; }
.gale-env .text-xl { font-size: 20px; }
.gale-env .text-2xl { font-size: 24px; }
.gale-env .text-3xl { font-size: 28px; }

.gale-env .w-full { width: 100%; }
.gale-env .max-w-6xl { max-width: 72rem; }
.gale-env .mx-auto { margin-left: auto; margin-right: auto; }
.gale-env .h-auto { height: auto; }
.gale-env .h-3 { height: 0.75rem; }
.gale-env .w-3 { width: 0.75rem; }
.gale-env .h-3\\.5 { height: 0.875rem; }
.gale-env .w-3\\.5 { width: 0.875rem; }
.gale-env .h-4 { height: 1rem; }
.gale-env .w-4 { width: 1rem; }
.gale-env .h-5 { height: 1.25rem; }
.gale-env .w-5 { width: 1.25rem; }

.gale-env button {
  cursor: pointer;
}

@media (max-width: 768px) {
  .env-container {
    padding: 14px;
    border-radius: 10px;
  }
  .env-title {
    font-size: 20px;
  }
}
`;
