"use client";

import { CheckIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { financeApi } from "@/features/finance/api";
import {
  type CashCollection,
  type CashRemittance,
  type CashRemittanceStatus,
  remittanceStatusLabels,
  shortId,
} from "@/features/finance/contracts";
import { financeErrorMessage } from "@/features/finance/errors";
import { FinanceDialog, StatusPill } from "@/features/finance/ui";
import { dateTime, money, PricingError, PricingLoading, PricingPageHeader, selectClassName } from "@/features/pricing/ui";

type Action =
  | { kind: "approve-remittance" | "reject-remittance"; remittance: CashRemittance }
  | { kind: "approve-collection" | "reject-collection"; collection: CashCollection };

/** Finance approves the cash couriers hand to hubs; approved COD becomes payable to merchants. */
export function CashReview() {
  const [status, setStatus] = useState<CashRemittanceStatus | "">("SUBMITTED");
  const [remittances, setRemittances] = useState<CashRemittance[]>([]);
  const [collections, setCollections] = useState<CashCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [action, setAction] = useState<Action | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    // Recent collections of every status, to show each remittance line's tracking code.
    Promise.all([financeApi.remittances(status), financeApi.collections("")])
      .then(([items, recent]) => {
        if (!active) return;
        setRemittances(items);
        setCollections(recent);
        setError(null);
      })
      .catch((reason) => { if (active) setError(financeErrorMessage(reason, "Không thể tải tiền nộp.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, refreshKey]);

  const reload = () => { setLoading(true); setRefreshKey((value) => value + 1); };
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  const resubmitted = collections.filter((collection) => collection.status === "SUBMITTED" && collection.currentRemittanceId === null);

  const run = async (reason: string) => {
    if (!action) return;
    setSaving(true);
    try {
      switch (action.kind) {
        case "approve-remittance":
          await financeApi.approveRemittance(action.remittance.id);
          toast.success(`Đã duyệt ${money(action.remittance.expectedAmount)} của lô ${action.remittance.remittanceNumber}.`);
          break;
        case "reject-remittance":
          await financeApi.rejectRemittance(action.remittance.id, reason);
          toast.success("Đã từ chối lô tiền; tiền được giữ tại bưu cục để kiểm đếm lại.");
          break;
        case "approve-collection":
          await financeApi.approveCollection(action.collection.id);
          toast.success(`Đã duyệt ${money(action.collection.amount)} của đơn ${action.collection.trackingCode}.`);
          break;
        case "reject-collection":
          await financeApi.rejectCollection(action.collection.id, reason);
          toast.success("Đã trả khoản tiền về bưu cục.");
          break;
      }
      setAction(null);
      reload();
    } catch (reasonValue) {
      toast.error(financeErrorMessage(reasonValue));
    } finally {
      setSaving(false);
    }
  };

  const approving = action?.kind === "approve-remittance" || action?.kind === "approve-collection";
  const actionAmount = action ? ("remittance" in action ? action.remittance.expectedAmount : action.collection.amount) : 0;

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Tài chính"
        title="Duyệt tiền nộp"
        description="Bưu tá nộp tiền thu được khi giao hàng về bưu cục theo từng lô. Tài chính duyệt lô khi đã nhận đủ tiền; tiền thu hộ đã duyệt mới được đưa vào đối soát với Merchant."
        help={{
          description: "Duyệt khi bưu cục đã kiểm đếm đủ số tiền của lô. Nếu thiếu hoặc thừa, từ chối kèm lý do: tiền được giữ tại bưu cục và bưu cục gửi duyệt lại sau khi kiểm đếm.",
          bullets: [
            "Số tiền khai của lô luôn bằng tổng các đơn trong lô.",
            "Tiền đã duyệt không thể hoàn tác; đối soát sẽ trả phần thu hộ cho Merchant.",
          ],
        }}
        actions={<Button variant="outline" onClick={reload}><RefreshCwIcon className="size-4" />Làm mới</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${selectClassName} w-auto text-xs font-bold`} value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as CashRemittanceStatus | ""); }}>
          <option value="SUBMITTED">Lô chờ duyệt</option>
          <option value="APPROVED">Lô đã duyệt</option>
          <option value="REJECTED">Lô đã từ chối</option>
          <option value="">Tất cả lô</option>
        </select>
        <span className="text-xs text-muted-foreground">{remittances.length} lô</span>
      </div>

      {loading ? <PricingLoading label="Đang tải tiền nộp..." /> : error ? <PricingError message={error} onRetry={reload} /> : (
        <>
          {remittances.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {remittances.map((remittance) => (
                <Card key={remittance.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/25 p-4">
                    <div>
                      <p className="font-mono text-sm font-black">{remittance.remittanceNumber}</p>
                      <p className="mt-1 text-[0.68rem] text-muted-foreground">
                        Bưu tá <span title={remittance.courierUserId}>{shortId(remittance.courierUserId)}</span> · bưu cục <span title={remittance.hubId}>{shortId(remittance.hubId)}</span> · nộp {dateTime(remittance.submittedAt)}
                      </p>
                    </div>
                    <StatusPill tone={remittance.status === "APPROVED" ? "success" : remittance.status === "REJECTED" ? "danger" : "warning"}>
                      {remittanceStatusLabels[remittance.status]}
                    </StatusPill>
                  </div>
                  <div className="grid gap-1 p-4 text-xs">
                    {remittance.items.map((item) => {
                      const collection = byId.get(item.collectionId);
                      return (
                        <div key={item.collectionId} className="flex items-center justify-between gap-3">
                          <span className="font-mono" title={item.collectionId}>{collection?.trackingCode ?? shortId(item.collectionId)}</span>
                          <span className="tabular-nums">
                            {collection && collection.feeAmount > 0 ? <span className="mr-2 text-muted-foreground">thu hộ {money(collection.codAmount)} + cước {money(collection.feeAmount)}</span> : null}
                            <strong>{money(item.amount)}</strong>
                          </span>
                        </div>
                      );
                    })}
                    {remittance.rejectionReason ? <p className="mt-2 rounded-md bg-destructive/5 p-2 text-destructive">Lý do từ chối: {remittance.rejectionReason}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                    <p className="text-sm">{remittance.items.length} đơn · <strong className="tabular-nums">{money(remittance.expectedAmount)}</strong></p>
                    {remittance.status === "SUBMITTED" ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAction({ kind: "reject-remittance", remittance })}><XIcon className="size-3.5" />Từ chối</Button>
                        <Button size="sm" onClick={() => setAction({ kind: "approve-remittance", remittance })}><CheckIcon className="size-3.5" />Đã nhận đủ tiền</Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : <Card className="p-5 text-sm text-muted-foreground">Không có lô tiền nào phù hợp bộ lọc.</Card>}

          {resubmitted.length ? (
            <section className="grid gap-2">
              <h2 className="mt-2 text-sm font-black">Bưu cục gửi duyệt lại ({resubmitted.length})</h2>
              <Card className="divide-y">
                {resubmitted.map((collection) => (
                  <div key={collection.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div>
                      <p className="font-mono font-black">{collection.trackingCode}</p>
                      <p className="mt-1 text-[0.68rem] text-muted-foreground">
                        Bưu cục <span title={collection.currentHubId ?? ""}>{collection.currentHubId ? shortId(collection.currentHubId) : "—"}</span>
                        {collection.lastRejectionReason ? ` · lần trước bị từ chối: ${collection.lastRejectionReason}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className="tabular-nums">{money(collection.amount)}</strong>
                      <Button variant="outline" size="sm" onClick={() => setAction({ kind: "reject-collection", collection })}>Từ chối</Button>
                      <Button size="sm" onClick={() => setAction({ kind: "approve-collection", collection })}>Duyệt</Button>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}
        </>
      )}

      <FinanceDialog
        open={action !== null}
        title={approving ? "Xác nhận đã nhận đủ tiền?" : "Từ chối khoản tiền này?"}
        description={approving
          ? `Xác nhận bưu cục đã nhận đủ ${money(actionAmount)}. Phần tiền thu hộ sẽ được đưa vào kỳ đối soát kế tiếp của Merchant.`
          : "Tiền được giữ lại tại bưu cục. Bưu cục kiểm đếm lại rồi gửi duyệt lại."}
        confirmLabel={approving ? "Duyệt" : "Từ chối"}
        destructive={!approving}
        input={approving ? undefined : { label: "Lý do", placeholder: "Ví dụ: thiếu 50.000 ₫ so với khai báo", required: true, multiline: true }}
        loading={saving}
        onCancel={() => setAction(null)}
        onConfirm={run}
      />
    </div>
  );
}
