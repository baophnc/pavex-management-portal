import type { Metadata } from "next";

import { AdminShipmentDetailView } from "@/features/shipments/shipment-detail";

export const metadata: Metadata = { title: "Chi tiết vận đơn" };

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ trackingCode: string }>;
}) {
  const { trackingCode } = await params;
  return <AdminShipmentDetailView trackingCode={decodeURIComponent(trackingCode)} />;
}
