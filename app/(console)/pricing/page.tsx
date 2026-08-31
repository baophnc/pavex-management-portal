import type { Metadata } from "next";

import { PricingOverview } from "@/features/pricing/overview";

export const metadata: Metadata = { title: "Bảng giá & cước" };

export default function PricingPage() {
  return <PricingOverview />;
}
