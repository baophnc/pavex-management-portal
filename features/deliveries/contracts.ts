import type { ShipmentStatus } from "@/features/shipments/contracts";

export type ParcelStatus =
  | "AWAITING_PICKUP"
  | "PICKED_UP"
  | "AT_ORIGIN_HUB"
  | "IN_TRANSIT"
  | "AT_TRANSIT_HUB"
  | "AT_DESTINATION_HUB"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED"
  | "DELIVERED"
  | "RETURNING"
  | "RETURNED"
  | "CANCELLED";

/** PENDING: money still has to be collected on the first parcel delivered. */
export type CollectionStatus = "PENDING" | "COLLECTED" | "NOT_REQUIRED" | "VOIDED";
export type DeliveryProofMethod = "OTP" | "SIGNATURE" | "PHOTO";
export type DeliveryFailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "RECIPIENT_REFUSED"
  | "INVALID_ADDRESS"
  | "UNABLE_TO_CONTACT"
  | "PAYMENT_NOT_COLLECTED"
  | "PARCEL_DAMAGED"
  | "UNSAFE_LOCATION"
  | "OTHER";

export type CourierParcel = {
  parcelCode: string;
  sequence: number;
  status: ParcelStatus;
  description: string;
  isFragile: boolean;
  assignmentId: string | null;
};

/** GET /api/v1/deliveries/mine: shipments with parcels this courier is carrying. */
export type CourierDelivery = {
  trackingCode: string;
  status: ShipmentStatus;
  serviceLevel: "STANDARD" | "EXPRESS";
  recipient: {
    contactName: string;
    contactPhone: string;
    addressLine: string;
    provinceName: string;
    wardName: string;
  };
  note: string | null;
  amountToCollect: number;
  collectionStatus: CollectionStatus;
  parcelCount: number;
  parcels: CourierParcel[];
};

export type RecordDeliveryAttemptPayload = {
  assignmentId: string;
  parcelCode: string;
  idempotencyKey: string;
  outcome: "DELIVERED" | "FAILED";
  failureReason?: DeliveryFailureReason;
  proofMethod?: DeliveryProofMethod;
  recipientName?: string;
  evidenceReference?: string;
  note?: string;
  collectedAmount?: number;
};

export const proofMethodLabels: Record<DeliveryProofMethod, string> = {
  PHOTO: "Ảnh chụp giao hàng",
  OTP: "Mã OTP người nhận",
  SIGNATURE: "Chữ ký người nhận",
};

export const failureReasonLabels: Record<DeliveryFailureReason, string> = {
  RECIPIENT_UNAVAILABLE: "Người nhận vắng mặt",
  UNABLE_TO_CONTACT: "Không liên lạc được người nhận",
  RECIPIENT_REFUSED: "Người nhận từ chối nhận hàng",
  PAYMENT_NOT_COLLECTED: "Người nhận không thanh toán",
  INVALID_ADDRESS: "Sai hoặc không tìm thấy địa chỉ",
  PARCEL_DAMAGED: "Hàng bị hư hỏng",
  UNSAFE_LOCATION: "Khu vực không an toàn",
  OTHER: "Lý do khác",
};

export const parcelStatusLabels: Partial<Record<ParcelStatus, string>> = {
  OUT_FOR_DELIVERY: "Đang giao",
  DELIVERY_FAILED: "Giao chưa thành công",
  DELIVERED: "Đã giao",
  RETURNING: "Đang hoàn",
};
