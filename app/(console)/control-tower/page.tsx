import type { Metadata } from "next";

import { ShipmentControlTower } from "@/features/shipments/control-tower";

export const metadata: Metadata = { title: "Control Tower" };

export default function ControlTowerPage() {
  return <ShipmentControlTower />;
}
