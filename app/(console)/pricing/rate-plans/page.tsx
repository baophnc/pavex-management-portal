import type { Metadata } from "next";

import { PricingRatePlans } from "@/features/pricing/rate-plans";

export const metadata: Metadata = { title: "Bảng giá" };

export default function PricingRatePlansPage() {
  return <PricingRatePlans />;
}
