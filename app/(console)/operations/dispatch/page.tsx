import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsDispatch } from "@/features/operations/dispatch";

export const metadata: Metadata = { title: "Dispatch & outbox" };

export default function OperationsDispatchPage() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải dispatch...</div>}>
      <OperationsDispatch />
    </Suspense>
  );
}
