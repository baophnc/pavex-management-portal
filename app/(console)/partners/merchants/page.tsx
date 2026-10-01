import type { Metadata } from "next";
import { Suspense } from "react";

import { MerchantManagement } from "@/features/partners/merchants";

export const metadata: Metadata = { title: "Cửa hàng" };

export default function MerchantsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
          Đang mở Partners...
        </div>
      }
    >
      <MerchantManagement />
    </Suspense>
  );
}
