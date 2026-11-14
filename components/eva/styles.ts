/**
 * Scoped styles for the Marswalk Unified EVA Resource Planning Panel.
 *
 * Self-contained stylesheet aligning with the dark space-themed design system.
 * Uses existing CSS variables (--surface, --surface-raised, --text, --border, etc.)
 * with responsive desktop, tablet, and mobile layouts.
 *
 * @module components/eva/styles
 */

export const evaPanelStyles = `
.eva-panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  color: var(--text, #e2e8f0);
  font-family: inherit;
  padding-bottom: 2rem;
}

.eva-header {
  margin-bottom: 0.25rem;
}

.eva-header h2 {
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0.2rem 0;
  color: #fff;
}

.eva-header p {
  font-size: 0.875rem;
  color: var(--text-muted, #94a3b8);
  margin: 0;
}

.eva-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--surface, #0f172a);
  border: 1px solid var(--border, #1e293b);
  border-radius: 8px;
  padding: 1rem;
}

.eva-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}

.eva-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 4px;
}

.eva-badge--estimated {
  background: rgba(14, 165, 233, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(14, 165, 233, 0.35);
}

.eva-badge--assumption {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.eva-badge--unavailable {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.eva-badge--exceeds {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.45);
}

.eva-badge--capacity-ok {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.eva-resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.85rem;
}

.eva-card {
  background: var(--surface-raised, #131d33);
  border: 1px solid var(--border, #223250);
  border-radius: 6px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
  transition: border-color 0.15s ease;
}

.eva-card:hover {
  border-color: #334155;
}

.eva-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.eva-card-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted, #94a3b8);
}

.eva-card-value-container {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0.25rem 0;
}

.eva-card-number {
  font-size: 1.65rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

.eva-card-unit {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.eva-card-capacity-line {
  font-size: 0.75rem;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.eva-card-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.eva-breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.eva-card-note {
  font-size: 0.72rem;
  color: #64748b;
  margin: 0;
  line-height: 1.35;
}

.eva-route-summary-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 0.6rem;
}

.eva-summary-item {
  background: var(--surface-raised, #131d33);
  border: 1px solid var(--border, #223250);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
}

.eva-summary-label {
  font-size: 0.7rem;
  color: var(--text-muted, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.2rem;
}

.eva-summary-value {
  font-size: 0.95rem;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
  color: #f8fafc;
}

.eva-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
}

.eva-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.eva-form-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: #cbd5e1;
}

.eva-select,
.eva-input {
  background: var(--surface-raised, #090d16);
  border: 1px solid var(--border, #223250);
  border-radius: 6px;
  color: #f1f5f9;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.eva-select:focus,
.eva-input:focus {
  border-color: #38bdf8;
}

.eva-select {
  cursor: pointer;
}

.eva-details {
  border: 1px solid var(--border, #223250);
  border-radius: 6px;
  background: var(--surface-raised, #101726);
  overflow: hidden;
}

.eva-details summary {
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  cursor: pointer;
  user-select: none;
  background: rgba(255, 255, 255, 0.02);
}

.eva-details summary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.eva-details-content {
  padding: 1rem;
  border-top: 1px solid var(--border, #223250);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  font-size: 0.82rem;
  line-height: 1.5;
}

.eva-source-item {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.eva-source-title {
  font-weight: 600;
  color: #38bdf8;
  font-size: 0.82rem;
}

.eva-notice-box {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.78rem;
  color: #fde68a;
  line-height: 1.4;
}

.eva-notice-box p {
  margin: 0;
}

@media (max-width: 640px) {
  .eva-resource-grid {
    grid-template-columns: 1fr;
  }
  .eva-route-summary-list {
    grid-template-columns: 1fr 1fr;
  }
  .eva-form-grid {
    grid-template-columns: 1fr;
  }
}
`;
