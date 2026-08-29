import type { Metadata } from "next";

import { NetworkServiceAreas } from "@/features/network/service-areas";

export const metadata: Metadata = { title: "Network Service Areas" };

export default function NetworkServiceAreasPage() {
  return <NetworkServiceAreas />;
}
