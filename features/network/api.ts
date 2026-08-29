import { apiRequest } from "@/lib/api/client";
import type {
  CapacityReservation,
  Hub,
  HubLane,
  LaneCapacity,
  LaneSchedule,
  NetworkAuditLog,
  NetworkRegion,
  PageResponse,
  Province,
  RoutePlan,
  RouteTemplate,
  ServiceArea,
  ServiceAreaCoverage,
  Ward,
} from "@/features/network/contracts";

export async function getRegions(activeOnly = false) {
  return apiRequest<NetworkRegion[]>(
    `admin/network/regions?activeOnly=${String(activeOnly)}`,
  );
}

export async function getHubs(params: URLSearchParams) {
  return apiRequest<PageResponse<Hub>>(`admin/network/hubs?${params.toString()}`);
}

export async function getServiceAreas(params: URLSearchParams) {
  return apiRequest<PageResponse<ServiceArea>>(
    `admin/network/service-areas?${params.toString()}`,
  );
}

export async function getCoverages(params: URLSearchParams) {
  return apiRequest<PageResponse<ServiceAreaCoverage>>(
    `admin/network/coverages?${params.toString()}`,
  );
}

export async function getProvinces() {
  return apiRequest<Province[]>("locations/provinces");
}

export async function getWards(provinceCode: string) {
  if (!provinceCode) return [];
  return apiRequest<Ward[]>(
    `locations/provinces/${encodeURIComponent(provinceCode)}/wards`,
  );
}

export async function getLanes(params: URLSearchParams) {
  return apiRequest<PageResponse<HubLane>>(`admin/network/lanes?${params.toString()}`);
}

export async function getLaneSchedules(laneId: string) {
  return apiRequest<LaneSchedule[]>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules`,
  );
}

export async function getRouteTemplates(params: URLSearchParams) {
  return apiRequest<PageResponse<RouteTemplate>>(
    `admin/network/route-templates?${params.toString()}`,
  );
}

export async function planRoute(params: URLSearchParams) {
  return apiRequest<RoutePlan>(
    `admin/network/routing/plan?${params.toString()}`,
  );
}

export async function getLaneCapacity(laneId: string, serviceDate: string) {
  return apiRequest<LaneCapacity>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/capacity?serviceDate=${encodeURIComponent(serviceDate)}`,
  );
}

export async function getCapacityReservation(shipmentId: string, routeRevision: number) {
  return apiRequest<CapacityReservation>(
    `admin/network/capacity/reservations/${encodeURIComponent(shipmentId)}/revisions/${routeRevision}`,
  );
}

export async function getAuditLogs(params: URLSearchParams) {
  return apiRequest<PageResponse<NetworkAuditLog>>(
    `admin/network/audit?${params.toString()}`,
  );
}
