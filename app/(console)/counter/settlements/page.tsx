import type { Metadata } from "next";

import { CounterSettlements } from "@/features/counter/counter-settlements";

export const metadata: Metadata = { title: "Trả thu hộ tại quầy" };

export default function CounterSettlementsPage() {
  return <CounterSettlements />;
}
