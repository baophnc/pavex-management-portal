import { ApiError } from "@/lib/api/client";

const messages: Record<string, string> = {
  cash_remittance_not_submitted: "Lô tiền này đã được xử lý trước đó.",
  cash_remittance_collection_conflict: "Một khoản tiền trong lô đã thay đổi trạng thái. Hãy tải lại.",
  cash_collection_in_remittance: "Khoản tiền này thuộc một lô nộp tiền; hãy duyệt hoặc từ chối cả lô.",
  cash_collection_not_submitted: "Chỉ duyệt được khoản tiền đang chờ duyệt.",
  statement_not_found: "Không tìm thấy kỳ đối soát.",
  invalid_cutoff: "Thời điểm chốt số liệu không được ở tương lai.",
  payout_account_missing: "Merchant chưa đăng ký tài khoản nhận tiền nên chưa thể ghi nhận chuyển khoản.",
  payout_conflict: "Kỳ đối soát này không còn khoản chờ chuyển.",
  invoice_not_found: "Không tìm thấy hóa đơn.",
  invalid_payment_amount: "Số tiền vượt quá số dư chưa thanh toán của hóa đơn.",
  invoice_not_payable: "Hóa đơn đã thanh toán đủ hoặc đã hủy.",
  invoice_cancel_conflict: "Không thể hủy hóa đơn đã có khoản thanh toán.",
  provider_confirmation_required: "Thanh toán qua cổng thật chỉ được xác nhận bằng thông báo từ cổng thanh toán.",
  qr_payment_expired: "Mã QR đã hết hạn.",
  payment_not_pending: "Khoản thanh toán không còn ở trạng thái chờ.",
  billing_state_changed: "Dữ liệu vừa được người khác thay đổi. Hãy tải lại rồi thử lại.",
  billing_conflict: "Thay đổi xung đột với dữ liệu tài chính hiện có.",
  invalid_request: "Dữ liệu nhập chưa hợp lệ.",
};

export function financeErrorMessage(reason: unknown, fallback = "Thao tác tài chính thất bại.") {
  if (reason instanceof ApiError) {
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (reason.status >= 500) return "Không thể kết nối dịch vụ tài chính. Hãy thử lại sau.";
    return reason.message || fallback;
  }
  return reason instanceof Error ? reason.message : fallback;
}
