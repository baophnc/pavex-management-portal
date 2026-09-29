"use client";

import { LandmarkIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { financeApi } from "@/features/finance/api";
import {
  type PayoutAccount,
  type PayoutStatus,
  type SettlementStatement,
  type SettlementStatementDetail,
  invoiceStatusLabels,
  payoutStatusLabels,
  shortId,
} from "@/features/finance/contracts";
import { financeErrorMessage } from "@/features/finance/errors";
import { FinanceDialog, StatusPill } from "@/features/finance/ui";
import { dateTime, money, PricingError, PricingField, PricingLoading, PricingPageHeader, selectClassName } from "@/features/pricing/ui";

const payoutTone = { NOT_REQUIRED: "muted", PENDING: "warning", PAID: "success" } as const;

function toLocalInput(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

/** Periodic COD settlement: COD approved at hubs is offset against merchant shipping fees. */
export function Settlements() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("billing.manage");
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus | "">("");
  const [items, setItems] = useState<SettlementStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [cutoff, setCutoff] = useState("");
  const [maxCutoff, setMaxCutoff] = useState("");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SettlementStatement | null>(null);

  useEffect(() => {
    let active = true;
    financeApi.statements(payoutStatus)
      .then((result) => { if (active) { setItems(result); setError(null); } })
      .catch((reason) => { if (active) setError(financeErrorMessage(reason, "Không thể tải kỳ đối soát.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [payoutStatus, refreshKey]);

  const reload = () => { setLoading(true); setRefreshKey((value) => value + 1); };

  const openGenerate = () => {
    const now = toLocalInput(new Date());
    setCutoff(now);
    setMaxCutoff(now);
    setMerchantFilter("");
    setGenerateOpen(true);
  };

  const generate = async () => {
    setSaving(true);
    try {
      const created = await financeApi.generateStatements(
        cutoff ? new Date(cutoff).toISOString() : null,
        merchantFilter.trim() || null,
      );
      setGenerateOpen(false);
      toast.success(created.length ? `Đã lập ${created.length} kỳ đối soát.` : "Không có khoản nào cần đối soát đến thời điểm này.");
      reload();
    } catch (reason) {
      toast.error(financeErrorMessage(reason, "Không thể lập đối soát."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Tài chính"
        title="Đối soát Merchant"
        description="Mỗi kỳ, tiền thu hộ đã được duyệt được cấn trừ vào cước vận chuyển của Merchant. Phần thu hộ còn dư được chuyển khoản cho Merchant; phần cước còn thiếu nằm trong hóa đơn để Merchant thanh toán."
        help={{
          description: "Bấm “Lập đối soát” và chọn thời điểm chốt số liệu. Mỗi Merchant có khoản chưa đối soát sẽ có một kỳ mới. Sau khi chuyển khoản, ghi lại mã giao dịch ngân hàng vào kỳ đó.",
          bullets: [
            "Chỉ tiền thu hộ đã được duyệt ở “Duyệt tiền nộp” mới vào đối soát.",
            "Mỗi vận đơn chỉ vào đối soát một lần; lập lại không tạo trùng.",
            "Cước của đơn hoàn về luôn tính cho Merchant, kể cả đơn người nhận trả cước.",
          ],
        }}
        actions={
          <>
            <Button variant="outline" onClick={reload}><RefreshCwIcon className="size-4" />Làm mới</Button>
            {canManage ? <Button onClick={openGenerate}><PlusIcon className="size-4" />Lập đối soát</Button> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${selectClassName} w-auto text-xs font-bold`} value={payoutStatus} onChange={(event) => { setLoading(true); setPayoutStatus(event.target.value as PayoutStatus | ""); }}>
          <option value="">Tất cả kỳ</option>
          <option value="PENDING">Chờ chuyển khoản</option>
          <option value="PAID">Đã chuyển khoản</option>
          <option value="NOT_REQUIRED">Không cần chuyển</option>
        </select>
        <span className="text-xs text-muted-foreground">{items.length} kỳ</span>
      </div>

      {loading ? <PricingLoading label="Đang tải kỳ đối soát..." /> : error ? <PricingError message={error} onRetry={reload} /> : items.length ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-b bg-muted/25 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Kỳ</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3 text-right">Thu hộ</th>
                <th className="px-4 py-3 text-right">Cước</th>
                <th className="px-4 py-3 text-right">Chuyển Merchant</th>
                <th className="px-4 py-3 text-right">Merchant còn nợ</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((statement) => (
                <tr key={statement.id} className="cursor-pointer hover:bg-muted/20" onClick={() => setSelected(statement)}>
                  <td className="px-4 py-3"><p className="font-mono font-black">{statement.statementNumber}</p><p className="mt-1 text-muted-foreground">chốt {dateTime(statement.cutoffAt)}</p></td>
                  <td className="px-4 py-3 font-mono" title={statement.merchantId}>{shortId(statement.merchantId)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(statement.codTotal)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(statement.feeTotal)}</td>
                  <td className="px-4 py-3 text-right font-black tabular-nums">{money(statement.payoutAmount)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money(statement.invoice?.balanceAmount ?? 0)}</td>
                  <td className="px-4 py-3"><StatusPill tone={payoutTone[statement.payoutStatus]}>{payoutStatusLabels[statement.payoutStatus]}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : <Card className="p-5 text-sm text-muted-foreground">Chưa có kỳ đối soát phù hợp bộ lọc.</Card>}

      <FinanceDialog
        open={generateOpen}
        title="Lập đối soát"
        description="Đối soát mọi tiền thu hộ đã duyệt và cước của đơn đã kết thúc tính đến thời điểm chốt. Để trống Merchant để lập cho tất cả."
        confirmLabel="Lập đối soát"
        loading={saving}
        onCancel={() => setGenerateOpen(false)}
        onConfirm={generate}
      >
        <PricingField label="Chốt số liệu đến">
          <Input type="datetime-local" value={cutoff} max={maxCutoff} disabled={saving} onChange={(event) => setCutoff(event.target.value)} />
        </PricingField>
        <PricingField label="Chỉ một Merchant (mã Merchant, không bắt buộc)">
          <Input value={merchantFilter} disabled={saving} placeholder="UUID Merchant" onChange={(event) => setMerchantFilter(event.target.value)} />
        </PricingField>
      </FinanceDialog>

      {selected ? (
        <StatementPanel
          key={selected.id}
          statement={selected}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onChanged={(next) => {
            setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
            setSelected(next);
          }}
        />
      ) : null}
    </div>
  );
}

function StatementPanel({
  statement,
  canManage,
  onClose,
  onChanged,
}: {
  statement: SettlementStatement;
  canManage: boolean;
  onClose: () => void;
  onChanged: (statement: SettlementStatement) => void;
}) {
  const [detail, setDetail] = useState<SettlementStatementDetail | null>(null);
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([financeApi.statement(statement.id), financeApi.payoutAccount(statement.merchantId)])
      .then(([result, payout]) => { if (active) { setDetail(result); setAccount(payout); } })
      .catch((reason) => { if (active) setError(financeErrorMessage(reason, "Không thể tải chi tiết đối soát.")); });
    return () => { active = false; };
  }, [statement.id, statement.merchantId]);

  const recordPayout = async (reference: string) => {
    setSaving(true);
    try {
      const next = await financeApi.recordPayout(statement.id, reference);
      toast.success("Đã ghi nhận chuyển khoản cho Merchant.");
      setPayoutOpen(false);
      onChanged(next);
    } catch (reason) {
      toast.error(financeErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const current = detail?.statement ?? statement;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/35" role="presentation" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l bg-card shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-card p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Kỳ đối soát</p>
            <h2 className="mt-1 font-mono text-lg font-black">{current.statementNumber}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Merchant <span className="font-mono">{current.merchantId}</span> · chốt {dateTime(current.cutoffAt)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Đóng"><XIcon className="size-4" /></Button>
        </div>

        <div className="grid gap-4 p-5">
          <dl className="grid gap-2 rounded-lg border p-4 text-sm">
            <Row label="Tiền thu hộ đã duyệt" value={money(current.codTotal)} />
            <Row label="Cước Merchant phải trả" value={`− ${money(current.feeTotal)}`} />
            <Row label="Cấn trừ" value={money(current.offsetAmount)} muted />
            <div className="mt-1 flex justify-between border-t pt-2 font-black"><dt>Chuyển cho Merchant</dt><dd className="tabular-nums text-brand">{money(current.payoutAmount)}</dd></div>
            {current.invoice ? (
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Hóa đơn {current.invoice.invoiceNumber} · {invoiceStatusLabels[current.invoice.status]}</dt>
                <dd className="tabular-nums">còn {money(current.invoice.balanceAmount)}</dd>
              </div>
            ) : null}
          </dl>

          {current.payoutAmount > 0 ? (
            <section className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-black"><LandmarkIcon className="size-4 text-brand" />Chuyển khoản</h3>
                <StatusPill tone={payoutTone[current.payoutStatus]}>{payoutStatusLabels[current.payoutStatus]}</StatusPill>
              </div>
              {current.payoutStatus === "PAID" ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Mã giao dịch <strong className="text-foreground">{current.payoutReference}</strong> · {current.paidAt ? dateTime(current.paidAt) : ""}<br />
                  {current.payoutBankName} · {current.payoutAccountNumber} · {current.payoutAccountName}
                </p>
              ) : account ? (
                <>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Chuyển <strong className="text-foreground">{money(current.payoutAmount)}</strong> tới {account.bankName} · <span className="font-mono">{account.accountNumber}</span> · {account.accountName}
                  </p>
                  {canManage ? <Button size="sm" className="mt-3" onClick={() => setPayoutOpen(true)}>Ghi nhận đã chuyển khoản</Button> : null}
                </>
              ) : (
                <p className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">Merchant chưa đăng ký tài khoản nhận tiền. Liên hệ Merchant cập nhật trong trang Đối soát trên cổng khách hàng.</p>
              )}
            </section>
          ) : null}

          {error ? <PricingError message={error} /> : !detail ? <PricingLoading label="Đang tải chi tiết..." /> : (
            <>
              <LineSection title={`Tiền thu hộ (${detail.codLines.length})`} rows={detail.codLines.map((line) => ({ code: line.trackingCode, note: `thu ${dateTime(line.collectedAt)}`, amount: line.codAmount }))} />
              <LineSection title={`Cước vận chuyển (${detail.feeLines.length})`} rows={detail.feeLines.map((line) => ({ code: line.trackingCode, note: line.finalStatus === "RETURNED" ? "đơn hoàn" : "đã giao", amount: line.amount }))} />
            </>
          )}
        </div>
      </aside>

      <FinanceDialog
        open={payoutOpen}
        title="Ghi nhận đã chuyển khoản?"
        description={`Xác nhận đã chuyển ${money(current.payoutAmount)} cho Merchant. Thao tác này không hoàn tác được.`}
        confirmLabel="Ghi nhận"
        input={{ label: "Mã giao dịch ngân hàng", placeholder: "FT26268XXXXX", required: true }}
        loading={saving}
        onCancel={() => setPayoutOpen(false)}
        onConfirm={recordPayout}
      />
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return <div className={`flex justify-between gap-3 ${muted ? "text-muted-foreground" : ""}`}><dt>{label}</dt><dd className="tabular-nums">{value}</dd></div>;
}

function LineSection({ title, rows }: { title: string; rows: Array<{ code: string; note: string; amount: number }> }) {
  return (
    <section className="rounded-lg border">
      <h3 className="border-b bg-muted/25 px-4 py-2 text-xs font-black">{title}</h3>
      {rows.length ? (
        <div className="divide-y text-xs">
          {rows.map((row) => (
            <div key={row.code} className="flex items-center justify-between gap-3 px-4 py-2">
              <Link href={`/shipments/${encodeURIComponent(row.code)}`} className="font-mono font-bold text-brand hover:underline">{row.code}</Link>
              <span className="text-muted-foreground">{row.note}</span>
              <span className="tabular-nums font-bold">{money(row.amount)}</span>
            </div>
          ))}
        </div>
      ) : <p className="px-4 py-3 text-xs text-muted-foreground">Không có.</p>}
    </section>
  );
}
