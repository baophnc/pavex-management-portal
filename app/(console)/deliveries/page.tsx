import type { Metadata } from "next";

import { CourierDeliveries } from "@/features/deliveries/courier-deliveries";

export const metadata: Metadata = { title: "Giao hàng" };

export default function DeliveriesPage() {
  return <CourierDeliveries />;
}
