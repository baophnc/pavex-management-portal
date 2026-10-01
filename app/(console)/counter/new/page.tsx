import type { Metadata } from "next";

import { CounterShipmentForm } from "@/features/counter/counter-shipment-form";

export const metadata: Metadata = { title: "Gửi hàng tại quầy" };

export default function CounterNewPage() {
  return <CounterShipmentForm />;
}
