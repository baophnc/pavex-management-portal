import type { Metadata } from "next";

import { NetworkOverview } from "@/features/network/overview";

export const metadata: Metadata = { title: "Network" };

export default function NetworkPage() {
  return <NetworkOverview />;
}
