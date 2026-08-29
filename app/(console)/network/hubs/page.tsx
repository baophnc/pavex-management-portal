import type { Metadata } from "next";

import { NetworkHubs } from "@/features/network/hubs";

export const metadata: Metadata = { title: "Network Hubs" };

export default function NetworkHubsPage() {
  return <NetworkHubs />;
}
