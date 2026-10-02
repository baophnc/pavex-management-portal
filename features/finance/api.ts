import { ApiError, apiRequest } from "@/lib/api/client";

import type {
  ApprovedCash,
  CashCollection,
  CashCollectionStatus,
  CashRemittance,
  CashRemittanceStatus,
  Invoice,
  InvoiceListItem,
  InvoiceStatus,
  PayoutAccount,
  PayoutStatus,
  SettlementStatement,
  SettlementStatementDetail,
} from "./contracts";

function query(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return search.size ? `?${search}` : "";
}

const post = (body?: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body ?? {}) });

export const financeApi = {
  remittances: (status?: CashRemittanceStatus | "", hubId = "") =>
    apiRequest<CashRemittance[]>(`admin/billing/cash/remittances${query({ status, hubId })}`),
  collections: (status?: CashCollectionStatus | "", hubId = "") =>
    apiRequest<CashCollection[]>(`admin/billing/cash/collections${query({ status, hubId })}`),
  approveRemittance: (id: string) => apiRequest<CashRemittance>(`admin/billing/cash/remittances/${id}/approve`, post()),
  rejectRemittance: (id: string, reason: string) =>
    apiRequest<CashRemittance>(`admin/billing/cash/remittances/${id}/reject`, post({ reason })),
  approved: (from: string, to: string, hubId = "") =>
    apiRequest<ApprovedCash>(`admin/billing/cash/approved${query({ from, to, hubId })}`),
  approveCollection: (id: string) => apiRequest<CashCollection>(`admin/billing/cash/collections/${id}/approve`, post()),
  rejectCollection: (id: string, reason: string) =>
    apiRequest<CashCollection>(`admin/billing/cash/collections/${id}/reject`, post({ reason })),

  statements: (payoutStatus?: PayoutStatus | "", merchantId?: string) =>
    apiRequest<SettlementStatement[]>(`admin/billing/statements${query({ payoutStatus, merchantId })}`),
  statement: (id: string) => apiRequest<SettlementStatementDetail>(`admin/billing/statements/${id}`),
  generateStatements: (cutoffAt: string | null, merchantId: string | null) =>
    apiRequest<SettlementStatement[]>("admin/billing/statements/generate", post({ cutoffAt, merchantId })),
  recordPayout: (id: string, reference: string) =>
    apiRequest<SettlementStatement>(`admin/billing/statements/${id}/payout`, post({ reference })),
  /** null when the merchant has not registered a payout account. */
  payoutAccount: async (merchantId: string) => {
    try {
      return await apiRequest<PayoutAccount>(`admin/billing/merchants/${merchantId}/payout-account`);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 404) return null;
      throw reason;
    }
  },

  invoices: (status?: InvoiceStatus | "", merchantId?: string) =>
    apiRequest<InvoiceListItem[]>(`admin/billing/invoices${query({ status, merchantId })}`),
  invoice: (id: string) => apiRequest<Invoice>(`admin/billing/invoices/${id}`),
  recordCash: (id: string, amount: number, reference: string | null) =>
    apiRequest<Invoice>(`admin/billing/invoices/${id}/payments/cash`, post({ amount, reference })),
  cancelInvoice: (id: string, reason: string) => apiRequest<Invoice>(`admin/billing/invoices/${id}/cancel`, post({ reason })),
  confirmQr: (paymentId: string) => apiRequest<Invoice>(`admin/billing/payments/${paymentId}/confirm`, post()),
};
