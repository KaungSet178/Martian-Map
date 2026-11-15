"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { AboutAndRegions } from "./AboutAndRegions";
import { CapabilitiesSections } from "./CapabilitiesSections";
import { WorkflowAndFooter } from "./WorkflowAndFooter";
import type { LandingData, RegionId } from "./data";
import { LandingDataContext } from "./landing-data";

export function LandingPage({ content }: { content: LandingData }) {
  const router = useRouter();
  const [region, setRegion] = useState<RegionId>("jezero");
  const openPlanner = (id: RegionId = region, panel?: string) => {
    const query = new URLSearchParams({ region: id });
    if (panel) query.set("panel", panel);
    router.push(`/planner?${query}`);
  };
  return (
    <LandingDataContext value={content}>
    <MotionConfig reducedMotion="user">
      <div className="aresian-landing">
        <div className="min-h-screen bg-[#FFF9F0] text-[#0F2747] selection:bg-[#FF7A00] selection:text-white">
          <a href="#landing-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-[#FFF9F0] focus:p-4">Skip to main content</a>
          <Navbar onOpenPlanner={() => openPlanner()} />
          <main id="landing-content" tabIndex={-1}>
            <HeroSection activeRegionId={region} onSelectRegion={setRegion} onOpenPlanner={() => openPlanner()} />
            <AboutAndRegions onExploreRegion={id => openPlanner(id)} />
            <CapabilitiesSections onOpenRoutePlanner={() => openPlanner("gale", "plan")} />
            <WorkflowAndFooter onOpenPlanner={() => openPlanner()} />
          </main>
        </div>
      </div>
    </MotionConfig>
    </LandingDataContext>
  );
}
