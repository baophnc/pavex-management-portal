import type {
  AdminMerchantResponse,
  MerchantListResponse,
  MerchantReadiness,
  MerchantStatus,
  MerchantStatusReason,
} from "@/features/partners/contracts";
import { apiRequest } from "@/lib/api/client";

export type MerchantSearchParams = {
  page: number;
  pageSize: number;
  status?: MerchantStatus | "";
  search?: string;
  hubId?: string;
};

export function searchMerchants(params: MerchantSearchParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.hubId) query.set("hubId", params.hubId);
  return apiRequest<MerchantListResponse>(`admin/merchants?${query.toString()}`);
}

export function getMerchant(merchantId: string) {
  return apiRequest<AdminMerchantResponse>(`admin/merchants/${merchantId}`);
}

/** Restrictions and pickup addresses exactly as order creation evaluates them. */
export function getMerchantReadiness(merchantId: string) {
  return apiRequest<MerchantReadiness>(`admin/merchants/${merchantId}/readiness`);
}

export function changeMerchantStatus(
  merchantId: string,
  input: {
    status: MerchantStatus;
    reasonCode: MerchantStatusReason | null;
    reasonDetail: string | null;
  },
) {
  return apiRequest<AdminMerchantResponse>(
    `admin/merchants/${merchantId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}
