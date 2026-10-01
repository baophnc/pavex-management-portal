import type { Metadata } from "next";

import { NetworkOverview } from "@/features/network/overview";

export const metadata: Metadata = { title: "Mạng lưới" };

export default function NetworkPage() {
  return <NetworkOverview />;
}
