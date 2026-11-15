/* eslint-disable @next/next/no-img-element -- Existing local project logo. */
import { ArrowRight } from 'lucide-react';
import { useLandingData } from './landing-data';

interface WorkflowAndFooterProps {
  onOpenPlanner: () => void;
}

export function WorkflowAndFooter({ onOpenPlanner }: WorkflowAndFooterProps) {
  const { WORKFLOW_STEPS } = useLandingData();
  return (
    <>
      {/* Section 8: Mission Planning Workflow */}
      <section className="bg-[#FFE7D1]/40 py-20 lg:py-28 border-b border-[#0F2747]/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-3 mb-12 lg:mb-16">
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
              06 · Planning Workflow
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">
              From Scientific Discovery to Mission Planning.
            </h2>
          </div>

          {/* Horizontal Process on Desktop (lg:grid-cols-5), Vertical Timeline on Mobile */}
          <div className="relative">
            {/* Desktop Horizontal Connector */}
            <div
              aria-hidden="true"
              className="hidden lg:block absolute top-6 left-6 right-6 h-px bg-[#0F2747]/20"
            />

            <ol className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-5 relative">
              {WORKFLOW_STEPS.map((item, idx) => (
                <li
                  key={item.step}
                  className="relative flex lg:flex-col gap-4 lg:gap-5 items-start"
                >
                  {/* Vertical Mobile Timeline Connector */}
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="lg:hidden absolute left-6 top-12 bottom-[-24px] w-px bg-[#0F2747]/20"
                    />
                  )}

                  <div className="relative z-10 w-12 h-12 rounded-xl bg-[#0F2747] text-[#FFF9F0] font-mono font-semibold text-sm flex items-center justify-center shrink-0 border-2 border-[#FFF9F0] shadow-xs">
                    <span className="text-[#FF7A00]">{item.step}</span>
                  </div>

                  <div className="bg-[#FFF9F0] border border-[#0F2747]/12 rounded-xl p-5 flex-1 w-full">
                    <h3 className="font-display font-bold text-base text-[#0F2747]">
                      {item.step} – {item.title}
                    </h3>
                    <p className="text-sm text-[#0F2747]/75 leading-relaxed mt-2">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Section 9: Final Call to Action (Navy) */}
      <section className="bg-[#0F2747] navy-grid-bg text-[#FFF9F0] py-20 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">
              Aresian Prototype
            </span>

            <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[#FFF9F0] leading-tight">
              Explore Mars. Plan With Evidence.
            </h2>

            <p className="text-base sm:text-lg text-[#FFE7D1]/85 leading-relaxed">
              Discover a more transparent approach to Martian surface exploration and potential EVA
              mission planning.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <button
                type="button"
                onClick={onOpenPlanner}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#FF7A00] hover:bg-[#E56D00] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFF9F0]"
              >
                Explore Aresian
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>

              <a
                href="#about"
                className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#FFF9F0] border border-[#FFF9F0]/35 hover:bg-[#FFF9F0]/10 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
              >
                Learn About the Project
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section 10: Footer */}
      <footer id="about" className="bg-[#FFF9F0] border-t border-[#0F2747]/12 py-14">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[#0F2747]/12">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5 text-[#0F2747]">
                <img src="/branding/aresian-logo.png" alt="" width={40} height={28} className="w-10 h-7 object-contain shrink-0" />
                <span className="font-display font-bold text-lg tracking-tight">
                  Aresian
                </span>
              </div>
              <p className="text-sm text-[#0F2747]/75 leading-relaxed max-w-md">
                A map-centered scientific Mars surface EVA planning application developed for NASA
                Space Apps to support research, target inspection, route comparison, and transparent
                feasibility screening.
              </p>
              <p className="text-xs text-[#0F2747]/65 leading-relaxed max-w-md">
                Scientific planning and research prototype only. Not a flight-qualified or
                NASA-certified operational navigation system; no official NASA endorsement implied.
              </p>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="font-display font-semibold text-sm text-[#0F2747]">Navigation</h3>
              <ul className="space-y-2 text-sm text-[#0F2747]/75">
                <li>
                  <a href="#home" className="hover:text-[#0F2747] transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#overview" className="hover:text-[#0F2747] transition-colors">
                    Overview
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-[#0F2747] transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#regions" className="hover:text-[#0F2747] transition-colors">
                    Regions
                  </a>
                </li>
                <li>
                  <a href="#technology" className="hover:text-[#0F2747] transition-colors">
                    Technology
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="font-display font-semibold text-sm text-[#0F2747]">Project Scope</h3>
              <ul className="space-y-2 text-sm text-[#0F2747]/75">
                <li>Jezero Crater — Western Delta &amp; Perseverance Context</li>
                <li>Gale Crater — Lower Mount Sharp &amp; Curiosity Context</li>
                <li>Oxia Planum — Planned Rosalind Franklin Orbital Context</li>
              </ul>
              <p className="font-mono text-xs text-[#FF7A00] pt-1">
                NASA Space Apps Challenge Project
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#0F2747]/65">
            <p>© 2026 Aresian. Developed for NASA Space Apps.</p>
            <p>
              Scientific planning prototype · Modeled assessments do not constitute operational
              certification.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
