import type { Metadata } from "next";

import { Settlements } from "@/features/finance/settlements";

export const metadata: Metadata = { title: "Đối soát cửa hàng" };

export default function FinanceSettlementsPage() {
  return <Settlements />;
}
