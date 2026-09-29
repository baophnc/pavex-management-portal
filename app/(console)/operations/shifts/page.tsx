import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsShifts } from "@/features/operations/shifts";

export const metadata: Metadata = { title: "Ca làm việc" };

export default function OperationsShiftsPage() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải ca làm việc...</div>}>
      <OperationsShifts />
    </Suspense>
  );
}
