import type { Metadata } from "next";

import { PricingAudit } from "@/features/pricing/audit";

export const metadata: Metadata = { title: "Nhật ký giá cước" };

export default function PricingAuditPage() {
  return <PricingAudit />;
}
