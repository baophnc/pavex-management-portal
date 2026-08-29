import { apiRequest } from "@/lib/api/client";
import type {
  Hub,
  NetworkRegion,
  PageResponse,
  Province,
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
