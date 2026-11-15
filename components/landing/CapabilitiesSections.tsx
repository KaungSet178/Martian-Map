import { useState } from 'react';
import {
  ArrowRight,
  Mountain,
  Wind,
  BatteryCharging,
  Clock,
  Radio,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import type { RouteChoice } from './data';
import { useLandingData } from './landing-data';
import { AppScreenshotFrame } from './AppScreenshotFrame';

interface CapabilitiesSectionsProps {
  onOpenRoutePlanner: () => void;
}

const FEASIBILITY_ICONS: Record<string, typeof Mountain> = {
  terrain: Mountain,
  oxygen: Wind,
  battery: BatteryCharging,
  'eva-time': Clock,
  radiation: Radio,
  return: RotateCcw,
};

export function CapabilitiesSections({ onOpenRoutePlanner }: CapabilitiesSectionsProps) {
  const { ROUTE_CATEGORIES, SCIENTIFIC_LAYERS, FEASIBILITY_CHECKS } = useLandingData();
  const [selectedRoute, setSelectedRoute] = useState<RouteChoice>('shortest');
  const [selectedLayerId, setSelectedLayerId] = useState<string>(SCIENTIFIC_LAYERS[0].id);

  const activeLayer =
    SCIENTIFIC_LAYERS.find((l) => l.id === selectedLayerId) ?? SCIENTIFIC_LAYERS[0];

  return (
    <>
      {/* Section 5: Terrain-Aware Route Planning */}
      <section id="features" className="bg-[#FFF9F0] py-20 lg:py-28 border-b border-[#0F2747]/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left: Description & Route Categories */}
            <div className="lg:col-span-5 space-y-6">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
                03 · Route Planning
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">
                Plan Routes With Terrain in Mind.
              </h2>

              <div className="space-y-3 text-base text-[#0F2747]/80 leading-relaxed">
                <p>
                  Terrain conditions play an important role in potential Mars surface exploration.
                  Aresian uses available terrain information, elevation models, and mapped
                  obstacle evidence to screen potential traverse routes.
                </p>
                <p>
                  Within supported Gale and Jezero terrain coverage, compare two experimental
                  route preferences for manually placed waypoints. Validated science-objective routing remains unavailable.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {ROUTE_CATEGORIES.map((category) => {
                  const isActive = category.id === selectedRoute;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedRoute(category.id)}
                      aria-pressed={isActive}
                      className={`w-full text-left p-4 rounded-xl border transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-[#FFE7D1]/70 border-[#FF7A00]'
                          : 'bg-white border-[#0F2747]/12 hover:border-[#0F2747]/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-base text-[#0F2747]">
                          {category.title}
                        </span>
                        <span className="font-mono text-xs text-[#0F2747]/70 tabular-nums">
                          {category.availability}
                        </span>
                      </div>
                      <p className="text-sm text-[#0F2747]/80 mt-1">{category.description}</p>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-[#0F2747]/70 leading-relaxed bg-[#FFE7D1]/45 border border-[#0F2747]/10 rounded-lg p-3.5">
                Route availability and comparison depend on verified data coverage and validated
                models. Unknown terrain is not automatically considered safe.
              </p>

              <button
                type="button"
                onClick={onOpenRoutePlanner}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#FF7A00] hover:bg-[#E56D00] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Discover Route Planning
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Right: Route Comparison Screenshot */}
            <div className="lg:col-span-7">
              <AppScreenshotFrame
                variant="routes"
                activeRouteId={selectedRoute}
                onSelectRoute={setSelectedRoute}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Scientific Data and Layers (Reversed Layout on Cream Tint) */}
      <section
        id="technology"
        className="bg-[#FFE7D1]/45 py-20 lg:py-28 border-b border-[#0F2747]/10"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left: Layer Controls & Provenance Screenshot */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <AppScreenshotFrame
                variant="layers"
                activeLayerId={selectedLayerId}
              />
            </div>

            {/* Right: Data Categories & Transparent Integration Status */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
                04 · Scientific Data &amp; Layers
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">
                Explore Mars Through Scientific Data.
              </h2>

              <div className="space-y-3 text-base text-[#0F2747]/80 leading-relaxed">
                <p>
                  Understand the Martian surface through georeferenced observations and scientific
                  datasets from NASA and ESA missions.
                </p>
                <p>
                  Aresian brings compatible datasets together in a map-centered interface,
                  helping users inspect terrain and available historical environmental observations.
                  This example shows Gale map layers; availability varies by region.
                </p>
              </div>

              <div className="space-y-2">
                {SCIENTIFIC_LAYERS.map((layer) => {
                  const isSelected = layer.id === selectedLayerId;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => setSelectedLayerId(layer.id)}
                      aria-pressed={isSelected}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#0F2747] text-[#FFF9F0] border-[#0F2747]'
                          : 'bg-[#FFF9F0] text-[#0F2747] border-[#0F2747]/12 hover:bg-white'
                      }`}
                    >
                      <span className="text-sm font-medium">{layer.name}</span>
                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border shrink-0 ${
                          isSelected
                            ? 'bg-[#FFF9F0]/15 text-[#FFE7D1] border-[#FFF9F0]/25'
                            : 'bg-[#FFE7D1]/60 text-[#0F2747] border-[#0F2747]/15'
                        }`}
                      >
                        {layer.status}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Dataset Provenance Summary */}
              <div className="rounded-xl bg-[#FFF9F0] border border-[#0F2747]/15 p-4 text-xs space-y-1.5 [&_p]:break-words">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[#0F2747]/10">
                  <span className="font-display font-semibold text-sm text-[#0F2747]">
                    {activeLayer.name}
                  </span>
                  <span className="font-mono text-[11px] text-[#FF7A00] font-semibold">
                    {activeLayer.status}
                  </span>
                </div>
                <p className="text-[#0F2747]/80">
                  <strong className="font-semibold text-[#0F2747]">Source:</strong>{' '}
                  {activeLayer.source}
                </p>
                <p className="text-[#0F2747]/80">
                  <strong className="font-semibold text-[#0F2747]">Date &amp; Resolution:</strong>{' '}
                  {activeLayer.observationDate} · {activeLayer.resolution}
                </p>
                <p className="text-[#0F2747]/80">
                  <strong className="font-semibold text-[#0F2747]">Coverage:</strong>{' '}
                  {(activeLayer.coverage ?? "See source coverage record").split(". ")[0]}.
                </p>
                <p className="text-[#0F2747]/75">
                  <strong className="font-semibold text-[#0F2747]">Limitations:</strong>{' '}
                  {activeLayer.limitations.split(". ")[0]}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Mission Assessment */}
      <section className="bg-[#FFF9F0] py-20 lg:py-28 border-b border-[#0F2747]/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left: Feasibility Screenshot */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <AppScreenshotFrame variant="feasibility" />
            </div>

            {/* Right: Six Mandatory Feasibility Checks */}
            <div className="lg:col-span-5 order-1 lg:order-2 space-y-6">
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
                05 · Feasibility Screening
              </span>

              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">
                Understand Mission Feasibility Before the Mission.
              </h2>

              <div className="space-y-3 text-base text-[#0F2747]/80 leading-relaxed">
                <p>
                  An EVA mission requires careful consideration of terrain, resources, time, and
                  recovery conditions.
                </p>
                <p>
                  Aresian organizes six mission assessment categories to help users
                  review conditional estimates and identify missing evidence. Full operational mission feasibility remains unverified.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FEASIBILITY_CHECKS.map((item, idx) => {
                  const Icon = FEASIBILITY_ICONS[item.id] ?? Mountain;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-[#0F2747]/12 bg-white space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-[#FF7A00] shrink-0" aria-hidden="true" />
                        <span className="font-display font-semibold text-sm text-[#0F2747]">
                          {idx + 1}. {item.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#0F2747]/75 leading-relaxed">{item.summary}</p>
                    </div>
                  );
                })}
              </div>

              {/* Explicit Non-Hue-Only Status Indicators Legend */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Feasible
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                  Caution
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
                  <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Infeasible
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#0F2747]/20 bg-[#FFE7D1]/70 text-[#0F2747] text-xs font-medium">
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  Unverified
                </span>
              </div>

              <p className="text-xs text-[#0F2747]/75 leading-relaxed bg-[#FFE7D1]/50 border border-[#0F2747]/12 rounded-lg p-3.5">
                Feasibility results are modeled planning assessments, not operational safety
                certifications. Missing or unsupported evidence must remain Unverified.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
