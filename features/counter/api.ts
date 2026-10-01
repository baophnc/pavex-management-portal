import type {
  CounterContact,
  CounterSettlement,
  CounterSettlementStatus,
  CounterShipmentCreated,
  CreateCounterShipmentRequest,
  ShipmentLabels,
} from "@/features/counter/contracts";
import type { CashCollection } from "@/features/finance/contracts";
import { apiRequest } from "@/lib/api/client";

export function createCounterShipment(body: CreateCounterShipmentRequest, idempotencyKey: string) {
  return apiRequest<CounterShipmentCreated>("admin/shipments/counter", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
}

export function getShipmentLabels(trackingCode: string) {
  return apiRequest<ShipmentLabels>(`admin/shipments/${encodeURIComponent(trackingCode)}/labels`);
}

export function findCounterContacts(phone: string) {
  return apiRequest<CounterContact[]>(`partners/counter/contacts?phone=${encodeURIComponent(phone)}`);
}

export function saveCounterContact(body: {
  phone: string;
  name: string;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
}) {
  return apiRequest<CounterContact>("partners/counter/contacts", { method: "PUT", body: JSON.stringify(body) });
}

export function getCounterSettlements(
  hubId: string,
  filters: { status?: CounterSettlementStatus | ""; phone?: string; trackingCode?: string },
) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.phone?.trim()) query.set("phone", filters.phone.trim());
  if (filters.trackingCode?.trim()) query.set("trackingCode", filters.trackingCode.trim());
  return apiRequest<CounterSettlement[]>(
    `billing/cash/hubs/${encodeURIComponent(hubId)}/counter-settlements${query.size ? `?${query}` : ""}`,
  );
}

export function completeCounterSettlement(id: string, phone: string, note: string | null) {
  return apiRequest<CounterSettlement>(`billing/cash/counter-settlements/${encodeURIComponent(id)}/complete`, {
    method: "POST",
    body: JSON.stringify({ phone, note }),
  });
}

/** Cash the hub holds: fees walk-in senders paid at the counter, and cash finance sent back. */
export function getHubHeldCash(hubId: string) {
  return apiRequest<CashCollection[]>(`billing/cash/hubs/${encodeURIComponent(hubId)}/collections?status=HELD`);
}

/** Hands hub-held cash to finance for approval. */
export function sendHubCashToFinance(collectionId: string) {
  return apiRequest<CashCollection>(`billing/cash/collections/${encodeURIComponent(collectionId)}/resubmit`, { method: "POST" });
}
