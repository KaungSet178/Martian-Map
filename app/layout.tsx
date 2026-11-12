import type { Metadata, Viewport } from "next";
import "@fontsource/geist/400.css";
import "@fontsource/geist/500.css";
import "@fontsource/geist/600.css";
import "@fontsource/geist/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marswalk — Mission planner",
  description:
    "Evidence-aware, pre-mission Mars exploration planning. A research interface, not operational navigation.",
};
export const viewport: Viewport = { themeColor: "#09111F" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
