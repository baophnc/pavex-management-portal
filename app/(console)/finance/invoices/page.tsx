import type { Metadata } from "next";

import { Invoices } from "@/features/finance/invoices";

export const metadata: Metadata = { title: "Hóa đơn Merchant" };

export default function FinanceInvoicesPage() {
  return <Invoices />;
}
