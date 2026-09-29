import type { Metadata } from "next";

import { SupportInbox } from "@/features/support/support-inbox";

export const metadata: Metadata = { title: "Yêu cầu hỗ trợ" };

export default function SupportPage() {
  return <SupportInbox />;
}
