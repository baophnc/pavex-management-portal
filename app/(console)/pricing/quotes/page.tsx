import type { Metadata } from "next";

import { PricingQuoteInspector } from "@/features/pricing/quote-inspector";

export const metadata: Metadata = { title: "Chi tiết cách tính cước" };

export default async function PricingQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ quoteId?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuoteId = Array.isArray(params.quoteId) ? params.quoteId[0] : params.quoteId;
  return <PricingQuoteInspector initialQuoteId={rawQuoteId?.trim() ?? ""} />;
}
