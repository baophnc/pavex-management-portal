import type { Metadata } from "next";

import { ShipmentExceptionQueue } from "@/features/shipments/exception-queue";

export const metadata: Metadata = { title: "Duyệt ngoại lệ & huỷ vận đơn" };

export default function ShipmentExceptionQueuePage() {
  return <ShipmentExceptionQueue />;
}
