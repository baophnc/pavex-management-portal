export type RatePlanStatus = "DRAFT" | "ACTIVE" | "RETIRED";
export type ServiceLevel = "STANDARD" | "EXPRESS";
export type PricingZone = "SAME_SERVICE_AREA" | "SAME_REGION" | "CROSS_REGION";
export type PricingAuditEntityType = "RATE_PLAN" | "RATE_RULE";
export type PricingAuditAction =
  | "CREATED"
  | "UPDATED"
  | "RULE_UPSERTED"
  | "RULE_DELETED"
  | "REVISION_CREATED"
  | "ACTIVATED"
  | "RETIRED"
  | "DELETED";

export type RateRule = {
  id: string;
  serviceLevel: ServiceLevel;
  pricingZone: PricingZone;
  baseFee: number;
  includedWeightKg: number;
  additionalWeightStepKg: number;
  additionalWeightStepFee: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
  createdAt: string;
  updatedAt: string;
};

export type RatePlan = {
  id: string;
  code: string;
  revision: number;
  name: string;
  currency: string;
  status: RatePlanStatus;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  quoteTtlMinutes: number;
  volumetricDivisor: number;
  remoteEndpointSurcharge: number;
  islandTransportRate: number;
  codFreeThreshold: number;
  codRate: number;
  codMinimumFee: number;
  maximumCod: number;
  insuranceFreeThreshold: number;
  insuranceRate: number;
  maximumDeclaredValue: number;
  maxParcelWeightKg: number;
  maxShipmentChargeableWeightKg: number;
  maxDimensionCm: number;
  ruleCount: number;
  rules: RateRule[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  activatedBy: string | null;
  activatedAt: string | null;
  retiredBy: string | null;
  retiredAt: string | null;
  version: number;
};

export type RatePlanPayload = {
  name: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  quoteTtlMinutes: number;
  volumetricDivisor: number;
  remoteEndpointSurcharge: number;
  islandTransportRate: number;
  codFreeThreshold: number;
  codRate: number;
  codMinimumFee: number;
  maximumCod: number;
  insuranceFreeThreshold: number;
  insuranceRate: number;
  maximumDeclaredValue: number;
  maxParcelWeightKg: number;
  maxShipmentChargeableWeightKg: number;
  maxDimensionCm: number;
};

export type CreateRatePlanPayload = RatePlanPayload & {
  code: string;
  revision: number;
};

export type RateRulePayload = {
  baseFee: number;
  includedWeightKg: number;
  additionalWeightStepKg: number;
  additionalWeightStepFee: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
};

export type PricingParcelInput = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type PricingQuoteRequest = {
  originProvinceCode: string;
  originWardCode: string;
  destinationProvinceCode: string;
  destinationWardCode: string;
  codAmount: number;
  declaredValue: number;
  parcels: PricingParcelInput[];
};

export type PricingOption = {
  quoteId: string;
  serviceLevel: "Standard" | "Express";
  baseFee: number;
  additionalWeightFee: number;
  areaSurcharge: number;
  codFee: number;
  insuranceFee: number;
  total: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
};

export type PricingQuote = {
  requestId: string;
  rateVersion: string;
  lane: "Local" | "Regional" | "National" | string;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  parcelCount: number;
  expiresAt: string;
  options: PricingOption[];
};

export type Province = {
  code: string;
  name: string;
  fullName: string;
};

export type Ward = {
  code: string;
  name: string;
  fullName: string;
  provinceCode: string;
};

export type PricingAuditLog = {
  id: string;
  entityType: PricingAuditEntityType;
  entityId: string;
  action: PricingAuditAction;
  actorUserId: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  occurredAt: string;
};

export type PricingPageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export const serviceLevels: ServiceLevel[] = ["STANDARD", "EXPRESS"];
export const pricingZones: PricingZone[] = [
  "SAME_SERVICE_AREA",
  "SAME_REGION",
  "CROSS_REGION",
];

export function ratePlanStatusLabel(status: RatePlanStatus) {
  switch (status) {
    case "DRAFT":
      return "Bản nháp";
    case "ACTIVE":
      return "Đang áp dụng";
    case "RETIRED":
      return "Đã ngừng áp dụng";
  }
}

export function serviceLevelLabel(level: ServiceLevel | "Standard" | "Express") {
  if (level === "STANDARD" || level === "Standard") return "Tiêu chuẩn";
  return "Nhanh";
}

export function pricingZoneLabel(zone: PricingZone | string) {
  switch (zone) {
    case "SAME_SERVICE_AREA":
    case "Local":
      return "Cùng vùng phục vụ";
    case "SAME_REGION":
    case "Regional":
      return "Cùng vùng mạng lưới";
    case "CROSS_REGION":
    case "National":
      return "Khác vùng mạng lưới";
    default:
      return zone;
  }
}

export function auditEntityLabel(type: PricingAuditEntityType) {
  return type === "RATE_PLAN" ? "Bảng giá" : "Quy tắc giá";
}

export function auditActionLabel(action: PricingAuditAction) {
  switch (action) {
    case "CREATED":
      return "Tạo mới";
    case "UPDATED":
      return "Cập nhật";
    case "RULE_UPSERTED":
      return "Lưu quy tắc giá";
    case "RULE_DELETED":
      return "Xóa quy tắc giá";
    case "REVISION_CREATED":
      return "Tạo phiên bản mới";
    case "ACTIVATED":
      return "Bắt đầu áp dụng";
    case "RETIRED":
      return "Ngừng áp dụng";
    case "DELETED":
      return "Xóa bản nháp";
  }
}
