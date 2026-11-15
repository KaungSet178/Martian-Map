import { ArrowUpRight, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import type { RegionId } from './data';
import { useLandingData } from './landing-data';
import { AppScreenshotFrame } from './AppScreenshotFrame';
import { SafeMarsImage } from './SafeMarsImage';

interface AboutAndRegionsProps {
  onExploreRegion: (id: RegionId) => void;
}

export function AboutAndRegions({ onExploreRegion }: AboutAndRegionsProps) {
  const { ASSESSMENT_COUNT, MARS_REGIONS } = useLandingData();
  return (
    <>
      {/* Section 3: About Aresian */}
      <section id="overview" className="bg-[#FFF9F0] py-20 lg:py-28 border-b border-[#0F2747]/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#0F2747]/15 pb-3">
                <span className="font-display font-bold text-xs tracking-[0.22em] uppercase text-[#FF7A00]">
                  EXPLORE BEYOND
                </span>
                <span className="font-mono text-xs text-[#0F2747]/60">01 · Overview</span>
              </div>

              <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">
                Exploring Mars, One Mission at a Time.
              </h2>

              <div className="space-y-4 text-base text-[#0F2747]/80 leading-relaxed">
                <p>
                  Planning human exploration on Mars requires more than identifying a destination.
                  Researchers must understand the surrounding terrain, evaluate scientific
                  opportunities, inspect available environmental observations, and consider the
                  constraints of a potential surface mission.
                </p>
                <p>
                  Aresian brings these considerations together in a unified 2D planning
                  environment, making scientific exploration and mission planning more transparent
                  and accessible.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#0F2747]/12">
                <div>
                  <p className="font-display font-bold text-2xl text-[#0F2747] tabular-nums">{MARS_REGIONS.length}</p>
                  <p className="text-xs text-[#0F2747]/70 mt-0.5">
                    Scientifically documented Martian regions
                  </p>
                </div>
                <div>
                  <p className="font-display font-bold text-2xl text-[#FF7A00] tabular-nums">{ASSESSMENT_COUNT}</p>
                  <p className="text-xs text-[#0F2747]/70 mt-0.5">
                    Mission assessment categories
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Target Catalog & Map Interface Screenshot */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7"
            >
              <AppScreenshotFrame variant="catalog" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4: Three Exploration Regions (Full-Width Navy) */}
      <section id="regions" className="bg-[#0F2747] navy-grid-bg text-[#FFF9F0] py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4 mb-12 lg:mb-14">
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
              02 · Study Regions
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-[42px] text-[#FFF9F0] leading-tight">
              Three Regions. One Exploration Platform.
            </h2>
            <p className="text-base text-[#FFE7D1]/85 leading-relaxed">
              Explore three important Martian regions through a shared planning experience, with
              region-specific scientific observations, terrain data, and documented exploration
              targets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {MARS_REGIONS.map((region) => (
              <article
                key={region.id}
                className="flex flex-col justify-between rounded-xl border border-[#FFF9F0]/15 bg-[#09192F]/70 overflow-hidden transition-transform duration-200 hover:-translate-y-1"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-[#182B49] overflow-hidden border-b border-[#FFF9F0]/12">
                    <SafeMarsImage
                      src={region.image}
                      alt={region.imageAlt}
                      regionName={region.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0F2747]/90 border border-[#FFF9F0]/20 text-[11px] font-mono text-[#FFE7D1]">
                      <MapPin className="w-3 h-3 text-[#FF7A00] shrink-0" aria-hidden="true" />
                      <span>{region.locationBadge}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-display font-bold text-xl text-[#FFF9F0]">
                        {region.index} – {region.name}
                      </h3>
                    </div>

                    <p className="text-xs font-mono text-[#FF7A00]">
                      {region.explorationStatus}
                    </p>

                    <p className="text-sm text-[#FFE7D1]/80 leading-relaxed">{region.summary}</p>

                    <ul className="space-y-2 pt-2 border-t border-[#FFF9F0]/12 text-sm text-[#FFF9F0]/90">
                      {region.highlights.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-snug">
                          <span
                            aria-hidden="true"
                            className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] mt-2 shrink-0"
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2">
                  <button
                    type="button"
                    onClick={() => onExploreRegion(region.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#FFF9F0] border border-[#FFF9F0]/30 hover:border-[#FF7A00] hover:bg-[#FF7A00] hover:text-white rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap"
                  >
                    Explore Region
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
