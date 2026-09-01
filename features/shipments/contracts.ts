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
  id?: string;
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

export type ShipmentExceptionRequestKind = "RETURN" | "FORWARD" | "CANCELLATION";
export type ShipmentExceptionRequestStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED";

export type ForwardRecipient = {
  contactName: string;
  contactPhone: string;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
};

export type ShipmentExceptionRequest = {
  requestId: string;
  kind: ShipmentExceptionRequestKind;
  status: ShipmentExceptionRequestStatus;
  reason: string;
  requestedByUserId: string;
  requestedAt: string;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  routingRequired: boolean;
  forwardRecipient: ForwardRecipient | null;
  completedByUserId: string | null;
  completedAt: string | null;
  version: number;
};

export type ShipmentWeightAdjustment = {
  adjustmentId: string;
  parcelId: string;
  oldActualWeightKg: number;
  newActualWeightKg: number;
  oldChargeableWeightKg: number;
  newChargeableWeightKg: number;
  reason: string;
  actorUserId: string;
  hubId: string | null;
  adjustedAt: string;
  reviewCompleted: boolean;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};

export type ShipmentExceptionState = {
  shipmentId: string;
  trackingCode: string;
  isOnHold: boolean;
  holdReason: string | null;
  holdActorUserId: string | null;
  holdHubId: string | null;
  heldAt: string | null;
  hasPendingWeightReview: boolean;
  returnRequest: ShipmentExceptionRequest | null;
  forwardRequest: ShipmentExceptionRequest | null;
  cancellationRequest: ShipmentExceptionRequest | null;
  weightAdjustments: ShipmentWeightAdjustment[];
};

export type ShipmentHoldInput = {
  reason: string;
  hubId: string | null;
};

export type ShipmentExceptionReviewInput = {
  approve: boolean;
  note: string | null;
};

export type ShipmentExceptionCompleteInput = {
  note: string | null;
};

export type ShipmentForwardInput = {
  reason: string;
  recipient: ForwardRecipient;
};

export type ShipmentWeightAdjustmentInput = {
  parcelId: string;
  actualWeightKg: number;
  reason: string;
  hubId: string | null;
};


export type ShipmentCaseType = "PROBLEM_PARCEL" | "UNIDENTIFIED_PARCEL";
export type ShipmentCaseStatus = "OPEN" | "ASSIGNED" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
export type ShipmentCaseSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ShipmentCaseEvent = {
  id: string;
  code: string;
  description: string;
  actorUserId: string;
  occurredAt: string;
  dataJson: string | null;
};

export type ShipmentCaseSummary = {
  id: string;
  caseNumber: string;
  type: ShipmentCaseType;
  status: ShipmentCaseStatus;
  severity: ShipmentCaseSeverity;
  hubId: string;
  shipmentId: string | null;
  parcelId: string | null;
  externalBarcode: string | null;
  title: string;
  assignedToUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShipmentCase = ShipmentCaseSummary & {
  description: string;
  reportedByUserId: string;
  resolution: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  version: number;
  events: ShipmentCaseEvent[];
};

export type ShipmentCasePage = {
  items: ShipmentCaseSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ShipmentCaseMonitoringSummary = {
  totalActive: number;
  open: number;
  assigned: number;
  investigating: number;
  problemParcels: number;
  unidentifiedParcels: number;
  highOrCritical: number;
  resolvedToday: number;
};

export type CreateProblemParcelCaseInput = {
  shipmentId: string;
  parcelId: string | null;
  hubId: string;
  severity: ShipmentCaseSeverity;
  title: string;
  description: string;
};

export type CreateUnidentifiedParcelCaseInput = {
  hubId: string;
  severity: ShipmentCaseSeverity;
  title: string;
  description: string;
  externalBarcode: string | null;
};

export const SHIPMENT_CASE_TYPES: ShipmentCaseType[] = ["PROBLEM_PARCEL", "UNIDENTIFIED_PARCEL"];
export const SHIPMENT_CASE_STATUSES: ShipmentCaseStatus[] = ["OPEN", "ASSIGNED", "INVESTIGATING", "RESOLVED", "CLOSED"];
export const SHIPMENT_CASE_SEVERITIES: ShipmentCaseSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type ShipmentControlAlertType =
  | "SENT_BUT_NOT_ARRIVED"
  | "MISSING_ARRIVAL_SCAN"
  | "ARRIVED_NOT_OUT_FOR_DELIVERY"
  | "ROUTE_DEVIATION"
  | "SHIPMENT_STUCK"
  | "ESTIMATED_DELIVERY_OVERDUE"
  | "CASE_OVERDUE"
  | "EXCEPTION_OVERDUE"
  | "SIGNATURE_WITHOUT_DELIVERY"
  | "DELIVERED_WITHOUT_SIGNATURE";

export type ShipmentControlAlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type ShipmentControlTowerAlert = {
  key: string;
  type: ShipmentControlAlertType;
  severity: ShipmentControlAlertSeverity;
  shipmentId: string | null;
  trackingCode: string | null;
  parcelId: string | null;
  parcelCode: string | null;
  hubId: string;
  routeLegId: string | null;
  caseId: string | null;
  caseNumber: string | null;
  title: string;
  description: string;
  detectedAt: string;
  dueAt: string | null;
  overdueMinutes: number | null;
  lastActivityAt: string | null;
  shipmentPath: string | null;
  casePath: string | null;
};

export type ShipmentControlTowerPage = {
  items: ShipmentControlTowerAlert[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ShipmentControlTowerSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
  byType: Record<ShipmentControlAlertType, number>;
};

export const SHIPMENT_CONTROL_ALERT_TYPES: ShipmentControlAlertType[] = [
  "SENT_BUT_NOT_ARRIVED",
  "MISSING_ARRIVAL_SCAN",
  "ARRIVED_NOT_OUT_FOR_DELIVERY",
  "ROUTE_DEVIATION",
  "SHIPMENT_STUCK",
  "ESTIMATED_DELIVERY_OVERDUE",
  "CASE_OVERDUE",
  "EXCEPTION_OVERDUE",
  "SIGNATURE_WITHOUT_DELIVERY",
  "DELIVERED_WITHOUT_SIGNATURE",
];

export const SHIPMENT_CONTROL_ALERT_SEVERITIES: ShipmentControlAlertSeverity[] = [
  "INFO",
  "WARNING",
  "CRITICAL",
];
