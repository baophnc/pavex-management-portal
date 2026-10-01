import type { Metadata } from "next";

import { AdminShipments } from "@/features/shipments/shipments";

export const metadata: Metadata = { title: "Vận đơn đã huỷ" };

export default function CancelledShipmentsPage() {
  return <AdminShipments cancelledOnly />;
}
