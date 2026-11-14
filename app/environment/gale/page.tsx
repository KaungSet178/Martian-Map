import type { Metadata } from "next";
import { GaleEnvironmentalPanel } from "@/components/environment/gale/gale-environmental-panel";
import { sharedEnvironmentCss } from "@/components/environment/styles";

export const metadata: Metadata = {
  title: "Gale Crater Environmental Conditions | Marswalk Planner",
  description:
    "Authentic historical environmental observations for Gale Crater from MSL Curiosity REMS surface weather and RAD ionizing radiation dosimetry.",
};

export default function GaleEnvironmentPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg, #09111f)",
        padding: "24px 16px",
        color: "var(--color-text, #f0f5fc)",
      }}
    >
      <style>{sharedEnvironmentCss}</style>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gap: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "var(--color-text-muted, #a8b8cd)",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
            Marswalk Planner · NASA Space Apps Challenge
          </span>
          <span
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              background: "var(--color-surface, #111d30)",
              border: "1px solid var(--color-border, #334761)",
              color: "var(--color-route, #59e3fa)",
            }}
          >
            Workstream: Gale Environmental Ground Truth (REMS & RAD)
          </span>
        </div>

        <div className="gale-env">
          <GaleEnvironmentalPanel />
        </div>
      </div>
    </main>
  );
}
