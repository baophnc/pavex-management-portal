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
  return (await apiRequest(
    `admin/network/regions?activeOnly=${String(activeOnly)}`,
  )) as NetworkRegion[];
}

export async function getHubs(params: URLSearchParams) {
  return (await apiRequest(`admin/network/hubs?${params.toString()}`)) as PageResponse<Hub>;
}

export async function getServiceAreas(params: URLSearchParams) {
  return (await apiRequest(
    `admin/network/service-areas?${params.toString()}`,
  )) as PageResponse<ServiceArea>;
}

export async function getCoverages(params: URLSearchParams) {
  return (await apiRequest(
    `admin/network/coverages?${params.toString()}`,
  )) as PageResponse<ServiceAreaCoverage>;
}

export async function getProvinces() {
  return (await apiRequest("locations/provinces")) as Province[];
}

export async function getWards(provinceCode: string) {
  if (!provinceCode) return [];
  return (await apiRequest(
    `locations/provinces/${encodeURIComponent(provinceCode)}/wards`,
  )) as Ward[];
}

export async function getLanes(params: URLSearchParams) {
  return (await apiRequest(`admin/network/lanes?${params.toString()}`)) as PageResponse<HubLane>;
}

export async function getLaneSchedules(laneId: string) {
  return (await apiRequest(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules`,
  )) as LaneSchedule[];
}

export async function getRouteTemplates(params: URLSearchParams) {
  return (await apiRequest(
    `admin/network/route-templates?${params.toString()}`,
  )) as PageResponse<RouteTemplate>;
}

export async function planRoute(params: URLSearchParams) {
  return (await apiRequest(
    `admin/network/routing/plan?${params.toString()}`,
  )) as RoutePlan;
}

export async function getLaneCapacity(laneId: string, serviceDate: string) {
  return (await apiRequest(
    `admin/network/lanes/${encodeURIComponent(laneId)}/capacity?serviceDate=${encodeURIComponent(serviceDate)}`,
  )) as LaneCapacity;
}

export async function getCapacityReservation(shipmentId: string, routeRevision: number) {
  return (await apiRequest(
    `admin/network/capacity/reservations/${encodeURIComponent(shipmentId)}/revisions/${routeRevision}`,
  )) as CapacityReservation;
}

export async function getAuditLogs(params: URLSearchParams) {
  return (await apiRequest(
    `admin/network/audit?${params.toString()}`,
  )) as PageResponse<NetworkAuditLog>;
}
