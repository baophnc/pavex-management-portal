import type { Metadata } from "next";
import { Suspense } from "react";

import { MerchantDetail } from "@/features/partners/merchant-detail";

export const metadata: Metadata = { title: "Hồ sơ Merchant" };

function Fallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center rounded-xl border bg-card text-xs font-bold text-muted-foreground">
      Đang tải hồ sơ Merchant...
    </div>
  );
}

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  return (
    <Suspense fallback={<Fallback />}>
      <MerchantDetail merchantId={merchantId} />
    </Suspense>
  );
}
