import type { Metadata } from "next";
import { Suspense } from "react";

import { IdentityUserDetail } from "@/features/identity/user-detail";

export const metadata: Metadata = { title: "Chi tiết tài khoản" };

function Fallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-xl border bg-card text-xs font-bold text-muted-foreground">
      Đang tải chi tiết tài khoản...
    </div>
  );
}

export default async function IdentityUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <Suspense fallback={<Fallback />}>
      <IdentityUserDetail userId={userId} />
    </Suspense>
  );
}
