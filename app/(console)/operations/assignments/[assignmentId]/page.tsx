import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsAssignmentDetail } from "@/features/operations/assignment-detail";

export const metadata: Metadata = { title: "Chi tiết phân công" };

export default async function OperationsAssignmentDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải phân công...</div>}>
      <OperationsAssignmentDetail assignmentId={assignmentId} />
    </Suspense>
  );
}
