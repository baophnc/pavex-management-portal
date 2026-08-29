import type { Metadata } from "next";

import { NetworkRegions } from "@/features/network/regions";

export const metadata: Metadata = { title: "Network Regions" };

export default function NetworkRegionsPage() {
  return <NetworkRegions />;
}
