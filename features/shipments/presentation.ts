import type {
  DeliveryFailureReason,
  DeliveryProofMethod,
  GoodsCategory,
  ParcelStatus,
  ShipmentCollectionStatus,
  ShipmentCoverageTier,
  ShipmentLifecycleStatus,
  ShipmentPricingZone,
  ShipmentRoutingStatus,
  ShipmentServiceLevel,
  ShipmentStatus,
  ShippingFeePayer,
} from "@/features/shipments/contracts";
import { ApiError } from "@/lib/api/client";

export function shipmentStatusLabel(status: ShipmentStatus) {
  const labels: Record<ShipmentStatus, string> = {
    AWAITING_PICKUP: "Chờ lấy hàng",
    PICKED_UP: "Đã lấy hàng",
    AT_ORIGIN_HUB: "Đã đến bưu cục gửi",
    IN_TRANSIT: "Đang trung chuyển",
    AT_DESTINATION_HUB: "Đã đến bưu cục phát",
    OUT_FOR_DELIVERY: "Đang giao",
    DELIVERY_FAILED: "Giao thất bại",
    PARTIALLY_DELIVERED: "Giao một phần",
    DELIVERED: "Đã giao",
    RETURNING: "Đang hoàn",
    RETURNED: "Đã hoàn",
    CANCELLED: "Đã hủy",
  };
  return labels[status];
}

export function parcelStatusLabel(status: ParcelStatus) {
  return status === "AT_TRANSIT_HUB" ? "Đã đến bưu cục trung chuyển" : shipmentStatusLabel(status);
}

export function lifecycleLabel(status: ShipmentLifecycleStatus) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "COMPLETED") return "Hoàn tất";
  return "Đã hủy";
}

export function serviceLevelLabel(level: ShipmentServiceLevel) {
  return level === "EXPRESS" ? "Hỏa tốc" : "Tiêu chuẩn";
}

export function collectionStatusLabel(status: ShipmentCollectionStatus) {
  switch (status) {
    case "NOT_REQUIRED":
      return "Không thu tiền";
    case "PENDING":
      return "Chờ thu khi giao";
    case "COLLECTED":
      return "Đã thu";
    case "VOIDED":
      return "Không thu (đơn đã kết thúc)";
  }
}

export function shippingFeePayerLabel(payer: ShippingFeePayer) {
  return payer === "SENDER" ? "Người gửi trả cước" : "Người nhận trả cước";
}

export function shipmentEventLabel(code: string, status: ShipmentStatus) {
  const labels: Record<string, string> = {
    "shipment.created": "Tạo vận đơn",
    "shipment.cancelled": "Hủy vận đơn",
    "shipment.completed": "Hoàn tất vận đơn",
    "shipment.parcel-scanned": "Ghi nhận quét kiện hàng",
    "shipment.delivery-attempt-recorded": "Ghi nhận lần giao hàng",
    "shipment.cash-collected": "Bưu tá thu tiền người nhận",
    "parcel.scanned": "Quét kiện hàng",
    "parcel.at-destination-hub": "Kiện hàng đến điểm trung chuyển đích",
    "parcel.delivered": "Giao kiện hàng thành công",
    "parcel.delivery-failed": "Giao kiện hàng không thành công",
    "shipment.hold.placed": "Tạm giữ vận đơn",
    "shipment.hold.released": "Gỡ tạm giữ vận đơn",
    "shipment.return.requested": "Yêu cầu hoàn hàng",
    "shipment.return.processing": "Đang xử lý hoàn hàng",
    "shipment.return.completed": "Hoàn tất hoàn hàng",
    "shipment.forward.requested": "Yêu cầu chuyển tiếp",
    "shipment.forward.approved": "Duyệt chuyển tiếp",
    "shipment.forward.completed": "Hoàn tất chuyển tiếp",
    "shipment.cancellation.requested": "Yêu cầu hủy vận đơn",
    "shipment.cancellation.approved": "Duyệt hủy vận đơn",
    "shipment.cancellation.processing": "Đang thu hồi để hủy",
    "shipment.cancellation.completed": "Hoàn tất hủy vận đơn",
    "shipment.weight-adjusted": "Điều chỉnh khối lượng",
    "shipment.weight-review.completed": "Hoàn tất kiểm tra khối lượng",
    "shipment.case-resolved": "Kết luận hồ sơ sự cố",
    "shipment.details-updated": "Sửa thông tin vận đơn",
  };
  return labels[code] ?? shipmentStatusLabel(status);
}

export function shipmentEventDescription(
  code: string,
  description: string,
  status: ShipmentStatus,
) {
  if (code === "shipment.created") return "Vận đơn đã được tạo và đang chờ lấy hàng.";
  if (code === "shipment.completed") return "Vòng đời vận đơn đã hoàn tất.";
  if (code === "parcel.delivered") return "Kiện hàng đã được giao thành công.";
  if (code === "parcel.delivery-failed") return "Lần giao hàng không thành công.";
  if (code === "parcel.at-destination-hub") return "Kiện hàng đã đến điểm trung chuyển đích.";
  if (code === "parcel.scanned" && description.trim().toLowerCase() === "scan") {
    return "Kiện hàng đã được quét tại điểm xử lý.";
  }
  if (description.trim()) return description;
  return shipmentStatusLabel(status);
}

export function routingStatusLabel(status: ShipmentRoutingStatus) {
  const labels: Record<ShipmentRoutingStatus, string> = {
    UNPLANNED: "Chưa giữ tuyến",
    RESERVED: "Đã giữ tải",
    IN_TRANSIT: "Đang sử dụng tuyến",
    CONSUMED: "Đã sử dụng tải",
    RELEASED: "Đã giải phóng",
  };
  return labels[status];
}

export function pricingZoneLabel(zone: ShipmentPricingZone) {
  if (zone === "SAME_PROVINCE") return "Nội tỉnh";
  if (zone === "SAME_REGION") return "Nội miền";
  return "Liên miền";
}

export function coverageTierLabel(tier: ShipmentCoverageTier) {
  if (tier === "REMOTE") return "Vùng xa";
  if (tier === "ISLAND") return "Hải đảo";
  return "Tiêu chuẩn";
}

export function goodsCategoryLabel(category: GoodsCategory) {
  const labels: Record<GoodsCategory, string> = {
    DOCUMENTS: "Tài liệu",
    APPAREL: "Thời trang",
    ELECTRONICS: "Điện tử",
    DRY_FOOD: "Thực phẩm khô",
    COSMETICS: "Mỹ phẩm",
    HOUSEHOLD: "Gia dụng",
    FRAGILE_GOODS: "Hàng dễ vỡ",
    OTHER: "Khác",
  };
  return labels[category];
}

export function deliveryFailureLabel(reason: DeliveryFailureReason) {
  const labels: Record<DeliveryFailureReason, string> = {
    RECIPIENT_UNAVAILABLE: "Người nhận vắng mặt",
    RECIPIENT_REFUSED: "Người nhận từ chối",
    INVALID_ADDRESS: "Địa chỉ không hợp lệ",
    UNABLE_TO_CONTACT: "Không liên hệ được",
    PAYMENT_NOT_COLLECTED: "Không thu được tiền",
    PARCEL_DAMAGED: "Kiện hàng hư hỏng",
    UNSAFE_LOCATION: "Địa điểm không an toàn",
    OTHER: "Lý do khác",
  };
  return labels[reason];
}

export function proofMethodLabel(method: DeliveryProofMethod) {
  if (method === "OTP") return "OTP";
  if (method === "SIGNATURE") return "Chữ ký";
  return "Ảnh";
}

export function money(value: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(value);
}

export function shipmentErrorMessage(reason: unknown, fallback: string) {
  if (!(reason instanceof ApiError)) return fallback;
  if (reason.code === "shipment_not_found" || reason.status === 404) {
    return "Không tìm thấy vận đơn.";
  }
  if (reason.code === "invalid_shipment_status") {
    return "Trạng thái vận đơn không hợp lệ.";
  }
  if (reason.code === "invalid_shipment_lifecycle_status") {
    return "Vòng đời vận đơn không hợp lệ.";
  }
  if (reason.code === "invalid_admin_shipment_query") {
    return "Từ khóa tìm kiếm quá dài.";
  }
  const known: Record<string, string> = {
    hub_outside_scope: "Bưu cục này nằm ngoài phạm vi bạn được phân công.",
    invalid_date_range: "Ngày bắt đầu phải trước ngày kết thúc.",
    shipment_closed: "Vận đơn đã kết thúc hoặc đã huỷ nên không sửa được.",
    shipment_finished: "Mọi kiện đã giao, đã hoàn hoặc đã huỷ nên không sửa được.",
    shipment_changed: "Vận đơn vừa thay đổi. Hãy tải lại rồi sửa lại.",
    invalid_shipment_update: "Thông tin sửa chưa hợp lệ (kiểm tra số điện thoại và độ dài các ô).",
  };
  if (reason.code && known[reason.code]) return known[reason.code];
  if (reason.status === 403) return "Tài khoản không có quyền thực hiện thao tác này với vận đơn.";
  return reason.message || fallback;
}


export function shipmentCaseTypeLabel(type: import("@/features/shipments/contracts").ShipmentCaseType) {
  return type === "PROBLEM_PARCEL" ? "Kiện hàng có vấn đề" : "Kiện chưa xác định";
}

export function shipmentCaseStatusLabel(status: import("@/features/shipments/contracts").ShipmentCaseStatus) {
  const labels: Record<import("@/features/shipments/contracts").ShipmentCaseStatus, string> = {
    OPEN: "Mới mở",
    ASSIGNED: "Đã phân công",
    INVESTIGATING: "Đang điều tra",
    RESOLVED: "Đã xử lý",
    CLOSED: "Đã đóng",
  };
  return labels[status];
}

export function shipmentCaseSeverityLabel(severity: import("@/features/shipments/contracts").ShipmentCaseSeverity) {
  const labels: Record<import("@/features/shipments/contracts").ShipmentCaseSeverity, string> = {
    LOW: "Thấp",
    MEDIUM: "Trung bình",
    HIGH: "Cao",
    CRITICAL: "Khẩn cấp",
  };
  return labels[severity];
}

export function shipmentCaseEventLabel(code: string) {
  const labels: Record<string, string> = {
    "case.created": "Tạo hồ sơ",
    "case.assigned": "Phân công",
    "case.investigating": "Bắt đầu điều tra",
    "case.note-added": "Thêm ghi chú",
    "case.shipment-linked": "Liên kết vận đơn",
    "case.resolved": "Xử lý xong",
    "case.closed": "Đóng hồ sơ",
  };
  return labels[code] ?? code;
}

export function shipmentControlAlertTypeLabel(
  type: import("@/features/shipments/contracts").ShipmentControlAlertType,
) {
  switch (type) {
    case "SENT_BUT_NOT_ARRIVED": return "Đã gửi nhưng chưa đến";
    case "MISSING_ARRIVAL_SCAN": return "Thiếu lượt quét nhận";
    case "ARRIVED_NOT_OUT_FOR_DELIVERY": return "Đến bưu cục nhưng chưa phát giao";
    case "ROUTE_DEVIATION": return "Sai lệch tuyến";
    case "SHIPMENT_STUCK": return "Vận đơn đứng yên";
    case "CASE_OVERDUE": return "Hồ sơ sự cố quá hạn xử lý";
    case "SIGNATURE_WITHOUT_DELIVERY": return "Có chữ ký nhưng chưa ghi nhận đã giao";
    case "DELIVERED_WITHOUT_SIGNATURE": return "Đã giao nhưng thiếu chữ ký";
  }
}

export function shipmentControlAlertSeverityLabel(
  severity: import("@/features/shipments/contracts").ShipmentControlAlertSeverity,
) {
  switch (severity) {
    case "INFO": return "Thông tin";
    case "WARNING": return "Cảnh báo";
    case "CRITICAL": return "Nghiêm trọng";
  }
}
