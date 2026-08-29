import type { Metadata } from "next";

import { NetworkCoverage } from "@/features/network/coverages";

export const metadata: Metadata = { title: "Network Coverage" };

export default function NetworkCoveragePage() {
  return <NetworkCoverage />;
}
