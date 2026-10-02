// Billing admin API contracts (billing-service, /api/v1/admin/billing).

export type InvoiceStatus = "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type InvoicePaymentMethod = "CASH" | "QR" | "COD_OFFSET";
export type InvoicePaymentStatus = "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED";
export type PayoutStatus = "NOT_REQUIRED" | "PENDING" | "PAID";
export type CashCollectionStatus = "HELD" | "SUBMITTED" | "APPROVED";
export type CashRemittanceStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  merchantId: string;
  status: InvoiceStatus;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  issuedAt: string;
  dueAt: string;
};

export type InvoicePayment = {
  id: string;
  method: InvoicePaymentMethod;
  status: InvoicePaymentStatus;
  amount: number;
  reference: string;
  provider: string | null;
  qrExpiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type Invoice = InvoiceListItem & {
  currency: string;
  paidAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  note: string | null;
  lines: Array<{ id: string; sequence: number; shipmentId: string; trackingCode: string; amount: number }>;
  payments: InvoicePayment[];
};

export type SettlementStatement = {
  id: string;
  statementNumber: string;
  merchantId: string;
  cutoffAt: string;
  codTotal: number;
  feeTotal: number;
  offsetAmount: number;
  payoutAmount: number;
  payoutStatus: PayoutStatus;
  payoutReference: string | null;
  payoutBankName: string | null;
  payoutAccountNumber: string | null;
  payoutAccountName: string | null;
  paidAt: string | null;
  invoice: InvoiceListItem | null;
  createdAt: string;
};

export type SettlementStatementDetail = {
  statement: SettlementStatement;
  codLines: Array<{ shipmentId: string; trackingCode: string; codAmount: number; collectedAt: string; approvedAt: string | null }>;
  feeLines: Array<{ shipmentId: string; trackingCode: string; amount: number; shippingFeePayer: string; finalStatus: string; closedAt: string }>;
};

export type PayoutAccount = {
  merchantId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  updatedAt: string;
};

export type CashCollection = {
  id: string;
  shipmentId: string;
  trackingCode: string;
  /** Null for a walk-in (counter) shipment. */
  merchantId: string | null;
  /** DELIVERY: a courier took it on delivery; COUNTER: a walk-in sender paid it at the hub counter. */
  source: "DELIVERY" | "COUNTER";
  /** Who the COD belongs to: a merchant (settled) or the walk-in sender (paid back at the counter). */
  codPayee: "MERCHANT" | "SENDER";
  status: CashCollectionStatus;
  amount: number;
  codAmount: number;
  feeAmount: number;
  collectedByUserId: string;
  originHubId: string;
  currentHubId: string | null;
  currentRemittanceId: string | null;
  collectedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  lastRejectedAt: string | null;
  lastRejectionReason: string | null;
};

export type CashRemittance = {
  id: string;
  remittanceNumber: string;
  courierUserId: string;
  hubId: string;
  status: CashRemittanceStatus;
  expectedAmount: number;
  declaredAmount: number;
  submittedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  items: Array<{ collectionId: string; sequence: number; amount: number }>;
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  ISSUED: "Chờ thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};

export const paymentStatusLabels: Record<InvoicePaymentStatus, string> = {
  PENDING: "Đang chờ",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  EXPIRED: "Hết hạn",
};

export const payoutStatusLabels: Record<PayoutStatus, string> = {
  NOT_REQUIRED: "Không cần chuyển",
  PENDING: "Chờ chuyển khoản",
  PAID: "Đã chuyển khoản",
};

export const remittanceStatusLabels: Record<CashRemittanceStatus, string> = {
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

export function paymentMethodLabel(payment: Pick<InvoicePayment, "method" | "provider">) {
  if (payment.method === "COD_OFFSET") return "Cấn trừ tiền thu hộ";
  if (payment.method === "CASH") return "Tiền mặt";
  return payment.provider === "payos" ? "QR · PayOS" : `QR · ${payment.provider ?? "giả lập"}`;
}

/**
 * Cash finance approved in a period. Fees are Pavex revenue; COD is owed on to merchants
 * (settlement) or to walk-in senders (paid back at the counter).
 */
export type ApprovedCash = {
  from: string;
  to: string;
  count: number;
  totalAmount: number;
  feeRevenue: number;
  counterFeeRevenue: number;
  deliveryFeeRevenue: number;
  codOwedToMerchants: number;
  codOwedToSenders: number;
  /** Fees merchants pay themselves, netted in settlement; null when narrowed to one hub. */
  merchantFeeRevenue: number | null;
  items: CashCollection[];
};
