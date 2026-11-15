import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/landing-page";
import { landingData } from "@/components/landing/data";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@/components/landing/landing.generated.css";
import "@/components/landing/landing-root.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://martian-map-production-979928bb.up.railway.app"),
  title: "Aresian — Plan Mars exploration with evidence",
  description: "Explore Jezero, Gale and Oxia Planum through scientific maps, source-aware objectives, experimental terrain routes and conditional EVA estimates.",
  openGraph: {
    title: "Aresian — Plan Mars exploration with evidence",
    description: "A scientific Mars exploration planning prototype developed for NASA Space Apps.",
    type: "website",
    images: [{ url: "/landing/screens/jezero-workspace.webp", width: 1280, height: 850, alt: "Aresian Jezero planning workspace" }],
  },
  twitter: { card: "summary_large_image" },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.region !== undefined || params.panel !== undefined) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach(item => query.append(key, item));
      else if (value !== undefined) query.append(key, value);
    }
    redirect(`/planner?${query}`);
  }
  return <LandingPage content={landingData} />;
}
