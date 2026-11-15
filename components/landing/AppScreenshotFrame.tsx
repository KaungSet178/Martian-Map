/* eslint-disable @next/next/no-img-element -- These are responsive, local app captures, not remote imagery. */
import type { RegionId, RouteChoice } from "./data";
import { useLandingData } from "./landing-data";

export type ScreenshotVariant = "hero" | "catalog" | "routes" | "layers" | "feasibility";
interface Props {
  variant: ScreenshotVariant;
  activeRegionId?: RegionId;
  onSelectRegion?: (id: RegionId) => void;
  activeRouteId?: RouteChoice;
  onSelectRoute?: (id: RouteChoice) => void;
  activeLayerId?: string;
}

export function AppScreenshotFrame({ variant, activeRegionId = "jezero", onSelectRegion, activeRouteId = "shortest", activeLayerId }: Props) {
  const { MARS_REGIONS } = useLandingData();
  const region = MARS_REGIONS.find(item => item.id === activeRegionId)!;
  const screenshot = variant === "hero" ? `${activeRegionId}-workspace`
    : variant === "routes" ? `gale-route-${activeRouteId}`
    : variant === "layers" ? `gale-layer-${activeLayerId}`
    : variant === "catalog" ? "jezero-catalog" : "gale-assessment";
  const label = variant === "hero" ? `${region.name} workspace`
    : variant === "catalog" ? "Science objectives and source evidence"
    : variant === "routes" ? "Experimental terrain route planning"
    : variant === "layers" ? "Gale scientific layers" : "Mission assessment and missing evidence";
  return (
    <figure className="w-full rounded-xl border border-[#0F2747]/15 bg-[#FFF9F0] shadow-[0_20px_50px_-15px_rgba(15,39,71,0.14)] overflow-hidden">
      <div className="px-4 py-2.5 bg-[#0F2747] text-[#FFF9F0] flex items-center justify-between gap-4 border-b border-[#0F2747]">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center gap-1.5 shrink-0" aria-hidden="true">
            {[1, 2, 3].map(dot => <span key={dot} className="w-2.5 h-2.5 rounded-full bg-[#FFF9F0]/25" />)}
          </span>
          <span className="font-mono text-[10px] sm:text-xs truncate">Aresian · {label}</span>
        </div>
        <span className="font-mono text-[10px] text-[#FFE7D1] shrink-0">Research prototype</span>
      </div>
      {variant === "hero" && (
        <div className="flex gap-1 border-b border-[#0F2747]/15 bg-[#FFE7D1]/40 px-3 py-2" role="group" aria-label="Preview region">
          {MARS_REGIONS.map(item => <button key={item.id} type="button" aria-pressed={item.id === activeRegionId} onClick={() => onSelectRegion?.(item.id)} className={`flex-1 px-2 py-2 rounded-md text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors ${item.id === activeRegionId ? "bg-[#0F2747] text-[#FFF9F0]" : "bg-transparent text-[#0F2747] hover:bg-[#FFE7D1]"}`}>{item.name}</button>)}
        </div>
      )}
      <img src={`/landing/screens/${screenshot}.webp`} width={1280} height={850} alt={`Actual Aresian application: ${label}`} loading={variant === "hero" ? "eager" : "lazy"} fetchPriority={variant === "hero" ? "high" : "auto"} className={`block w-full object-cover object-top bg-[#e4e7ec] ${variant === "hero" ? "aspect-[4/3] sm:aspect-[21/10]" : "aspect-[1280/850]"}`} />
      <figcaption className="border-t border-[#0F2747]/12 px-4 py-3 bg-[#FFF9F0] text-[11px] leading-relaxed text-[#0F2747]/70">
        Actual application capture · {variant === "routes" ? "Experimental research tools; route safety remains unverified." : variant === "feasibility" ? "Conditional estimates do not certify operational feasibility." : "Source provenance and limitations are available in the planner."}
      </figcaption>
    </figure>
  );
}
