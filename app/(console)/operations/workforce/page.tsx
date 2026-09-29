import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsWorkforce } from "@/features/operations/workforce";

export const metadata: Metadata = { title: "Nhân sự vận hành" };

export default function OperationsWorkforcePage() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang mở Workforce...</div>}>
      <OperationsWorkforce />
    </Suspense>
  );
}
