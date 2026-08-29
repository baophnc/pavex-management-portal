import { apiRequest } from "@/lib/api/client";
import type {
  CreateRatePlanPayload,
  PricingAuditLog,
  PricingPageResponse,
  PricingQuote,
  PricingQuoteRequest,
  Province,
  RatePlan,
  RatePlanPayload,
  RatePlanStatus,
  RateRulePayload,
  PricingZone,
  ServiceLevel,
  Ward,
} from "@/features/pricing/contracts";

export async function getRatePlans(status?: RatePlanStatus | "") {
  const query = status ? `?status=${status}` : "";
  return (await apiRequest(`admin/pricing/rate-plans${query}`)) as RatePlan[];
}

export async function getCurrentRatePlan() {
  return (await apiRequest("admin/pricing/rate-plans/current")) as RatePlan;
}

export async function getRatePlan(id: string) {
  return (await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}`)) as RatePlan;
}

export async function createRatePlan(payload: CreateRatePlanPayload) {
  return (await apiRequest("admin/pricing/rate-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as RatePlan;
}

export async function updateRatePlan(id: string, payload: RatePlanPayload) {
  return (await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })) as RatePlan;
}

export async function createRatePlanRevision(
  id: string,
  payload: { name?: string; effectiveFrom?: string | null; effectiveTo?: string | null; reason?: string },
) {
  return (await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}/revisions`, {
    method: "POST",
    body: JSON.stringify(payload),
  })) as RatePlan;
}

export async function upsertRateRule(
  id: string,
  serviceLevel: ServiceLevel,
  pricingZone: PricingZone,
  payload: RateRulePayload,
) {
  return (await apiRequest(
    `admin/pricing/rate-plans/${encodeURIComponent(id)}/rules/${serviceLevel}/${pricingZone}`,
    { method: "PUT", body: JSON.stringify(payload) },
  )) as RatePlan;
}

export async function deleteRateRule(id: string, serviceLevel: ServiceLevel, pricingZone: PricingZone) {
  return (await apiRequest(
    `admin/pricing/rate-plans/${encodeURIComponent(id)}/rules/${serviceLevel}/${pricingZone}`,
    { method: "DELETE" },
  )) as RatePlan;
}

export async function activateRatePlan(id: string, reason?: string) {
  return (await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  })) as RatePlan;
}

export async function retireRatePlan(id: string, reason?: string) {
  return (await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}/retire`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  })) as RatePlan;
}

export async function deleteRatePlan(id: string, reason?: string) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
}

export async function createPricingQuote(payload: PricingQuoteRequest) {
  return (await apiRequest("pricing/quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  })) as PricingQuote;
}

export async function getPricingAudit(params: URLSearchParams) {
  return (await apiRequest(`admin/pricing/audit?${params.toString()}`)) as PricingPageResponse<PricingAuditLog>;
}

export async function getPricingAuditEntry(id: string) {
  return (await apiRequest(`admin/pricing/audit/${encodeURIComponent(id)}`)) as PricingAuditLog;
}

export async function getProvinces() {
  return (await apiRequest("locations/provinces")) as Province[];
}

export async function getWards(provinceCode: string) {
  if (!provinceCode) return [];
  return (await apiRequest(`locations/provinces/${encodeURIComponent(provinceCode)}/wards`)) as Ward[];
}
