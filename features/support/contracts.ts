export type SupportRequestKind = "CONTACT" | "SUPPORT" | "CLAIM" | "CAREER";
export type SupportRequestStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type SupportRequestAction = "SUBMITTED" | "STATUS_CHANGED" | "ASSIGNED" | "UNASSIGNED";

export type SupportRequestSummary = {
  id: string;
  code: string;
  kind: SupportRequestKind;
  status: SupportRequestStatus;
  fullName: string;
  email: string;
  topic: string;
  trackingCode: string | null;
  assigneeUserId: string | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupportRequestPage = {
  content: SupportRequestSummary[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
};

export type SupportAttachment = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};

export type SupportRequestEvent = {
  action: SupportRequestAction;
  actorUserId: string | null;
  fromStatus: SupportRequestStatus | null;
  toStatus: SupportRequestStatus | null;
  note: string | null;
  createdAt: string;
};

export type SupportRequestDetail = Omit<SupportRequestSummary, "attachmentCount"> & {
  phone: string | null;
  incidentDate: string | null;
  claimedAmount: number | null;
  portfolioUrl: string | null;
  message: string;
  submittedByUserId: string | null;
  resolutionNote: string | null;
  closedAt: string | null;
  version: number;
  attachments: SupportAttachment[];
  events: SupportRequestEvent[];
};

export const supportKindLabels: Record<SupportRequestKind, string> = {
  CONTACT: "Liên hệ",
  SUPPORT: "Hỗ trợ",
  CLAIM: "Khiếu nại",
  CAREER: "Ứng tuyển",
};

export const supportStatusLabels: Record<SupportRequestStatus, string> = {
  NEW: "Mới",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
  CLOSED: "Đã đóng",
};

export function supportEventLabel(event: SupportRequestEvent) {
  switch (event.action) {
    case "SUBMITTED":
      return "Khách gửi yêu cầu";
    case "ASSIGNED":
      return "Nhận xử lý";
    case "UNASSIGNED":
      return "Trả lại hàng chờ";
    case "STATUS_CHANGED":
      return event.toStatus ? `Chuyển sang “${supportStatusLabels[event.toStatus] ?? event.toStatus}”` : "Đổi trạng thái";
  }
}
