import type { Metadata } from "next";

import { NotificationCenter } from "@/features/notifications/notification-center";

export const metadata: Metadata = { title: "Thông báo" };

export default function NotificationsPage() {
  return <NotificationCenter />;
}
