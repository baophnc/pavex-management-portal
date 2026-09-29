import type { Metadata } from "next";

import { FleetTrips } from "@/features/fleet/fleet-trips";

export const metadata: Metadata = { title: "Xe trung chuyển" };

export default function FleetPage() {
  return <FleetTrips />;
}
