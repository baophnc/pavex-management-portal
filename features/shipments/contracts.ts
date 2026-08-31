export type ShipmentStatus =
  | "AWAITING_PICKUP"
  | "PICKED_UP"
  | "AT_ORIGIN_HUB"
  | "IN_TRANSIT"
  | "AT_DESTINATION_HUB"
  | "OUT_FOR_DELIVERY"
  | "DELIVERY_FAILED"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "RETURNING"
  | "RETURNED"
  | "CANCELLED";

export type ShipmentLifecycleStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ShipmentServiceLevel = "STANDARD" | "EXPRESS";
export type ShippingFeePayer = "SENDER" | "RECIPIENT";
export type ShipmentRoutingStatus =
  | "UNPLANNED"
  | "RESERVED"
  | "IN_TRANSIT"
  | "CONSUMED"
  | "RELEASED";
export type ShipmentPricingZone =
  | "SAME_SERVICE_AREA"
  | "SAME_REGION"
  | "CROSS_REGION";
export type ShipmentCoverageTier = "STANDARD" | "REMOTE" | "ISLAND";
export type GoodsCategory =
  | "DOCUMENTS"
  | "APPAREL"
  | "ELECTRONICS"
  | "DRY_FOOD"
  | "COSMETICS"
  | "HOUSEHOLD"
  | "FRAGILE_GOODS"
  | "OTHER";
export type ParcelStatus = Exclude<ShipmentStatus, "PARTIALLY_DELIVERED">;

export type ShipmentAddress = {
  contactName: string;
  contactPhone: string;
  addressLine: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
};

export type ShipmentPricing = {
  rateCode: string;
  rateVersion: string;
  currency: string;
  serviceLevel: ShipmentServiceLevel;
  pricingZone: ShipmentPricingZone;
  baseFee: number;
  additionalWeightFee: number;
  areaSurcharge: number;
  codFee: number;
  insuranceFee: number;
  shippingFee: number;
  codAmount: number;
  declaredValue: number;
  estimatedMinDays: number;
  estimatedMaxDays: number;
};

export type ShipmentRouting = {
  originHubCode: string;
  originHubName: string;
  originCoverageTier: ShipmentCoverageTier;
  destinationHubCode: string;
  destinationHubName: string;
  destinationCoverageTier: ShipmentCoverageTier;
  routeRevision: number;
  reservedWeightKg: number;
  estimatedDeliveryAt: string | null;
  estimatedTransitMinutes: number | null;
  distanceKm: number | null;
  status: ShipmentRoutingStatus;
};

export type ShipmentParcel = {
  code: string;
  sequence: number;
  description: string;
  quantity: number;
  category: GoodsCategory;
  isFragile: boolean;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  status: ParcelStatus;
};

export type ShipmentTimelineEvent = {
  status: ShipmentStatus;
  code: string;
  description: string;
  parcelCode: string | null;
  locationName: string | null;
  occurredAt: string;
};

export type ShipmentDetail = {
  trackingCode: string;
  merchantReference: string | null;
  status: ShipmentStatus;
  lifecycleStatus: ShipmentLifecycleStatus;
  sender: ShipmentAddress;
  recipient: ShipmentAddress;
  shippingFeePayer: ShippingFeePayer;
  pricing: ShipmentPricing;
  routing: ShipmentRouting;
  parcels: ShipmentParcel[];
  timeline: ShipmentTimelineEvent[];
  note: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminShipmentSummary = {
  id: string;
  trackingCode: string;
  merchantId: string;
  createdByUserId: string;
  merchantReference: string | null;
  status: ShipmentStatus;
  lifecycleStatus: ShipmentLifecycleStatus;
  serviceLevel: ShipmentServiceLevel;
  shippingFee: number;
  codAmount: number;
  destinationProvinceCode: string;
  destinationProvinceName: string;
  destinationWardCode: string;
  destinationWardName: string;
  originHubCode: string;
  originHubName: string;
  destinationHubCode: string;
  destinationHubName: string;
  parcelCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminShipmentPage = {
  items: AdminShipmentSummary[];
  nextCursor: string | null;
  totalCount: number;
};

export type AdminShipmentEvent = {
  id: string;
  status: ShipmentStatus;
  code: string;
  description: string;
  parcelCode: string | null;
  actorUserId: string | null;
  hubId: string | null;
  locationName: string | null;
  dataJson: string | null;
  occurredAt: string;
  recordedAt: string;
};

export type DeliveryAttemptOutcome = "DELIVERED" | "FAILED";
export type DeliveryFailureReason =
  | "RECIPIENT_UNAVAILABLE"
  | "RECIPIENT_REFUSED"
  | "INVALID_ADDRESS"
  | "UNABLE_TO_CONTACT"
  | "PAYMENT_NOT_COLLECTED"
  | "PARCEL_DAMAGED"
  | "UNSAFE_LOCATION"
  | "OTHER";
export type DeliveryProofMethod = "OTP" | "SIGNATURE" | "PHOTO";

export type AdminDeliveryAttempt = {
  id: string;
  parcelCode: string;
  actorUserId: string;
  attemptNumber: number;
  outcome: DeliveryAttemptOutcome;
  failureReason: DeliveryFailureReason | null;
  proofMethod: DeliveryProofMethod | null;
  recipientName: string | null;
  evidenceReference: string | null;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  occurredAt: string;
  createdAt: string;
};

export type AdminShipmentDetail = {
  id: string;
  merchantId: string;
  createdByUserId: string;
  quoteId: string;
  quoteRequestId: string;
  ratePlanId: string;
  rateRevision: number;
  capacityReservationBatchId: string | null;
  originServiceAreaId: string;
  originRegionId: string;
  originHubId: string;
  destinationServiceAreaId: string;
  destinationRegionId: string;
  destinationHubId: string;
  version: number;
  shipment: ShipmentDetail;
  events: AdminShipmentEvent[];
  deliveryAttempts: AdminDeliveryAttempt[];
};

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "AWAITING_PICKUP",
  "PICKED_UP",
  "AT_ORIGIN_HUB",
  "IN_TRANSIT",
  "AT_DESTINATION_HUB",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "RETURNING",
  "RETURNED",
  "CANCELLED",
];

export const SHIPMENT_LIFECYCLE_STATUSES: ShipmentLifecycleStatus[] = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
];
