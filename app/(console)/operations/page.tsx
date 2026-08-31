import type { Metadata } from "next";

import { OperationsOverview } from "@/features/operations/overview";

export const metadata: Metadata = { title: "Điều phối vận hành" };

export default function OperationsPage() {
  return <OperationsOverview />;
}
