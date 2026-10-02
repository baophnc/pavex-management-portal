export type MerchantStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE"
  | "SUSPENDED"
  | "REJECTED";

export type MerchantStatusReason =
  | "DOCUMENT_INVALID"
  | "FRAUD_REVIEW"
  | "POLICY_VIOLATION"
  | "MERCHANT_REQUEST"
  | "OTHER";

export type MerchantProfile = {
  id: string;
  merchantCode: string;
  userId: string;
  /** The hub serving the shop's warehouse area; its manager approves the shop. */
  servingHubId: string | null;
  businessName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  taxCode: string | null;
  status: MerchantStatus;
  statusReasonCode: MerchantStatusReason | null;
  statusReasonDetail: string | null;
  statusChangedAt: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type MerchantStatusHistory = {
  id: string;
  fromStatus: MerchantStatus | null;
  toStatus: MerchantStatus;
  reasonCode: MerchantStatusReason | null;
  reasonDetail: string | null;
  changedByUserId: string | null;
  changedAt: string;
};

export type AdminMerchantResponse = {
  merchant: MerchantProfile;
  history: MerchantStatusHistory[];
};

export type MerchantOrderRestriction =
  | "MERCHANT_REQUIRED"
  | "MERCHANT_NOT_ACTIVE"
  | "MERCHANT_SUSPENDED"
  | "IDENTITY_NOT_ELIGIBLE"
  | "DEFAULT_PICKUP_REQUIRED";

export type AdminPickupAddress = {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  addressLine: string;
  provinceCode: string;
  provinceName: string | null;
  wardCode: string;
  wardName: string | null;
  isDefault: boolean;
  /** False when shipments cannot be created from this address (e.g. landline phone). */
  usableAsSender: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MerchantReadiness = {
  /** Null when nothing else blocks but the login account could not be checked. */
  canCreateOrder: boolean | null;
  restrictions: string[];
  identityChecked: boolean;
  defaultPickupAddressId: string | null;
  pickupAddresses: AdminPickupAddress[];
  /** A merchant role change not yet delivered to the login account; null when in step. */
  roleSync: MerchantRoleSync | null;
};

export type MerchantRoleSync = {
  /** True when the change grants the merchant role, false when it removes it. */
  enabled: boolean;
  pendingSince: string;
  attempts: number;
  lastError: string | null;
};

export function orderRestrictionLabel(code: string) {
  switch (code as MerchantOrderRestriction) {
    case "MERCHANT_REQUIRED":
      return "Chưa có hồ sơ cửa hàng";
    case "MERCHANT_NOT_ACTIVE":
      return "Hồ sơ cửa hàng chưa được duyệt";
    case "MERCHANT_SUSPENDED":
      return "Cửa hàng đang tạm ngưng";
    case "IDENTITY_NOT_ELIGIBLE":
      return "Tài khoản đăng nhập chưa đủ điều kiện (bị khóa, chưa xác minh email hoặc chưa hoàn tất hồ sơ)";
    case "DEFAULT_PICKUP_REQUIRED":
      return "Chưa có điểm lấy hàng mặc định";
    default:
      return code;
  }
}

export type MerchantListResponse = {
  content: MerchantProfile[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
};

export const merchantStatuses: MerchantStatus[] = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "REJECTED",
];

export const merchantStatusReasons: MerchantStatusReason[] = [
  "DOCUMENT_INVALID",
  "FRAUD_REVIEW",
  "POLICY_VIOLATION",
  "MERCHANT_REQUEST",
  "OTHER",
];

export function merchantStatusLabel(status: MerchantStatus) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Chờ xét duyệt";
    case "ACTIVE":
      return "Đang hoạt động";
    case "SUSPENDED":
      return "Tạm ngưng";
    case "REJECTED":
      return "Đã từ chối";
  }
}

export function merchantReasonLabel(reason: MerchantStatusReason) {
  switch (reason) {
    case "DOCUMENT_INVALID":
      return "Hồ sơ / giấy tờ không hợp lệ";
    case "FRAUD_REVIEW":
      return "Cần rà soát gian lận";
    case "POLICY_VIOLATION":
      return "Vi phạm chính sách";
    case "MERCHANT_REQUEST":
      return "Theo yêu cầu cửa hàng";
    case "OTHER":
      return "Lý do khác";
  }
}
