/**
 * Browser entry for the local preview/screenshot harness.
 *
 * Not part of the Next.js app. It hydrates the statically rendered panel so
 * Playwright can exercise the sol selector and layout at real viewport widths.
 */
import { hydrateRoot } from "react-dom/client";
import { EnvironmentalConditionsPanel } from "@/components/environment/jezero/EnvironmentalConditionsPanel";
import { jezeroEnvironmentalDataset } from "@/lib/environment/jezero/dataset";

const container = document.getElementById("root");
if (!container) throw new Error("preview root element is missing");

hydrateRoot(container, <EnvironmentalConditionsPanel dataset={jezeroEnvironmentalDataset} />);
