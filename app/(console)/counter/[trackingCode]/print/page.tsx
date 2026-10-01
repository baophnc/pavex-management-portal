import type { Metadata } from "next";

import { CounterPrint } from "@/features/counter/counter-print";

export const metadata: Metadata = { title: "In nhãn tại quầy" };

export default async function CounterPrintPage({ params }: PageProps<"/counter/[trackingCode]/print">) {
  const { trackingCode } = await params;
  return <CounterPrint trackingCode={decodeURIComponent(trackingCode)} />;
}
