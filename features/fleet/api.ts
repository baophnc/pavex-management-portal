import { ApiError, apiRequest } from "@/lib/api/client";

import type { FleetTrack, FleetTrip, FleetTripStatus } from "./contracts";

export const fleetApi = {
  list: (status: FleetTripStatus, hubId: string) => {
    const query = new URLSearchParams({ status });
    if (hubId) query.set("hubId", hubId);
    return apiRequest<FleetTrip[]>(`fleet/trips?${query}`);
  },
  get: (id: string) => apiRequest<FleetTrip>(`fleet/trips/${encodeURIComponent(id)}`),
  /** The truck a parcel on this route leg rides on; null until the truck leaves. */
  byRouteLeg: (routeLegId: string) => apiRequest<FleetTrip | null>(`fleet/trips/by-route-leg/${encodeURIComponent(routeLegId)}`),
  track: (id: string) => apiRequest<FleetTrack>(`fleet/trips/${encodeURIComponent(id)}/track`),
};

const messages: Record<string, string> = {
  trip_not_found: "Không tìm thấy chuyến xe này, hoặc chuyến không thuộc bưu cục bạn quản lý.",
  hub_out_of_scope: "Bạn chỉ xem được chuyến xe đi hoặc đến bưu cục mình quản lý.",
  operations_unavailable: "Chưa lấy được danh sách bưu cục của bạn. Hãy thử lại sau ít phút.",
};

export function fleetErrorMessage(reason: unknown, fallback = "Không thể tải dữ liệu chuyến xe.") {
  if (reason instanceof ApiError) {
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Bạn không có quyền xem chuyến xe.";
    if (reason.status >= 500) return "Hệ thống đang bận. Hãy thử lại sau.";
  }
  return fallback;
}
