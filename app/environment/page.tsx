"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { regionIdSchema, type RegionId } from "@/lib/contracts/region";
import { EnvironmentalConditionsPanel } from "@/components/environment/environmental-conditions-panel";

function EnvironmentContent() {
  const searchParams = useSearchParams();
  const regionParam = searchParams.get("region");
  const parsed = regionIdSchema.safeParse(regionParam);
  const [selectedRegion, setSelectedRegion] = useState<RegionId | null>(null);
  const regionId: RegionId = selectedRegion ?? (parsed.success ? parsed.data : "jezero");

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
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            borderBottom: "1px solid var(--color-border, #334761)",
            paddingBottom: "16px",
          }}
        >
          <div>
            <Link
              href="/"
              style={{
                color: "var(--color-route, #59e3fa)",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              ← Return to Mission Planner
            </Link>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: "700",
                margin: "6px 0 0",
              }}
            >
              Environmental Ground Truth Research Console
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              htmlFor="env-region-select"
              style={{
                fontSize: "13px",
                color: "var(--color-text-muted, #a8b8cd)",
              }}
            >
              Region:
            </label>
            <select
              id="env-region-select"
              value={regionId}
              onChange={(e) => setSelectedRegion(e.target.value as RegionId)}
              style={{
                background: "var(--color-surface, #111d30)",
                color: "var(--color-text, #f0f5fc)",
                border: "1px solid var(--color-control-border, #647c9a)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
              }}
            >
              <option value="jezero">Jezero Crater (Perseverance MEDA)</option>
              <option value="gale">Gale Crater (Curiosity REMS + RAD)</option>
              <option value="oxia">Oxia Planum (Data Unavailable)</option>
            </select>
          </div>
        </div>
        <EnvironmentalConditionsPanel
          regionId={regionId}
          onSelectRegion={setSelectedRegion}
        />
      </div>
    </main>
  );
}

export default function EnvironmentPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "24px", color: "#a8b8cd" }}>
          Loading environmental console…
        </div>
      }
    >
      <EnvironmentContent />
    </Suspense>
  );
}
