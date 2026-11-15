"use client";

import { createContext, useContext } from "react";
import type { LandingData } from "./data";

export const LandingDataContext = createContext<LandingData | null>(null);

export function useLandingData() {
  const content = useContext(LandingDataContext);
  if (!content) throw new Error("Landing content provider is required");
  return content;
}
