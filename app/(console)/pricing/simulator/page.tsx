import type { Metadata } from "next";

import { PricingSimulator } from "@/features/pricing/simulator";

export const metadata: Metadata = { title: "Mô phỏng tính cước" };

export default function PricingSimulatorPage() {
  return <PricingSimulator />;
}
