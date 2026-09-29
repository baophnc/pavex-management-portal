import type { Metadata } from "next";

import { CashReview } from "@/features/finance/cash-review";

export const metadata: Metadata = { title: "Duyệt tiền nộp" };

export default function FinanceCashPage() {
  return <CashReview />;
}
