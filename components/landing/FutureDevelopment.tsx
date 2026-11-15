import { Compass, MapPin, BatteryCharging, Files } from "lucide-react";

const priorities = [
  {
    title: "Geographic and terrain validation",
    description: "Validate geographic registration, coordinate systems, data coverage and hazard thresholds.",
    Icon: Compass,
  },
  {
    title: "Science-objective verification",
    description: "Complete evidence-based verification of Gale and Jezero science-objective locations.",
    Icon: MapPin,
  },
  {
    title: "Resource and feasibility models",
    description: "Improve resource models and mission-feasibility assessments while keeping assumptions visible.",
    Icon: BatteryCharging,
  },
  {
    title: "Offline planning and reporting",
    description: "Expand offline access, mission revalidation and report generation.",
    Icon: Files,
  },
];

export function FutureDevelopment() {
  return (
    <section id="future-development" aria-labelledby="future-development-title" className="bg-[#FFF9F0] py-20 lg:py-28 border-b border-[#0F2747]/10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-3 mb-12 lg:mb-14">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-[#FF7A00] font-semibold block">07 · Looking ahead</span>
          <h2 id="future-development-title" className="font-display font-bold text-3xl sm:text-4xl text-[#0F2747] leading-tight">Future development</h2>
          <p className="text-base text-[#0F2747]/80 leading-relaxed">Our next steps focus on stronger scientific verification, clearer assumptions, and more useful planning tools.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {priorities.map(({ title, description, Icon }) => (
            <article key={title} className="rounded-xl border border-[#0F2747]/12 bg-[#FFE7D1]/30 p-6 space-y-3">
              <Icon className="w-6 h-6 text-[#FF7A00]" aria-hidden="true" />
              <h3 className="font-display font-bold text-lg text-[#0F2747]">{title}</h3>
              <p className="text-sm text-[#0F2747]/80 leading-relaxed">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
