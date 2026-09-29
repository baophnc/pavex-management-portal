import { ApiError, apiRequest } from "@/lib/api/client";

import type {
  SupportRequestDetail,
  SupportRequestKind,
  SupportRequestPage,
  SupportRequestStatus,
} from "./contracts";

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export type SupportFilters = {
  page: number;
  status: SupportRequestStatus | "";
  kind: SupportRequestKind | "";
  mine: boolean;
  search: string;
};

export const supportApi = {
  list: (filters: SupportFilters) => {
    const query = new URLSearchParams({ page: String(filters.page), pageSize: "20" });
    if (filters.status) query.set("status", filters.status);
    if (filters.kind) query.set("kind", filters.kind);
    if (filters.mine) query.set("mine", "true");
    if (filters.search.trim()) query.set("search", filters.search.trim());
    return apiRequest<SupportRequestPage>(`admin/support/requests?${query}`);
  },
  counts: () => apiRequest<{ new: number; inProgress: number }>("admin/support/requests/counts"),
  get: (id: string) => apiRequest<SupportRequestDetail>(`admin/support/requests/${encodeURIComponent(id)}`),
  changeStatus: (id: string, status: SupportRequestStatus, note?: string) =>
    apiRequest<SupportRequestDetail>(`admin/support/requests/${encodeURIComponent(id)}/status`, post({ status, note: note || null })),
  assign: (id: string, assigneeUserId: string | null) =>
    apiRequest<SupportRequestDetail>(`admin/support/requests/${encodeURIComponent(id)}/assignee`, post({ assigneeUserId })),
  /** Opened in a new tab through the BFF, which adds the staff session. */
  attachmentUrl: (id: string, attachmentId: string) =>
    `/api/backend/admin/support/requests/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}`,
};

const messages: Record<string, string> = {
  support_request_not_found: "Không tìm thấy yêu cầu này.",
  support_request_state: "Không thể đổi trạng thái như vậy. Khi đánh dấu đã xử lý hoặc đóng, hãy ghi rõ đã làm gì.",
  support_request_changed: "Yêu cầu vừa được người khác cập nhật. Hãy tải lại rồi thử lại.",
  support_assign_self_only: "Bạn chỉ có thể tự nhận xử lý cho mình.",
  support_request_taken: "Yêu cầu này vừa được người khác nhận xử lý. Hãy tải lại để xem.",
};

export function supportErrorMessage(reason: unknown, fallback = "Không thể hoàn tất thao tác.") {
  if (reason instanceof ApiError) {
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (reason.status >= 500) return "Hệ thống đang bận. Hãy thử lại sau.";
  }
  return fallback;
}
