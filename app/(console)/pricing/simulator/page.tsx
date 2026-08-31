import type { Metadata } from "next";

import { PricingSimulator } from "@/features/pricing/simulator";

export const metadata: Metadata = { title: "Tính thử cước" };

export default function PricingSimulatorPage() {
  return <PricingSimulator />;
}
