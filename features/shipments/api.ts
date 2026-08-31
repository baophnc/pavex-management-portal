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
