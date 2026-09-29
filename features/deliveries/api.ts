import type { CashCollection, CashRemittance } from "@/features/finance/contracts";
import { ApiError, apiRequest } from "@/lib/api/client";

import type { CourierDelivery, RecordDeliveryAttemptPayload } from "./contracts";

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const deliveriesApi = {
  mine: () => apiRequest<CourierDelivery[]>("deliveries/mine"),
  recordAttempt: (payload: RecordDeliveryAttemptPayload) =>
    apiRequest<unknown>("deliveries/attempts", post(payload)),
  /** Uploads a delivery photo; the returned reference goes into the attempt's evidenceReference. */
  uploadEvidence: async (file: File) => {
    const form = new FormData();
    form.append("file", await shrinkPhoto(file));
    return apiRequest<{ reference: string; sizeBytes: number }>("workforce/evidence", { method: "POST", body: form });
  },
  myCash: () => apiRequest<CashCollection[]>("billing/cash/collections/mine"),
  myRemittances: () => apiRequest<CashRemittance[]>("billing/cash/remittances/mine"),
  submitRemittance: (hubId: string, collectionIds: string[], declaredAmount: number) =>
    apiRequest<CashRemittance>("billing/cash/remittances", post({ hubId, collectionIds, declaredAmount })),
};

const MAX_EDGE_PX = 1600;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Phone cameras produce photos above Shipment's 3 MB evidence limit (and sometimes HEIC), so the
 * photo is redrawn as a JPEG no larger than 1600px before upload. If the browser cannot decode it,
 * the original is sent and Shipment's own type/size check reports the problem.
 */
async function shrinkPhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && ALLOWED_TYPES.has(file.type) && file.size <= 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  return blob ? new File([blob], "delivery-photo.jpg", { type: "image/jpeg" }) : file;
}

const messages: Record<string, string> = {
  invalid_evidence_type: "Ảnh không đúng định dạng. Hãy chụp lại bằng camera (JPG, PNG hoặc WEBP).",
  invalid_evidence_size: "Ảnh quá lớn (tối đa 3 MB). Hãy chụp lại.",
  collection_amount_mismatch: "Số tiền đã thu phải đúng bằng số tiền cần thu. Nếu người nhận không trả đủ, hãy ghi nhận giao không thành công.",
  collection_not_expected: "Kiện này không cần thu tiền.",
  parcel_not_out_for_delivery: "Kiện không còn ở trạng thái đang giao. Hãy tải lại danh sách.",
  delivery_custody_mismatch: "Kiện này không còn do bạn giữ.",
  invalid_delivery_assignment: "Kiện chưa có phân công giao hàng. Liên hệ điều phối bưu cục.",
  shipment_lifecycle_closed: "Vận đơn đã đóng.",
  idempotency_conflict: "Lần ghi nhận này trùng với một lần trước đó. Hãy tải lại danh sách.",
  delivery_attempt_changed: "Kiện vừa được cập nhật ở nơi khác. Hãy tải lại danh sách.",
  invalid_delivery_attempt: "Thiếu thông tin bắt buộc: phương thức, tên người nhận và chứng từ giao hàng.",
  cash_hub_forbidden: "Bạn không phải bưu tá đang hoạt động của bưu cục này.",
  cash_hub_mismatch: "Tiền phải nộp về đúng bưu cục đã giao đơn.",
  cash_collection_not_held: "Có khoản tiền không còn do bạn giữ. Hãy tải lại.",
  cash_remittance_mismatch: "Số tiền nộp phải đúng bằng tổng các khoản đã chọn.",
  cash_collection_not_found: "Không tìm thấy khoản tiền. Hãy tải lại.",
};

export function deliveryErrorMessage(reason: unknown, fallback = "Không thể hoàn tất thao tác.") {
  if (reason instanceof ApiError) {
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không có kết nối mạng. Hãy thử lại khi có sóng.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (reason.status >= 500) return "Hệ thống đang bận. Hãy thử lại sau ít phút.";
  }
  return fallback;
}
