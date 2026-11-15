import type { Metadata } from "next";
import { Planner } from "@/components/planner";

export const metadata: Metadata = { title: "Aresian — Mission planner" };

export default function PlannerPage() {
  return <Planner />;
}
