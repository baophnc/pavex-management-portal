import type { Metadata } from "next";

import { DashboardOverview } from "@/features/dashboard/dashboard-overview";

export const metadata: Metadata = { title: "Bảng điều hành" };

export default function DashboardPage() {
  return <DashboardOverview />;
}
