export type NetworkRegionStatus = "INACTIVE" | "ACTIVE";
export type HubStatus = "INACTIVE" | "ACTIVE";
export type HubType = "REGIONAL_GATEWAY" | "PROVINCIAL" | "LOCAL";
export type ServiceAreaStatus = "INACTIVE" | "ACTIVE";
export type CoverageTier = "STANDARD" | "REMOTE" | "ISLAND";

export type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type NetworkRegion = {
  id: string;
  code: string;
  name: string;
  status: NetworkRegionStatus;
  createdAt: string;
  updatedAt: string;
};

export type Hub = {
  id: string;
  code: string;
  name: string;
  type: HubType;
  status: HubStatus;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
  parentHubId: string | null;
  publicVisible: boolean;
  publicName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceArea = {
  id: string;
  code: string;
  name: string;
  regionId: string;
  primaryHubId: string;
  status: ServiceAreaStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaCoverage = {
  id: string;
  serviceAreaId: string;
  provinceCode: string;
  wardCode: string | null;
  tier: CoverageTier;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Province = {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
  codeName: string;
};

export type Ward = {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
  codeName: string;
  provinceCode: string;
};

export const hubTypes: HubType[] = [
  "REGIONAL_GATEWAY",
  "PROVINCIAL",
  "LOCAL",
];

export const coverageTiers: CoverageTier[] = [
  "STANDARD",
  "REMOTE",
  "ISLAND",
];

export function networkStatusLabel(status: NetworkRegionStatus | HubStatus | ServiceAreaStatus) {
  return status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động";
}

export function hubTypeLabel(type: HubType) {
  switch (type) {
    case "REGIONAL_GATEWAY":
      return "Gateway vùng";
    case "PROVINCIAL":
      return "Hub tỉnh";
    case "LOCAL":
      return "Hub địa phương";
  }
}

export function coverageTierLabel(tier: CoverageTier) {
  switch (tier) {
    case "STANDARD":
      return "Tiêu chuẩn";
    case "REMOTE":
      return "Vùng xa";
    case "ISLAND":
      return "Hải đảo";
  }
}

export type TransportMode = "ROAD" | "AIR" | "RAIL" | "SEA";
export type HubLaneStatus = "INACTIVE" | "ACTIVE";
export type LaneScheduleStatus = "INACTIVE" | "ACTIVE";
export type RouteTemplateStatus = "INACTIVE" | "ACTIVE";
export type RoutePlanningMode = "PREFER_TEMPLATE" | "GRAPH_ONLY" | "TEMPLATE_ONLY";
export type RoutePlanSource = "LOCAL" | "ROUTE_TEMPLATE" | "GRAPH";
export type LaneCapacityReservationStatus = "RESERVED" | "CONSUMED" | "RELEASED";
export type CapacityReservationBatchStatus =
  | "RESERVED"
  | "IN_TRANSIT"
  | "CONSUMED"
  | "RELEASED"
  | "PARTIALLY_CONSUMED"
  | "NOT_REQUIRED";
export type NetworkAuditEntityType =
  | "REGION"
  | "HUB"
  | "SERVICE_AREA"
  | "COVERAGE"
  | "LANE"
  | "LANE_SCHEDULE"
  | "ROUTE_TEMPLATE"
  | "CAPACITY_RESERVATION";
export type NetworkAuditAction =
  | "CREATED"
  | "UPDATED"
  | "ACTIVATED"
  | "DEACTIVATED"
  | "DELETED"
  | "RESERVED"
  | "CONSUMED"
  | "RELEASED";

export type HubLane = {
  id: string;
  code: string;
  fromHubId: string;
  fromHubCode: string;
  fromHubName: string;
  toHubId: string;
  toHubCode: string;
  toHubName: string;
  transportMode: TransportMode;
  estimatedTransitMinutes: number;
  distanceKm: number | null;
  maxShipmentWeightKg: number;
  status: HubLaneStatus;
  createdAt: string;
  updatedAt: string;
};

export type LaneSchedule = {
  id: string;
  laneId: string;
  departureTime: string;
  daysOfWeek: string[];
  effectiveFrom: string;
  effectiveTo: string | null;
  capacityKg: number;
  status: LaneScheduleStatus;
  createdAt: string;
  updatedAt: string;
};

export type RoutePlanLeg = {
  sequence: number;
  laneId: string;
  laneCode: string;
  scheduleId: string;
  fromHubId: string;
  fromHubCode: string;
  toHubId: string;
  toHubCode: string;
  transportMode: TransportMode;
  serviceDate: string;
  scheduledDepartureTime: string;
  departureAt: string;
  arrivalAt: string;
  waitMinutes: number;
  transitMinutes: number;
  distanceKm: number | null;
  departureCapacityKg: number;
  allocatedCapacityKg: number;
  remainingCapacityKg: number;
};

export type RoutePlan = {
  source: RoutePlanSource;
  routeTemplateId: string | null;
  routeTemplateCode: string | null;
  routeTemplateRevision: number | null;
  originServiceAreaId: string;
  destinationServiceAreaId: string;
  originHubId: string;
  originHubCode: string;
  destinationHubId: string;
  destinationHubCode: string;
  shipmentWeightKg: number;
  readyAt: string;
  arrivalAt: string;
  totalJourneyMinutes: number;
  inTransitMinutes: number;
  totalDistanceKm: number | null;
  legs: RoutePlanLeg[];
};

export type RouteTemplateLeg = {
  sequence: number;
  laneId: string;
  laneCode: string;
  fromHubId: string;
  fromHubCode: string;
  toHubId: string;
  toHubCode: string;
  transportMode: TransportMode;
  estimatedTransitMinutes: number;
  distanceKm: number | null;
  maxShipmentWeightKg: number;
  laneStatus: HubLaneStatus;
};

export type RouteTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  originHubId: string;
  originHubCode: string;
  destinationHubId: string;
  destinationHubCode: string;
  priority: number;
  status: RouteTemplateStatus;
  revision: number;
  estimatedTransitMinutes: number;
  totalDistanceKm: number | null;
  legs: RouteTemplateLeg[];
  createdAt: string;
  updatedAt: string;
};

export type LaneDepartureCapacity = {
  scheduleId: string;
  departureTime: string;
  serviceDate: string;
  capacityKg: number;
  allocatedCapacityKg: number;
  remainingCapacityKg: number;
};

export type LaneCapacity = {
  laneId: string;
  laneCode: string;
  serviceDate: string;
  totalCapacityKg: number;
  allocatedCapacityKg: number;
  remainingCapacityKg: number;
  departures: LaneDepartureCapacity[];
};

export type CapacityReservationLeg = {
  reservationId: string;
  sequence: number;
  laneId: string;
  laneCode: string;
  scheduleId: string;
  serviceDate: string;
  departureAt: string;
  arrivalAt: string;
  departureCapacityKg: number;
  reservedWeightKg: number;
  status: LaneCapacityReservationStatus;
};

export type CapacityReservation = {
  batchId: string | null;
  shipmentId: string;
  routeRevision: number;
  shipmentWeightKg: number;
  estimatedDeliveryAt: string;
  source: RoutePlanSource;
  routeTemplateId: string | null;
  routeTemplateCode: string | null;
  routeTemplateRevision: number | null;
  status: CapacityReservationBatchStatus;
  legs: CapacityReservationLeg[];
};

export type NetworkAuditLog = {
  id: string;
  entityType: NetworkAuditEntityType;
  entityId: string;
  action: NetworkAuditAction;
  actorUserId: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string | null;
  occurredAt: string;
};

export const transportModes: TransportMode[] = ["ROAD", "AIR", "RAIL", "SEA"];
export const planningModes: RoutePlanningMode[] = [
  "PREFER_TEMPLATE",
  "GRAPH_ONLY",
  "TEMPLATE_ONLY",
];
export const auditEntityTypes: NetworkAuditEntityType[] = [
  "REGION",
  "HUB",
  "SERVICE_AREA",
  "COVERAGE",
  "LANE",
  "LANE_SCHEDULE",
  "ROUTE_TEMPLATE",
  "CAPACITY_RESERVATION",
];

export function transportModeLabel(mode: TransportMode) {
  switch (mode) {
    case "ROAD":
      return "Đường bộ";
    case "AIR":
      return "Hàng không";
    case "RAIL":
      return "Đường sắt";
    case "SEA":
      return "Đường biển";
  }
}

export function planningModeLabel(mode: RoutePlanningMode) {
  switch (mode) {
    case "PREFER_TEMPLATE":
      return "Ưu tiên Route Template";
    case "GRAPH_ONLY":
      return "Chỉ Graph Planner";
    case "TEMPLATE_ONLY":
      return "Chỉ Route Template";
  }
}

export function routeSourceLabel(source: RoutePlanSource) {
  switch (source) {
    case "LOCAL":
      return "Nội vùng";
    case "ROUTE_TEMPLATE":
      return "Route Template";
    case "GRAPH":
      return "Graph Planner";
  }
}
