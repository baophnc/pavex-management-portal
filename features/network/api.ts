import { apiRequest } from "@/lib/api/client";
import type {
  CapacityReservation,
  CoveragePayload,
  CreateHubLanePayload,
  CreateHubPayload,
  CreateLaneSchedulePayload,
  CreateNetworkRegionPayload,
  CreateRouteTemplatePayload,
  CreateServiceAreaPayload,
  Hub,
  HubLane,
  LaneCapacity,
  LaneSchedule,
  NetworkAuditLog,
  NetworkRegion,
  NetworkStatusPayload,
  PageResponse,
  Province,
  ReserveLaneCapacityPayload,
  RoutePlan,
  RouteTemplate,
  ServiceArea,
  ServiceAreaCoverage,
  ServiceAreaResolution,
  UpdateHubLanePayload,
  UpdateHubPayload,
  UpdateLaneSchedulePayload,
  UpdateNetworkRegionPayload,
  UpdateRouteTemplatePayload,
  UpdateServiceAreaPayload,
  Ward,
} from "@/features/network/contracts";

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export async function getRegions(activeOnly = false) {
  return apiRequest<NetworkRegion[]>(
    `admin/network/regions?activeOnly=${String(activeOnly)}`,
  );
}

export async function createRegion(payload: CreateNetworkRegionPayload) {
  return apiRequest<NetworkRegion>("admin/network/regions", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateRegion(id: string, payload: UpdateNetworkRegionPayload) {
  return apiRequest<NetworkRegion>(`admin/network/regions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: jsonBody(payload),
  });
}

export async function updateRegionStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<NetworkRegion>(
    `admin/network/regions/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(payload) },
  );
}

export async function getHubs(params: URLSearchParams) {
  return apiRequest<PageResponse<Hub>>(`admin/network/hubs?${params.toString()}`);
}

export async function getAllHubs() {
  const first = await getHubs(
    new URLSearchParams({ page: "1", pageSize: "100" }),
  );

  if (first.totalPages <= 1) return first.items;

  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      getHubs(
        new URLSearchParams({
          page: String(index + 2),
          pageSize: "100",
        }),
      ),
    ),
  );

  return [first, ...remaining].flatMap((page) => page.items);
}

export async function createHub(payload: CreateHubPayload) {
  return apiRequest<Hub>("admin/network/hubs", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateHub(id: string, payload: UpdateHubPayload) {
  return apiRequest<Hub>(`admin/network/hubs/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: jsonBody(payload),
  });
}

export async function updateHubStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<Hub>(`admin/network/hubs/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}

export async function getServiceAreas(params: URLSearchParams) {
  return apiRequest<PageResponse<ServiceArea>>(
    `admin/network/service-areas?${params.toString()}`,
  );
}

export async function createServiceArea(payload: CreateServiceAreaPayload) {
  return apiRequest<ServiceArea>("admin/network/service-areas", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateServiceArea(id: string, payload: UpdateServiceAreaPayload) {
  return apiRequest<ServiceArea>(
    `admin/network/service-areas/${encodeURIComponent(id)}`,
    { method: "PUT", body: jsonBody(payload) },
  );
}

export async function updateServiceAreaStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<ServiceArea>(
    `admin/network/service-areas/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(payload) },
  );
}

export async function getCoverages(params: URLSearchParams) {
  return apiRequest<PageResponse<ServiceAreaCoverage>>(
    `admin/network/coverages?${params.toString()}`,
  );
}

export async function createCoverage(payload: CoveragePayload) {
  return apiRequest<ServiceAreaCoverage>("admin/network/coverages", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateCoverage(id: string, payload: CoveragePayload) {
  return apiRequest<ServiceAreaCoverage>(
    `admin/network/coverages/${encodeURIComponent(id)}`,
    { method: "PUT", body: jsonBody(payload) },
  );
}

export async function updateCoverageStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<ServiceAreaCoverage>(
    `admin/network/coverages/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(payload) },
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

export async function createLane(payload: CreateHubLanePayload) {
  return apiRequest<HubLane>("admin/network/lanes", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateLane(id: string, payload: UpdateHubLanePayload) {
  return apiRequest<HubLane>(`admin/network/lanes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: jsonBody(payload),
  });
}

export async function updateLaneStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<HubLane>(`admin/network/lanes/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: jsonBody(payload),
  });
}

export async function getLaneSchedules(laneId: string) {
  return apiRequest<LaneSchedule[]>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules`,
  );
}

export async function createLaneSchedule(laneId: string, payload: CreateLaneSchedulePayload) {
  return apiRequest<LaneSchedule>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules`,
    { method: "POST", body: jsonBody(payload) },
  );
}

export async function updateLaneSchedule(
  laneId: string,
  scheduleId: string,
  payload: UpdateLaneSchedulePayload,
) {
  return apiRequest<LaneSchedule>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules/${encodeURIComponent(scheduleId)}`,
    { method: "PUT", body: jsonBody(payload) },
  );
}

export async function updateLaneScheduleStatus(
  laneId: string,
  scheduleId: string,
  payload: NetworkStatusPayload,
) {
  return apiRequest<LaneSchedule>(
    `admin/network/lanes/${encodeURIComponent(laneId)}/schedules/${encodeURIComponent(scheduleId)}/status`,
    { method: "PATCH", body: jsonBody(payload) },
  );
}

export async function getRouteTemplates(params: URLSearchParams) {
  return apiRequest<PageResponse<RouteTemplate>>(
    `admin/network/route-templates?${params.toString()}`,
  );
}

export async function createRouteTemplate(payload: CreateRouteTemplatePayload) {
  return apiRequest<RouteTemplate>("admin/network/route-templates", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function updateRouteTemplate(id: string, payload: UpdateRouteTemplatePayload) {
  return apiRequest<RouteTemplate>(
    `admin/network/route-templates/${encodeURIComponent(id)}`,
    { method: "PUT", body: jsonBody(payload) },
  );
}

export async function updateRouteTemplateStatus(id: string, payload: NetworkStatusPayload) {
  return apiRequest<RouteTemplate>(
    `admin/network/route-templates/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(payload) },
  );
}

export async function deleteRouteTemplate(id: string, reason?: string) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  await apiRequest(`admin/network/route-templates/${encodeURIComponent(id)}${query}`, {
    method: "DELETE",
  });
}

export async function resolveNetworkLocation(provinceCode: string, wardCode: string) {
  const params = new URLSearchParams({ provinceCode, wardCode });
  return apiRequest<ServiceAreaResolution>(
    `admin/network/routing/resolve?${params.toString()}`,
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

export async function reserveCapacity(payload: ReserveLaneCapacityPayload) {
  return apiRequest<CapacityReservation>("admin/network/capacity/reservations", {
    method: "POST",
    body: jsonBody(payload),
  });
}

export async function releaseCapacityReservation(
  shipmentId: string,
  routeRevision: number,
  reason?: string,
) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return apiRequest<CapacityReservation>(
    `admin/network/capacity/reservations/${encodeURIComponent(shipmentId)}/revisions/${routeRevision}/release${query}`,
    { method: "POST" },
  );
}

export async function consumeCapacityLeg(
  shipmentId: string,
  routeRevision: number,
  legSequence: number,
) {
  return apiRequest<CapacityReservation>(
    `admin/network/capacity/reservations/${encodeURIComponent(shipmentId)}/revisions/${routeRevision}/legs/${legSequence}/consume`,
    { method: "POST" },
  );
}

export async function getAuditLogs(params: URLSearchParams) {
  return apiRequest<PageResponse<NetworkAuditLog>>(
    `admin/network/audit?${params.toString()}`,
  );
}

export async function getAuditLog(id: string) {
  return apiRequest<NetworkAuditLog>(`admin/network/audit/${encodeURIComponent(id)}`);
}
