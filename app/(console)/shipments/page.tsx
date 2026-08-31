import type { Metadata } from "next";

import type { ShipmentLifecycleStatus, ShipmentStatus } from "@/features/shipments/contracts";
import { SHIPMENT_LIFECYCLE_STATUSES, SHIPMENT_STATUSES } from "@/features/shipments/contracts";
import { AdminShipments } from "@/features/shipments/shipments";

export const metadata: Metadata = { title: "Vận đơn" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawStatus = first(params.status)?.trim() ?? "";
  const rawLifecycle = first(params.lifecycleStatus)?.trim() ?? "";
  const status = SHIPMENT_STATUSES.includes(rawStatus as ShipmentStatus)
    ? (rawStatus as ShipmentStatus)
    : "";
  const lifecycleStatus = SHIPMENT_LIFECYCLE_STATUSES.includes(rawLifecycle as ShipmentLifecycleStatus)
    ? (rawLifecycle as ShipmentLifecycleStatus)
    : "";

  return (
    <AdminShipments
      initialQuery={first(params.q)?.trim() ?? ""}
      initialStatus={status}
      initialLifecycleStatus={lifecycleStatus}
      initialMerchantId={first(params.merchantId)?.trim() ?? ""}
    />
  );
}
