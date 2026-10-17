import type { Metadata } from "next";

import { DemoReset } from "@/features/demo-reset/demo-reset";

export const metadata: Metadata = { title: "Đặt lại dữ liệu thử" };

export default function DemoResetPage() {
  return <DemoReset />;
}
