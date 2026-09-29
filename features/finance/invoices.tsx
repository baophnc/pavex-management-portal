"use client";

import { BanknoteIcon, RefreshCwIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import { financeApi } from "@/features/finance/api";
import {
  type Invoice,
  type InvoiceListItem,
  type InvoicePayment,
  type InvoiceStatus,
  invoiceStatusLabels,
  paymentMethodLabel,
  paymentStatusLabels,
  shortId,
} from "@/features/finance/contracts";
import { financeErrorMessage } from "@/features/finance/errors";
import { FinanceDialog, StatusPill } from "@/features/finance/ui";
import {
  dateTime,
  money,
  PricingError,
  PricingField,
  PricingLoading,
  PricingMoneyInput,
  PricingPageHeader,
  selectClassName,
} from "@/features/pricing/ui";

const invoiceTone = { ISSUED: "warning", PARTIALLY_PAID: "brand", PAID: "success", CANCELLED: "muted" } as const;

/** Merchant invoices: the shipping fees left after each settlement's COD offset. */
export function Invoices() {
  const [status, setStatus] = useState<InvoiceStatus | "">("");
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    financeApi.invoices(status)
      .then((result) => { if (active) { setItems(result); setError(null); } })
      .catch((reason) => { if (active) setError(financeErrorMessage(reason, "Không thể tải hóa đơn.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, refreshKey]);

  const reload = () => { setLoading(true); setRefreshKey((value) => value + 1); };

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Tài chính"
        title="Hóa đơn Merchant"
        description="Hóa đơn được lập tự động khi đối soát: mỗi dòng là cước của một vận đơn, phần đã cấn trừ bằng tiền thu hộ hiện là một khoản thanh toán. Merchant trả phần còn lại bằng QR; tiền mặt hoặc chuyển khoản trực tiếp được ghi nhận tại đây."
        actions={<Button variant="outline" onClick={reload}><RefreshCwIcon className="size-4" />Làm mới</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${selectClassName} w-auto text-xs font-bold`} value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as InvoiceStatus | ""); }}>
          <option value="">Tất cả hóa đơn</option>
          <option value="ISSUED">{invoiceStatusLabels.ISSUED}</option>
          <option value="PARTIALLY_PAID">{invoiceStatusLabels.PARTIALLY_PAID}</option>
          <option value="PAID">{invoiceStatusLabels.PAID}</option>
          <option value="CANCELLED">{invoiceStatusLabels.CANCELLED}</option>
        </select>
        <span className="text-xs text-muted-foreground">{items.length} hóa đơn</span>
      </div>

      {loading ? <PricingLoading label="Đang tải hóa đơn..." /> : error ? <PricingError message={error} onRetry={reload} /> : items.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b bg-muted/25 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Hóa đơn</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3 text-right">Tổng</th>
                <th className="px-4 py-3 text-right">Đã trả</th>
                <th className="px-4 py-3 text-right">Còn lại</th>
                <th className="px-4 py-3">Hạn</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((invoice) => (
                <tr key={invoice.id} className="cursor-pointer hover:bg-muted/20" onClick={() => setSelectedId(invoice.id)}>
                  <td className="px-4 py-3 font-mono font-black">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3 font-mono" title={invoice.merchantId}>{shortId(invoice.merchantId)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(invoice.totalAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(invoice.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-black tabular-nums">{money(invoice.balanceAmount)}</td>
                  <td className="px-4 py-3">{dateTime(invoice.dueAt)}</td>
                  <td className="px-4 py-3"><StatusPill tone={invoiceTone[invoice.status]}>{invoiceStatusLabels[invoice.status]}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : <Card className="p-5 text-sm text-muted-foreground">Chưa có hóa đơn phù hợp bộ lọc.</Card>}

      {selectedId ? (
        <InvoicePanel
          key={selectedId}
          invoiceId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={(next) => setItems((current) => current.map((item) => (item.id === next.id ? { ...item, ...next } : item)))}
        />
      ) : null}
    </div>
  );
}

type PanelAction = "cash" | "cancel" | { confirm: InvoicePayment };

function InvoicePanel({ invoiceId, onClose, onChanged }: { invoiceId: string; onClose: () => void; onChanged: (invoice: Invoice) => void }) {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("billing.manage");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<PanelAction | null>(null);
  const [cashAmount, setCashAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    financeApi.invoice(invoiceId)
      .then((result) => { if (active) setInvoice(result); })
      .catch((reason) => { if (active) setError(financeErrorMessage(reason, "Không thể tải hóa đơn.")); });
    return () => { active = false; };
  }, [invoiceId]);

  const apply = (next: Invoice, message: string) => {
    setInvoice(next);
    onChanged(next);
    setAction(null);
    toast.success(message);
  };

  const run = async (text: string) => {
    if (!invoice || !action) return;
    setSaving(true);
    try {
      if (action === "cash") {
        apply(await financeApi.recordCash(invoice.id, cashAmount, text || null), `Đã ghi nhận ${money(cashAmount)} tiền mặt.`);
      } else if (action === "cancel") {
        apply(await financeApi.cancelInvoice(invoice.id, text), "Đã hủy hóa đơn.");
      } else {
        apply(await financeApi.confirmQr(action.confirm.id), "Đã xác nhận thanh toán QR.");
      }
    } catch (reason) {
      toast.error(financeErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const payable = invoice !== null && invoice.balanceAmount > 0 && invoice.status !== "CANCELLED";

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l bg-card shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-card p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Hóa đơn</p>
            <h2 className="mt-1 font-mono text-lg font-black">{invoice?.invoiceNumber ?? "…"}</h2>
            {invoice ? <p className="mt-1 text-xs text-muted-foreground">Merchant <span className="font-mono">{invoice.merchantId}</span> · hạn {dateTime(invoice.dueAt)}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng"><XIcon className="size-4" /></Button>
        </div>

        {error ? <div className="p-5"><PricingError message={error} /></div> : !invoice ? <div className="p-5"><PricingLoading label="Đang tải hóa đơn..." /></div> : (
          <div className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div><p className="text-muted-foreground">Tổng</p><p className="mt-1 font-black tabular-nums">{money(invoice.totalAmount)}</p></div>
                <div><p className="text-muted-foreground">Đã trả</p><p className="mt-1 font-black tabular-nums">{money(invoice.paidAmount)}</p></div>
                <div><p className="text-muted-foreground">Còn lại</p><p className="mt-1 font-black tabular-nums text-brand">{money(invoice.balanceAmount)}</p></div>
              </div>
              <StatusPill tone={invoiceTone[invoice.status]}>{invoiceStatusLabels[invoice.status]}</StatusPill>
            </div>

            {canManage && invoice.status !== "CANCELLED" ? (
              <div className="flex flex-wrap gap-2">
                {payable ? <Button size="sm" onClick={() => { setCashAmount(invoice.balanceAmount); setAction("cash"); }}><BanknoteIcon className="size-3.5" />Ghi nhận tiền mặt</Button> : null}
                {invoice.paidAmount === 0 ? <Button size="sm" variant="outline" onClick={() => setAction("cancel")}>Hủy hóa đơn</Button> : null}
              </div>
            ) : null}
            {invoice.cancellationReason ? <p className="rounded-md bg-destructive/5 p-3 text-xs text-destructive">Đã hủy: {invoice.cancellationReason}</p> : null}

            <section className="rounded-lg border">
              <h3 className="border-b bg-muted/25 px-4 py-2 text-xs font-black">Thanh toán ({invoice.payments.length})</h3>
              {invoice.payments.length ? (
                <div className="divide-y text-xs">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
                      <div>
                        <p className="font-bold">{paymentMethodLabel(payment)}</p>
                        <p className="mt-0.5 font-mono text-muted-foreground">{payment.reference}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{paymentStatusLabels[payment.status]}</span>
                        <strong className="tabular-nums">{money(payment.amount)}</strong>
                        {canManage && payment.method === "QR" && payment.status === "PENDING" && payment.provider === "fake" ? (
                          <Button size="sm" variant="outline" onClick={() => setAction({ confirm: payment })}>Xác nhận (giả lập)</Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="px-4 py-3 text-xs text-muted-foreground">Chưa có khoản thanh toán.</p>}
            </section>

            <section className="rounded-lg border">
              <h3 className="border-b bg-muted/25 px-4 py-2 text-xs font-black">Cước theo vận đơn ({invoice.lines.length})</h3>
              <div className="divide-y text-xs">
                {invoice.lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-3 px-4 py-2">
                    <Link href={`/shipments/${encodeURIComponent(line.trackingCode)}`} className="font-mono font-bold text-brand hover:underline">{line.trackingCode}</Link>
                    <span className="tabular-nums font-bold">{money(line.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
            {invoice.note ? <p className="text-xs text-muted-foreground">{invoice.note}</p> : null}
          </div>
        )}
      </aside>

      <FinanceDialog
        open={action === "cash"}
        title="Ghi nhận tiền mặt"
        description="Ghi nhận khoản Merchant đã trả trực tiếp bằng tiền mặt hoặc chuyển khoản ngoài cổng QR."
        confirmLabel="Ghi nhận"
        input={{ label: "Mã tham chiếu", placeholder: "Số phiếu thu / mã giao dịch" }}
        loading={saving}
        onCancel={() => setAction(null)}
        onConfirm={run}
      >
        <PricingField label="Số tiền" hint={invoice ? `Tối đa ${money(invoice.balanceAmount)}` : undefined}>
          <PricingMoneyInput value={cashAmount} disabled={saving} onValueChange={setCashAmount} />
        </PricingField>
      </FinanceDialog>
      <FinanceDialog
        open={action === "cancel"}
        title="Hủy hóa đơn?"
        description="Cước trong hóa đơn sẽ không được thu nữa. Chỉ hủy khi cước bị tính sai hoặc được miễn."
        confirmLabel="Hủy hóa đơn"
        destructive
        input={{ label: "Lý do", required: true, multiline: true }}
        loading={saving}
        onCancel={() => setAction(null)}
        onConfirm={run}
      />
      <FinanceDialog
        open={typeof action === "object" && action !== null}
        title="Xác nhận thanh toán QR (giả lập)?"
        description="Chỉ dùng khi chạy thử với cổng thanh toán giả lập: đánh dấu mã QR này là đã được thanh toán."
        confirmLabel="Xác nhận"
        loading={saving}
        onCancel={() => setAction(null)}
        onConfirm={run}
      />
    </div>
  );
}
