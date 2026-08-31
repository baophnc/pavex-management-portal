import type { Metadata } from "next";

import { NetworkServiceAreas } from "@/features/network/service-areas";

export const metadata: Metadata = { title: "Vùng phục vụ" };

export default function NetworkCoveragePage() {
  return <NetworkServiceAreas />;
}
