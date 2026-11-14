import type { Metadata } from "next";
import { OxiaUnavailablePanel } from "@/components/environment/oxia/oxia-unavailable-panel";

export const metadata: Metadata = {
  title: "Oxia Planum Environmental Conditions | Marswalk Planner",
  description:
    "Scientific status of local surface meteorological observations for Oxia Planum.",
};

export default function OxiaEnvironmentPage() {
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
          maxWidth: "1000px",
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
              color: "var(--color-caution, #ffc36b)",
            }}
          >
            Workstream: Oxia Planum Environmental Status
          </span>
        </div>
        <OxiaUnavailablePanel />
      </div>
    </main>
  );
}
