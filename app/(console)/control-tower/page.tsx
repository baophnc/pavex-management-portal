import type { Metadata } from "next";

import { ShipmentControlTower } from "@/features/shipments/control-tower";

export const metadata: Metadata = { title: "Giám sát vận đơn" };

export default function ControlTowerPage() {
  return <ShipmentControlTower />;
}
