import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsAssignments } from "@/features/operations/assignments";

export const metadata: Metadata = { title: "Phân công vận hành" };

export default function OperationsAssignmentsPage() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải assignments...</div>}>
      <OperationsAssignments />
    </Suspense>
  );
}
