import { ApiError } from "@/lib/api/client";

const MESSAGES: Record<string, string> = {
  counter_cash_mismatch: "Số tiền mặt đã nhận phải bằng đúng cước khi người gửi trả cước.",
  counter_hub_forbidden: "Bạn không thuộc bưu cục này nên không nhận gửi tại đây được.",
  counter_quote_hub_mismatch: "Báo giá không xuất phát từ bưu cục này. Hãy tính cước lại.",
  quote_invalid_or_expired: "Báo giá đã hết hạn. Hãy tính cước lại.",
  quote_already_used: "Báo giá này đã dùng cho một vận đơn khác. Hãy tính cước lại.",
  quote_location_mismatch: "Địa chỉ đã đổi so với lúc tính cước. Hãy tính cước lại.",
  quote_parcel_mismatch: "Kiện hàng đã đổi so với lúc tính cước. Hãy tính cước lại.",
  invalid_address: "Kiểm tra lại tên, số điện thoại và địa chỉ người gửi, người nhận.",
  invalid_parcel_contents: "Mỗi kiện cần mô tả hàng và số lượng hợp lệ.",
  invalid_shipment_weight: "Cân nặng hoặc kích thước kiện không hợp lệ.",
  idempotency_conflict: "Yêu cầu tạo đơn bị trùng. Hãy tải lại trang rồi tạo lại.",
  network_reservation_mismatch: "Tuyến vận chuyển vừa thay đổi. Hãy tính cước lại.",
  invalid_phone: "Số điện thoại không đúng định dạng Việt Nam.",
  invalid_location: "Phường/xã không thuộc tỉnh/thành đã chọn.",
  counter_phone_mismatch: "Số điện thoại không khớp với người gửi của vận đơn này.",
  counter_settlement_done: "Khoản này đã được xử lý rồi.",
  counter_settlement_modified: "Có người vừa xử lý khoản này. Tải lại để kiểm tra.",
  cash_hub_forbidden: "Bạn không thuộc bưu cục này nên không xử lý tiền tại đây được.",
};

export function counterErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError)) return fallback;
  if (reason.code && MESSAGES[reason.code]) return MESSAGES[reason.code];
  if (reason.status === 403) return "Tài khoản không có quyền nhận gửi tại quầy.";
  return reason.message || fallback;
}
