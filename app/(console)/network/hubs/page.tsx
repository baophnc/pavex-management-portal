import type { Metadata } from "next";

import { NetworkHubs } from "@/features/network/hubs";

export const metadata: Metadata = { title: "Điểm trung chuyển" };

export default function NetworkHubsPage() {
  return <NetworkHubs />;
}
