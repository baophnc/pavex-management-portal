import type {
  AdminShipmentDetail,
  AdminShipmentPage,
} from "@/features/shipments/contracts";
import { apiRequest } from "@/lib/api/client";

export function getAdminShipments(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<AdminShipmentPage>(
    `admin/shipments${query ? `?${query}` : ""}`,
  );
}

export function getAdminShipment(trackingCode: string) {
  return apiRequest<AdminShipmentDetail>(
    `admin/shipments/${encodeURIComponent(trackingCode.trim())}`,
  );
}

export type AdminShipmentUpdate = {
  recipientName?: string;
  recipientPhone?: string;
  recipientAddressLine?: string;
  note?: string;
  reason: string;
};

/** Staff correct the recipient's contact details or the note; the reason goes on the timeline. */
export function updateAdminShipment(trackingCode: string, body: AdminShipmentUpdate) {
  return apiRequest<AdminShipmentDetail>(
    `admin/shipments/${encodeURIComponent(trackingCode.trim())}`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function getShipmentExceptionState(shipmentId: string) {
  return apiRequest<import("@/features/shipments/contracts").ShipmentExceptionState>(
    `admin/shipments/${encodeURIComponent(shipmentId)}/exceptions`,
  );
}

export function placeShipmentHold(
  shipmentId: string,
  input: import("@/features/shipments/contracts").ShipmentHoldInput,
) {
  return shipmentExceptionPost(shipmentId, "hold", input);
}

export function releaseShipmentHold(
  shipmentId: string,
  input: import("@/features/shipments/contracts").ShipmentHoldInput,
) {
  return shipmentExceptionPost(shipmentId, "hold/release", input);
}

export function requestShipmentReturn(shipmentId: string, reason: string) {
  return shipmentExceptionPost(shipmentId, "return-requests", { reason });
}

export function reviewShipmentReturn(
  shipmentId: string,
  requestId: string,
  input: import("@/features/shipments/contracts").ShipmentExceptionReviewInput,
) {
  return shipmentExceptionPost(
    shipmentId,
    `return-requests/${encodeURIComponent(requestId)}/review`,
    input,
  );
}

export function completeShipmentReturn(shipmentId: string, requestId: string, note: string | null) {
  return shipmentExceptionPost(
    shipmentId,
    `return-requests/${encodeURIComponent(requestId)}/complete`,
    { note },
  );
}

export function requestShipmentForward(
  shipmentId: string,
  input: import("@/features/shipments/contracts").ShipmentForwardInput,
) {
  return shipmentExceptionPost(shipmentId, "forward-requests", input);
}

export function reviewShipmentForward(
  shipmentId: string,
  requestId: string,
  input: import("@/features/shipments/contracts").ShipmentExceptionReviewInput,
) {
  return shipmentExceptionPost(
    shipmentId,
    `forward-requests/${encodeURIComponent(requestId)}/review`,
    input,
  );
}

export function completeShipmentForward(shipmentId: string, requestId: string, note: string | null) {
  return shipmentExceptionPost(
    shipmentId,
    `forward-requests/${encodeURIComponent(requestId)}/complete`,
    { note },
  );
}

export function requestShipmentCancellation(shipmentId: string, reason: string) {
  return shipmentExceptionPost(shipmentId, "cancellation-requests", { reason });
}

export function reviewShipmentCancellation(
  shipmentId: string,
  requestId: string,
  input: import("@/features/shipments/contracts").ShipmentExceptionReviewInput,
) {
  return shipmentExceptionPost(
    shipmentId,
    `cancellation-requests/${encodeURIComponent(requestId)}/review`,
    input,
  );
}

export function completeShipmentCancellation(shipmentId: string, requestId: string, note: string | null) {
  return shipmentExceptionPost(
    shipmentId,
    `cancellation-requests/${encodeURIComponent(requestId)}/complete`,
    { note },
  );
}

export function adjustShipmentWeight(
  shipmentId: string,
  input: import("@/features/shipments/contracts").ShipmentWeightAdjustmentInput,
) {
  return shipmentExceptionPost(shipmentId, "weight-adjustments", input);
}

export function reviewShipmentWeight(
  shipmentId: string,
  adjustmentId: string,
  note: string,
) {
  return shipmentExceptionPost(
    shipmentId,
    `weight-adjustments/${encodeURIComponent(adjustmentId)}/review`,
    { note },
  );
}

function shipmentExceptionPost(shipmentId: string, path: string, body: unknown) {
  return apiRequest<import("@/features/shipments/contracts").ShipmentExceptionState>(
    `admin/shipments/${encodeURIComponent(shipmentId)}/${path}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}


export function getShipmentCases(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/shipments/contracts").ShipmentCasePage>(
    `admin/shipment-cases${query ? `?${query}` : ""}`,
  );
}

export function getShipmentCaseSummary() {
  return apiRequest<import("@/features/shipments/contracts").ShipmentCaseMonitoringSummary>(
    "admin/shipment-cases/summary",
  );
}

export function getShipmentCase(caseId: string) {
  return apiRequest<import("@/features/shipments/contracts").ShipmentCase>(
    `admin/shipment-cases/${encodeURIComponent(caseId)}`,
  );
}

export function getShipmentForCase(trackingCode: string) {
  return apiRequest<AdminShipmentDetail>(
    `admin/shipment-cases/shipment-lookup/${encodeURIComponent(trackingCode.trim())}`,
  );
}

export function createProblemParcelCase(input: import("@/features/shipments/contracts").CreateProblemParcelCaseInput) {
  return shipmentCaseCreate("problem-parcels", input);
}

export function createUnidentifiedParcelCase(input: import("@/features/shipments/contracts").CreateUnidentifiedParcelCaseInput) {
  return shipmentCaseCreate("unidentified-parcels", input);
}

export function assignShipmentCase(caseId: string, assignedToUserId: string, note: string | null) {
  return shipmentCasePost(caseId, "assign", { assignedToUserId, note });
}

export function investigateShipmentCase(caseId: string, note: string | null) {
  return shipmentCasePost(caseId, "investigate", { note });
}

export function addShipmentCaseNote(caseId: string, note: string) {
  return shipmentCasePost(caseId, "notes", { note });
}

export function linkShipmentCase(caseId: string, shipmentId: string, parcelId: string | null, note: string | null) {
  return shipmentCasePost(caseId, "link", { shipmentId, parcelId, note });
}

export function resolveShipmentCase(caseId: string, resolution: string) {
  return shipmentCasePost(caseId, "resolve", { resolution });
}

export function closeShipmentCase(caseId: string, note: string | null) {
  return shipmentCasePost(caseId, "close", { note });
}

function shipmentCaseCreate(path: string, body: unknown) {
  return apiRequest<import("@/features/shipments/contracts").ShipmentCase>(
    `admin/shipment-cases/${path}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

function shipmentCasePost(caseId: string, path: string, body: unknown) {
  return apiRequest<import("@/features/shipments/contracts").ShipmentCase>(
    `admin/shipment-cases/${encodeURIComponent(caseId)}/${path}`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function getShipmentControlTowerOverview(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/shipments/contracts").ShipmentControlTowerOverview>(
    `admin/control-tower${query ? `?${query}` : ""}`,
  );
}



export function getShipmentExceptionQueue(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/shipments/contracts").ShipmentExceptionQueuePage>(
    `admin/shipment-exceptions${query ? `?${query}` : ""}`,
  );
}

export function getShipmentExceptionQueueSummary() {
  return apiRequest<import("@/features/shipments/contracts").ShipmentExceptionQueueSummary>(
    "admin/shipment-exceptions/summary",
  );
}
