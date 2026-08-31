import { apiRequest } from "@/lib/api/client";
import type {
  CreateRatePlanPayload,
  PricingAuditLog,
  PricingPageResponse,
  PricingQuote,
  PricingQuoteRequest,
  PricingQuoteSnapshot,
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
  return apiRequest<RatePlan[]>(`admin/pricing/rate-plans${query}`);
}

export async function getCurrentRatePlan() {
  return apiRequest<RatePlan>("admin/pricing/rate-plans/current");
}

export async function getRatePlan(id: string) {
  return apiRequest<RatePlan>(`admin/pricing/rate-plans/${encodeURIComponent(id)}`);
}

export async function createRatePlan(payload: CreateRatePlanPayload) {
  return apiRequest<RatePlan>("admin/pricing/rate-plans", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRatePlan(id: string, payload: RatePlanPayload) {
  return apiRequest<RatePlan>(`admin/pricing/rate-plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function createRatePlanRevision(
  id: string,
  payload: { name?: string; effectiveFrom?: string | null; effectiveTo?: string | null; reason?: string },
) {
  return apiRequest<RatePlan>(`admin/pricing/rate-plans/${encodeURIComponent(id)}/revisions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function upsertRateRule(
  id: string,
  serviceLevel: ServiceLevel,
  pricingZone: PricingZone,
  payload: RateRulePayload,
) {
  return apiRequest<RatePlan>(
    `admin/pricing/rate-plans/${encodeURIComponent(id)}/rules/${serviceLevel}/${pricingZone}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export async function deleteRateRule(id: string, serviceLevel: ServiceLevel, pricingZone: PricingZone) {
  return apiRequest<RatePlan>(
    `admin/pricing/rate-plans/${encodeURIComponent(id)}/rules/${serviceLevel}/${pricingZone}`,
    { method: "DELETE" },
  );
}

export async function activateRatePlan(id: string, reason?: string) {
  return apiRequest<RatePlan>(`admin/pricing/rate-plans/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function retireRatePlan(id: string, reason?: string) {
  return apiRequest<RatePlan>(`admin/pricing/rate-plans/${encodeURIComponent(id)}/retire`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || null }),
  });
}

export async function deleteRatePlan(id: string, reason?: string) {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  await apiRequest(`admin/pricing/rate-plans/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
}

export async function createPricingQuote(payload: PricingQuoteRequest) {
  return apiRequest<PricingQuote>("pricing/quotes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPricingQuoteSnapshot(quoteId: string) {
  return apiRequest<PricingQuoteSnapshot>(
    `admin/pricing/quotes/${encodeURIComponent(quoteId)}`,
  );
}

export async function getPricingAudit(params: URLSearchParams) {
  return apiRequest<PricingPageResponse<PricingAuditLog>>(`admin/pricing/audit?${params.toString()}`);
}

export async function getPricingAuditEntry(id: string) {
  return apiRequest<PricingAuditLog>(`admin/pricing/audit/${encodeURIComponent(id)}`);
}

export async function getProvinces() {
  return apiRequest<Province[]>("locations/provinces");
}

export async function getWards(provinceCode: string) {
  if (!provinceCode) return [];
  return apiRequest<Ward[]>(`locations/provinces/${encodeURIComponent(provinceCode)}/wards`);
}
