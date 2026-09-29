import type { Metadata } from "next";

import { ShipmentCaseDetail } from "@/features/shipments/case-detail";

export const metadata: Metadata = { title: "Chi tiết hồ sơ sự cố" };

export default async function ShipmentCaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <ShipmentCaseDetail caseId={caseId} />;
}
