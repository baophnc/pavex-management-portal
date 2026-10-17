import { ApiError, apiRequest } from "@/lib/api/client";

export type DemoResetResult = {
  service: string;
  clearedTables: string[];
  purgedMessages: number;
};

export type DemoResetStep = {
  key: string;
  label: string;
  path: string;
};

/**
 * Shipment goes first: once its outbox is empty no new event reaches the other services, so the
 * ones after it only have what is already there to forget.
 */
export const demoResetSteps: DemoResetStep[] = [
  { key: "shipment", label: "Vận đơn, kiện, lượt quét, giao hàng, sự cố", path: "v1/admin/shipments/demo-reset" },
  { key: "operations", label: "Việc đã phân công", path: "v1/admin/operations/demo-reset" },
  { key: "network", label: "Chỗ đã giữ trên tuyến", path: "v1/admin/network/demo-reset" },
  { key: "pricing", label: "Báo giá", path: "v1/admin/pricing/demo-reset" },
  { key: "fleet", label: "Chuyến xe và điểm GPS", path: "v1/fleet/admin/demo-reset" },
  { key: "billing", label: "Tiền thu, phiếu nộp, đối soát, hoá đơn", path: "v1/admin/billing/demo-reset" },
  { key: "notifications", label: "Thông báo", path: "v1/notifications/admin/demo-reset" },
];

export function runDemoResetStep(step: DemoResetStep) {
  return apiRequest<DemoResetResult>(step.path, { method: "POST" });
}

/** The backend leaves the endpoint out entirely unless PAVEX_DEMO_RESET_ENABLED=true. */
export function isDemoResetDisabled(reason: unknown) {
  return reason instanceof ApiError && reason.status === 404;
}

export function demoResetErrorMessage(reason: unknown) {
  if (reason instanceof ApiError) {
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Chỉ quản trị hệ thống được đặt lại dữ liệu thử.";
    if (reason.status === 404) return "Service này chưa bật chức năng đặt lại.";
    if (reason.status >= 500) return "Service đang lỗi hoặc chưa chạy.";
    return reason.message;
  }
  return "Không đặt lại được.";
}
