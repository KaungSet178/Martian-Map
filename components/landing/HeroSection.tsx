import { ArrowRight, Compass } from 'lucide-react';
import type { RegionId } from './data';
import { AppScreenshotFrame } from './AppScreenshotFrame';

interface HeroSectionProps {
  activeRegionId: RegionId;
  onSelectRegion: (id: RegionId) => void;
  onOpenPlanner: () => void;
}

export function HeroSection({
  activeRegionId,
  onSelectRegion,
  onOpenPlanner,
}: HeroSectionProps) {
  return (
    <section
      id="home"
      className="relative bg-[#FFF9F0] citrus-grid-bg border-b border-[#0F2747]/10 overflow-hidden"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Proposition & Primary Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono font-medium tracking-[0.14em] uppercase text-[#0F2747]/75">
              <Compass className="w-4 h-4 text-[#FF7A00] shrink-0" aria-hidden="true" />
              <span>Scientific Mars Exploration Planning</span>
            </div>

            <h1 className="font-display font-bold text-[#0F2747] text-[clamp(2.25rem,4vw,3.65rem)] leading-[1.06] tracking-tight">
              Plan the Next Generation of{' '}
              <span className="text-[#FF7A00]">Mars Exploration.</span>
            </h1>

            <p className="text-base sm:text-[17px] text-[#0F2747]/85 leading-relaxed max-w-xl">
              Aresian is a map-centered scientific planning platform that helps researchers
              and future exploration planners inspect Mars surface data, identify scientific targets,
              compare experimental terrain routes where supported, and review conditional EVA resource estimates.
            </p>

            <p className="text-sm font-medium text-[#0F2747]/75 leading-relaxed border-t border-[#0F2747]/12 pt-4 max-w-xl">
              Explore three scientifically significant Martian regions through one unified planning
              experience.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={onOpenPlanner}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#FF7A00] hover:bg-[#E56D00] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2747]"
              >
                Explore the Platform
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#overview"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[#0F2747] bg-[#FFE7D1] hover:bg-[#fbd9b8] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2747]"
              >
                Discover Our Approach
              </a>
            </div>

            <p className="text-xs text-[#0F2747]/65 leading-relaxed max-w-md">
              Developed for NASA Space Apps as a scientific research and EVA planning prototype.
              Not a flight-qualified or NASA-certified operational navigation system.
            </p>
          </div>

          {/* Right Column: Live Application Screenshot Frame */}
          <div className="lg:col-span-7">
            <AppScreenshotFrame
              variant="hero"
              activeRegionId={activeRegionId}
              onSelectRegion={onSelectRegion}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
