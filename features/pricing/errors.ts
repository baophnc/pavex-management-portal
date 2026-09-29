import { ApiError } from "@/lib/api/client";

const messages: Record<string, string> = {
  active_rate_plan_not_found: "Chưa có bảng giá đang áp dụng cho thời điểm hiện tại.",
  active_rate_plan_ambiguous: "Có nhiều bảng giá cùng áp dụng tại thời điểm này. Hãy kiểm tra lại khoảng hiệu lực.",
  multiple_active_rate_plans: "Có nhiều bảng giá đang áp dụng chồng lấn thời gian.",
  active_rate_plan_overlap: "Khoảng hiệu lực của bảng giá này đang chồng lấn một bảng giá đã áp dụng. Hãy tải lại trang rồi áp dụng lại để thay thế bảng giá cũ.",
  rate_plan_replacement_gap: "Bảng giá mới kết thúc sớm hơn bảng giá đang áp dụng, sau đó sẽ không còn bảng giá nào. Hãy bỏ hoặc lùi ngày kết thúc của bảng giá mới.",
  rate_plan_replacement_starts_later: "Có bảng giá đã lên lịch bắt đầu sau thời điểm này nên không thể thay thế. Hãy ngừng bảng giá đã lên lịch đó trước.",
  rate_plan_not_found: "Không tìm thấy bảng giá.",
  rate_plan_revision_exists: "Mã bảng giá và số phiên bản này đã tồn tại.",
  rate_plan_immutable: "Chỉ bản nháp mới được sửa. Hãy tạo phiên bản mới từ bảng giá đang áp dụng.",
  rate_plan_not_active: "Chỉ bảng giá đang áp dụng mới có thể ngừng áp dụng.",
  rate_plan_rules_incomplete: "Chưa thể áp dụng bảng giá vì chưa đủ 6 quy tắc giá cho Tiêu chuẩn/Nhanh ở 3 phạm vi.",
  rate_rule_not_found: "Không tìm thấy quy tắc giá.",
  invalid_eta_range: "Số ngày giao tối đa phải lớn hơn hoặc bằng số ngày giao tối thiểu.",
  invalid_effective_window: "Thời điểm kết thúc phải sau thời điểm bắt đầu.",
  invalid_cod_limits: "Ngưỡng miễn phí thu hộ không được lớn hơn số tiền thu hộ tối đa.",
  invalid_insurance_limits: "Ngưỡng bảo hiểm miễn phí không được lớn hơn giá trị khai báo tối đa.",
  invalid_weight_limits: "Khối lượng tính cước tối đa của đơn phải lớn hơn hoặc bằng khối lượng tối đa mỗi kiện.",
  rate_plan_changed: "Bảng giá vừa được người khác thay đổi. Hãy tải lại dữ liệu trước khi lưu tiếp.",
  pricing_conflict: "Thay đổi này xung đột với dữ liệu bảng giá hiện có.",
  location_required: "Vui lòng chọn đầy đủ tỉnh/thành và xã/phường của điểm gửi, điểm nhận.",
  invalid_location: "Địa chỉ không hợp lệ theo danh mục hoặc không khớp tỉnh/thành đã chọn.",
  location_not_covered: "Điểm gửi hoặc nhận chưa nằm trong phạm vi mạng lưới đang phục vụ.",
  origin_not_covered: "Điểm gửi chưa nằm trong phạm vi mạng lưới đang phục vụ.",
  destination_not_covered: "Điểm nhận chưa nằm trong phạm vi mạng lưới đang phục vụ.",
  network_authentication_failed: "Dịch vụ tính cước không xác thực được với dịch vụ mạng lưới.",
  network_authorization_failed: "Dịch vụ mạng lưới từ chối yêu cầu tính cước.",
  network_invalid_response: "Dịch vụ mạng lưới trả dữ liệu không hợp lệ cho việc tính cước.",
  network_unavailable: "Không thể kết nối dịch vụ mạng lưới. Hãy thử lại sau.",
  parcel_required: "Cần ít nhất một kiện hàng để tính cước.",
  invalid_parcel_count: "Mỗi lần tính cước hỗ trợ từ 1 đến 20 kiện hàng.",
  invalid_weight: "Khối lượng kiện hàng không nằm trong giới hạn của bảng giá hiện tại.",
  invalid_dimensions: "Kích thước kiện hàng không nằm trong giới hạn của bảng giá hiện tại.",
  shipment_too_large: "Tổng khối lượng tính cước vượt giới hạn của bảng giá hiện tại.",
  invalid_cod_amount: "Số tiền thu hộ vượt giới hạn của bảng giá hiện tại.",
  invalid_declared_value: "Giá trị khai báo vượt giới hạn của bảng giá hiện tại.",
  rate_rule_missing: "Bảng giá đang áp dụng thiếu quy tắc cần thiết để tính cước.",
  audit_log_not_found: "Không tìm thấy bản ghi nhật ký giá cước.",
  pricing_calculation_overflow: "Không thể tính cước an toàn với dữ liệu đã nhập.",
  invalid_request: "Dữ liệu nhập chưa hợp lệ hoặc vượt giới hạn tính cước hiện tại.",
  pricing_quote_not_found: "Không tìm thấy dữ liệu tính cước cần đối chiếu.",
  pricing_quote_expired: "Kết quả tính cước đã hết hiệu lực và không thể dùng cho vận đơn mới.",
};

export function pricingErrorMessage(reason: unknown, fallback = "Thao tác giá cước thất bại.") {
  if (reason instanceof ApiError) {
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 429) {
      return reason.retryAfterSeconds !== null
        ? `Quá nhiều yêu cầu. Hãy thử lại sau khoảng ${reason.retryAfterSeconds} giây.`
        : "Quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.";
    }
    if (reason.status >= 500) return "Không thể kết nối dịch vụ tính cước.";
    return reason.message || fallback;
  }
  return reason instanceof Error ? reason.message : fallback;
}
