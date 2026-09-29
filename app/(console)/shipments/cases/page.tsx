import type { Metadata } from "next";
import { Suspense } from "react";

import { ShipmentCases } from "@/features/shipments/cases";

export const metadata: Metadata = { title: "Hồ sơ sự cố" };

export default function ShipmentCasesPage() {
  return (
    <Suspense fallback={<div className="grid min-h-64 place-items-center text-sm text-muted-foreground">Đang tải shipment cases...</div>}>
      <ShipmentCases />
    </Suspense>
  );
}
