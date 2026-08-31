import type {
  DeliveryFailureReason,
  DeliveryProofMethod,
  GoodsCategory,
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
    AT_ORIGIN_HUB: "Tại hub gửi",
    IN_TRANSIT: "Đang trung chuyển",
    AT_DESTINATION_HUB: "Tại hub nhận",
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

export function lifecycleLabel(status: ShipmentLifecycleStatus) {
  if (status === "ACTIVE") return "Đang hoạt động";
  if (status === "COMPLETED") return "Hoàn tất";
  return "Đã hủy";
}

export function serviceLevelLabel(level: ShipmentServiceLevel) {
  return level === "EXPRESS" ? "Hỏa tốc" : "Tiêu chuẩn";
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
    "parcel.scanned": "Quét kiện hàng",
    "parcel.at-destination-hub": "Kiện hàng đến điểm trung chuyển đích",
    "parcel.delivered": "Giao kiện hàng thành công",
    "parcel.delivery-failed": "Giao kiện hàng không thành công",
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
  if (zone === "SAME_SERVICE_AREA") return "Cùng vùng phục vụ";
  if (zone === "SAME_REGION") return "Cùng vùng";
  return "Liên vùng";
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
  if (reason.status === 403) return "Tài khoản không có quyền xem vận đơn toàn hệ thống.";
  return reason.message || fallback;
}
