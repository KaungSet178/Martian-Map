import type { Metadata } from "next";
import { EnvironmentalConditionsPanel } from "@/components/environment/jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";

export const metadata: Metadata = {
  title: "Jezero Crater Environmental Conditions | Marswalk Planner",
  description:
    "Authentic historical environmental observations for Jezero Crater from Mars 2020 Perseverance MEDA surface weather and RDS solar radiation.",
};

export default function JezeroEnvironmentPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--color-bg, #09111f)",
        padding: "24px 16px",
        color: "var(--color-text, #f0f5fc)",
      }}
    >
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
            Workstream: Jezero Environmental Ground Truth (MEDA)
          </span>
        </div>
        <EnvironmentalConditionsPanel dataset={jezeroEnvironmentalDataset} />
      </div>
    </main>
  );
}
