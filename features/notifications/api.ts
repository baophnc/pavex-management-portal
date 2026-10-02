import { apiRequest } from "@/lib/api/client";

export type NotificationCategory = "Shipment" | "Operations" | "Account" | "Billing" | "System";
export type NotificationSeverity = "Info" | "Success" | "Warning" | "Critical";
export type MessageAudience = "HUB_STAFF" | "HUB_COURIERS" | "HUB_DRIVERS" | "HUB_EVERYONE" | "SHIPMENT_SHOP";

export type UserNotification = {
  id: string;
  code: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  body: string;
  actionUrl: string | null;
  subjectType: string | null;
  subjectId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  senderUserId: string | null;
};

export type NotificationPage = { items: UserNotification[]; nextCursor: string | null; unreadCount: number };

export type MessageOptions = {
  hubIds: string[];
  allHubs: boolean;
  audiences: MessageAudience[];
  canMessageShops: boolean;
};

export type SentMessage = {
  id: string;
  audience: MessageAudience;
  hubId: string | null;
  trackingCode: string | null;
  title: string;
  body: string;
  recipientCount: number;
  createdAt: string;
};

export const audienceLabels: Record<MessageAudience, string> = {
  HUB_STAFF: "Nhân viên bưu cục",
  HUB_COURIERS: "Bưu tá",
  HUB_DRIVERS: "Tài xế trung chuyển",
  HUB_EVERYONE: "Tất cả mọi người ở bưu cục",
  SHIPMENT_SHOP: "Shop gửi vận đơn",
};

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

/** Tells the bell to refresh after a change made somewhere else on the page. */
export function announceNotificationsChanged() {
  window.dispatchEvent(new Event("pavex-management:notifications"));
}

export const notificationsApi = {
  list: (status: "all" | "unread" | "read", cursor?: string | null) => {
    const query = new URLSearchParams({ status, limit: "20" });
    if (cursor) query.set("cursor", cursor);
    return apiRequest<NotificationPage>(`notifications?${query}`);
  },
  unreadCount: () => apiRequest<{ count: number }>("notifications/unread-count"),
  setRead: (id: string, read: boolean) =>
    apiRequest<UserNotification>(`notifications/${encodeURIComponent(id)}/${read ? "read" : "unread"}`, { method: "PATCH" }),
  readAll: () => apiRequest<{ updatedCount: number }>("notifications/read-all", { method: "POST" }),
  options: () => apiRequest<MessageOptions>("notifications/messages/options"),
  sendToHub: (input: { audience: MessageAudience; hubId: string; title: string; body: string }) =>
    apiRequest<SentMessage>("notifications/messages/hub", json(input)),
  sendAboutShipment: (input: { trackingCode: string; body: string }) =>
    apiRequest<SentMessage>("notifications/messages/shipment", json(input)),
  sent: () => apiRequest<SentMessage[]>("notifications/messages/sent?limit=30"),
};

const errors: Record<string, string> = {
  message_not_allowed: "Bạn không được gửi thông báo này tới bưu cục đó.",
  no_recipients: "Bưu cục không có ai thuộc nhóm đã chọn.",
  shipment_unknown: "Không tìm thấy vận đơn này (hoặc vận đơn tạo trước khi có hệ thống thông báo).",
  sender_has_no_account: "Đơn gửi tại quầy: người gửi không có tài khoản. Hãy gọi điện cho khách.",
  operations_unavailable: "Chưa lấy được danh sách nhân sự. Thử lại sau ít phút.",
};

export function notificationErrorMessage(reason: unknown, fallback: string) {
  const code = (reason as { code?: string | null } | null)?.code;
  return (code && errors[code]) || fallback;
}

/** "5 phút trước", "Hôm qua 14:20" … */
export function timeAgo(value: string) {
  const at = new Date(value);
  const minutes = Math.round((Date.now() - at.getTime()) / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return at.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
