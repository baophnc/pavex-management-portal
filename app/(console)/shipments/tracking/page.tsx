import type { Metadata } from "next";

import { ShipmentTracking } from "@/features/shipments/tracking";

export const metadata: Metadata = { title: "Tra hành trình" };

export default async function ShipmentTrackingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const codes = Array.isArray(params.codes) ? params.codes.join(",") : (params.codes ?? "");
  return <ShipmentTracking initialCodes={codes} />;
}
