import type { Metadata, Viewport } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/geist/800.css";
import "@fontsource/geist/900.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aresian — Mission planner",
  applicationName: "Aresian",
  icons: { icon: "/branding/aresian-logo.png", apple: "/branding/aresian-logo.png" },
  description:
    "Evidence-aware, pre-mission Mars exploration planning. A research interface, not operational navigation.",
};
export const viewport: Viewport = { themeColor: "#0F2747" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
