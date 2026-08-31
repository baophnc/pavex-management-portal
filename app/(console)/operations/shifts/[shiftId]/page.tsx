import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsShiftDetail } from "@/features/operations/shift-detail";

export const metadata: Metadata = { title: "Chi tiết ca làm việc" };

export default async function OperationsShiftDetailPage({ params }: { params: Promise<{ shiftId: string }> }) {
  const { shiftId } = await params;
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải chi tiết ca...</div>}>
      <OperationsShiftDetail shiftId={shiftId} />
    </Suspense>
  );
}
