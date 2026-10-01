"use client";

import { CheckIcon, LoaderCircleIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeCounterSettlement, getCounterSettlements, getHubHeldCash, sendHubCashToFinance } from "@/features/counter/api";
import type { CounterSettlement, CounterSettlementStatus } from "@/features/counter/contracts";
import { counterErrorMessage } from "@/features/counter/errors";
import type { CashCollection } from "@/features/finance/contracts";
import { getMyHubScope, type MyHub } from "@/features/operations/hub-scope";
import { selectClassName } from "@/features/pricing/ui";
import { money } from "@/features/shipments/presentation";
import { cn, formatDateTime } from "@/lib/utils";

const KIND_LABEL: Record<CounterSettlement["kind"], string> = {
  PAYOUT_COD: "Trả tiền thu hộ",
  COLLECT_RETURN_FEE: "Thu cước hàng hoàn",
};

/**
 * The counter's cash with walk-in senders: COD to pay back once the shipment was delivered and
 * finance has the money, and the fee of a returned shipment to take. Each one is completed only
 * after the sender gives the phone number the shipment was booked with.
 */
export function CounterSettlements() {
  const [hubs, setHubs] = useState<MyHub[]>([]);
  const [hubId, setHubId] = useState("");
  const [status, setStatus] = useState<CounterSettlementStatus | "">("PENDING");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CounterSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CounterSettlement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyHubScope()
      .then((scope) => {
        if (cancelled) return;
        const own = scope.hubs.filter((item) => item.status === "ACTIVE");
        setHubs(own);
        const first = own.find((item) => item.primary) ?? own[0];
        if (first) setHubId(first.id);
        else {
          setError("Tài khoản chưa thuộc bưu cục nào nên chưa xử lý tiền tại quầy được.");
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không tải được bưu cục của bạn.");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!hubId) return;
    setLoading(true);
    setError(null);
    const text = query.trim();
    const isCode = /^PAVEX/i.test(text);
    try {
      setItems(await getCounterSettlements(hubId, { status, phone: isCode ? "" : text, trackingCode: isCode ? text : "" }));
    } catch (reason) {
      setItems([]);
      setError(counterErrorMessage(reason, "Không tải được danh sách."));
    } finally {
      setLoading(false);
    }
  }, [hubId, query, status]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
    // Searching by phone or code runs on submit, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId, status]);

  function search(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  return (
    <div className="grid gap-3">
      <Card className="p-3">
        <form onSubmit={search} className="grid gap-2 sm:grid-cols-[200px_160px_minmax(0,1fr)_auto_auto]">
          {hubs.length > 1 ? (
            <select className={selectClassName} value={hubId} onChange={(event) => setHubId(event.target.value)}>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  {hub.code} · {hub.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="self-center text-sm font-bold">{hubs[0] ? `${hubs[0].code} · ${hubs[0].name}` : ""}</p>
          )}
          <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as CounterSettlementStatus | "")}>
            <option value="PENDING">Chờ xử lý</option>
            <option value="DONE">Đã xử lý</option>
            <option value="">Tất cả</option>
          </select>
          <Input value={query} placeholder="SĐT người gửi hoặc mã vận đơn" onChange={(event) => setQuery(event.target.value)} />
          <Button type="submit" disabled={loading}>
            <SearchIcon className="size-3.5" /> Tìm
          </Button>
          <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCwIcon className={cn("size-3.5", loading && "animate-spin")} />
          </Button>
        </form>
      </Card>

      {error ? <p className="rounded border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand">{error}</p> : null}

      <Card className="divide-y">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {status === "PENDING" ? "Không có khoản nào đang chờ. Tiền thu hộ chỉ hiện ở đây sau khi đơn giao xong và kế toán đã duyệt tiền bưu tá nộp." : "Không có khoản nào."}
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  <span className={item.kind === "PAYOUT_COD" ? "text-emerald-700 dark:text-emerald-300" : "text-brand"}>{KIND_LABEL[item.kind]}</span>{" "}
                  {money(item.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{item.trackingCode}</span> · {item.senderName} · {item.senderPhone} · {formatDateTime(item.createdAt)}
                </p>
                {item.status === "DONE" ? (
                  <p className="text-xs text-muted-foreground">
                    Đã xử lý {item.completedAt ? formatDateTime(item.completedAt) : ""}
                    {item.note ? ` · ${item.note}` : ""}
                  </p>
                ) : null}
              </div>
              {item.status === "PENDING" ? (
                <Button onClick={() => setOpen(item)}>{item.kind === "PAYOUT_COD" ? "Trả tiền" : "Thu tiền"}</Button>
              ) : (
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckIcon className="inline size-3.5" /> Xong
                </span>
              )}
            </div>
          ))
        )}
      </Card>

      {hubId ? <HubCash hubId={hubId} /> : null}

      {open ? (
        <CompleteDialog
          item={open}
          onClose={() => setOpen(null)}
          onDone={(done) => {
            setItems((current) => current.map((item) => (item.id === done.id ? done : item)).filter((item) => !status || item.status === status));
            setOpen(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CompleteDialog({
  item,
  onClose,
  onDone,
}: {
  item: CounterSettlement;
  onClose: () => void;
  onDone: (done: CounterSettlement) => void;
}) {
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const payout = item.kind === "PAYOUT_COD";

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const done = await completeCounterSettlement(item.id, phone, note.trim() || null);
      toast.success(payout ? `Đã trả ${money(item.amount)} cho người gửi.` : `Đã thu ${money(item.amount)} của người gửi.`);
      onDone(done);
    } catch (reason) {
      toast.error(counterErrorMessage(reason, "Không xác nhận được."));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={(event) => void confirm(event)} className="grid w-full max-w-md gap-3 rounded-lg border bg-card p-5 shadow-xl">
        <p className="text-base font-black">{payout ? "Trả tiền thu hộ" : "Thu cước hàng hoàn"}</p>
        <p className="text-sm">
          {payout ? "Đưa cho" : "Thu của"} <span className="font-bold">{item.senderName}</span> số tiền{" "}
          <span className="font-black text-brand">{money(item.amount)}</span> (vận đơn <span className="font-mono">{item.trackingCode}</span>).
        </p>
        <label className="grid gap-1.5 text-xs font-bold">
          Số điện thoại khách đọc (phải trùng số đã gửi hàng)
          <Input autoFocus inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs font-bold">
          Ghi chú
          <Input value={note} maxLength={500} placeholder="Ví dụ: khách xuất trình biên nhận" onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" disabled={saving || phone.replace(/\D/g, "").length < 9}>
            {saving ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
            {payout ? "Đã trả tiền" : "Đã thu tiền"}
          </Button>
        </div>
      </form>
    </div>
  );
}

/**
 * Cash in the hub's till: fees walk-in senders paid at the counter (and cash finance returned for
 * a recount). Staff hand it to finance from here; finance approves it under "Duyệt tiền nộp".
 */
function HubCash({ hubId }: { hubId: string }) {
  const [items, setItems] = useState<CashCollection[] | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getHubHeldCash(hubId));
    } catch {
      setItems([]);
    }
  }, [hubId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function send(collection: CashCollection) {
    setSending(collection.id);
    try {
      await sendHubCashToFinance(collection.id);
      toast.success(`Đã nộp ${money(collection.amount)} cho kế toán.`);
      setItems((current) => current?.filter((item) => item.id !== collection.id) ?? null);
    } catch (reason) {
      toast.error(counterErrorMessage(reason, "Không nộp được."));
    } finally {
      setSending(null);
    }
  }

  const total = items?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
  return (
    <section className="grid gap-2">
      <h2 className="mt-2 text-sm font-black">Tiền mặt tại quầy chờ nộp kế toán {items?.length ? `(${money(total)})` : ""}</h2>
      <Card className="divide-y">
        {items === null ? (
          <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Quầy không giữ khoản tiền nào.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-mono font-bold">{item.trackingCode}</p>
                <p className="text-xs text-muted-foreground">
                  {item.source === "COUNTER" ? "Cước khách trả tại quầy" : "Kế toán trả lại để kiểm đếm"}
                  {item.lastRejectionReason ? ` · ${item.lastRejectionReason}` : ""} · {formatDateTime(item.collectedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <strong className="tabular-nums">{money(item.amount)}</strong>
                <Button size="sm" disabled={sending === item.id} onClick={() => void send(item)}>
                  {sending === item.id ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
                  Nộp cho kế toán
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}
