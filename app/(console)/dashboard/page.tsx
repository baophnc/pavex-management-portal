import type { Metadata } from "next";

import { SessionCard } from "@/features/auth/session-card";

export const metadata: Metadata = { title: "Tổng quan" };

export default function DashboardPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <SessionCard />
    </main>
  );
}
