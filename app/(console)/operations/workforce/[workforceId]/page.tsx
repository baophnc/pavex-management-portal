import type { Metadata } from "next";
import { Suspense } from "react";

import { OperationsWorkforceDetail } from "@/features/operations/workforce-detail";

export const metadata: Metadata = { title: "Chi tiết nhân sự vận hành" };

export default async function OperationsWorkforceDetailPage({ params }: { params: Promise<{ workforceId: string }> }) {
  const { workforceId } = await params;
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải hồ sơ nhân sự...</div>}>
      <OperationsWorkforceDetail workforceId={workforceId} />
    </Suspense>
  );
}
