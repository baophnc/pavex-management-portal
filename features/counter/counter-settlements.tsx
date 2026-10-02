"use client";

import { CheckIcon, LoaderCircleIcon, PrinterIcon, RefreshCwIcon, SearchIcon, XIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeCounterSettlement, getCounterSettlements, getHubHeldCash, sendHubCashToFinance } from "@/features/counter/api";
import type { CounterSettlement, CounterSettlementStatus } from "@/features/counter/contracts";
import { counterErrorMessage } from "@/features/counter/errors";
import type { CashCollection } from "@/features/finance/contracts";
import { HubSelect, useHubScope } from "@/features/directory/hub-scope";
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
  const scope = useHubScope();
  const [hubId, setHubId] = useState("");
  const [status, setStatus] = useState<CounterSettlementStatus | "">("PENDING");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CounterSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<CounterSettlement | null>(null);
  const [voucher, setVoucher] = useState<CounterSettlement | null>(null);

  // Start on the user's own hub; head office starts on the first hub and can switch.
  const activeHubId = hubId || scope.initialHubId || scope.hubs[0]?.id || "";

  const load = useCallback(async () => {
    if (!activeHubId) {
      if (!scope.loading) setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const text = query.trim();
    const isCode = /^PAVEX/i.test(text);
    try {
      setItems(await getCounterSettlements(activeHubId, { status, phone: isCode ? "" : text, trackingCode: isCode ? text : "" }));
    } catch (reason) {
      setItems([]);
      setError(counterErrorMessage(reason, "Không tải được danh sách."));
    } finally {
      setLoading(false);
    }
  }, [activeHubId, query, scope.loading, status]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
    // Searching by phone or code runs on submit, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHubId, scope.loading, status]);

  function search(event: FormEvent) {
    event.preventDefault();
    void load();
  }

  const pending = items.filter((item) => item.status === "PENDING");
  const totals = {
    payout: pending.filter((item) => item.kind === "PAYOUT_COD"),
    collect: pending.filter((item) => item.kind === "COLLECT_RETURN_FEE"),
  };
  const sum = (list: CounterSettlement[]) => list.reduce((total, item) => total + item.amount, 0);
  const hubName = (id: string) => {
    const hub = scope.hubs.find((item) => item.id === id);
    return hub ? `${hub.code} · ${hub.name}` : "Bưu cục";
  };

  return (
    <div className="grid gap-3">
      <details className="rounded-lg border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-black">Trang này dùng để làm gì?</summary>
        <div className="mt-3 grid gap-3 text-xs leading-5 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="font-black text-emerald-700 dark:text-emerald-300">Trả tiền thu hộ cho khách gửi tại quầy</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">
              <li>Khách gửi hàng tại quầy có thu hộ (COD); bưu tá giao xong và thu tiền người nhận.</li>
              <li>Bưu tá nộp tiền về bưu cục, trưởng bưu cục duyệt khoản tiền đó.</li>
              <li>Khoản thu hộ hiện ở đây. Khách quay lại quầy, đọc đúng số điện thoại đã gửi hàng, nhân viên đưa tiền và in phiếu chi cho khách ký.</li>
            </ol>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="font-black text-brand">Thu cước hàng hoàn</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted-foreground">
              <li>Đơn người nhận trả cước nhưng giao không được và hàng hoàn về quầy.</li>
              <li>Người gửi nhận lại hàng và trả phần cước còn thiếu.</li>
              <li>Nhân viên thu tiền, in phiếu thu; tiền vào mục “Tiền mặt tại quầy” để gửi trưởng bưu cục duyệt.</li>
            </ol>
          </div>
        </div>
      </details>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Cần trả cho khách</p>
          <p className="mt-1 text-xl font-black text-emerald-700 dark:text-emerald-300">{money(sum(totals.payout))}</p>
          <p className="text-xs text-muted-foreground">{totals.payout.length} khoản đang chờ</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted-foreground">Cần thu của khách</p>
          <p className="mt-1 text-xl font-black text-brand">{money(sum(totals.collect))}</p>
          <p className="text-xs text-muted-foreground">{totals.collect.length} khoản đang chờ</p>
        </Card>
      </div>

      <Card className="p-3">
        <form onSubmit={search} className="grid gap-2 sm:grid-cols-[200px_160px_minmax(0,1fr)_auto_auto]">
          <HubSelect scope={scope} value={activeHubId} onChange={setHubId} />
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

      {scope.error || error ? <p className="rounded border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand">{scope.error ?? error}</p> : null}

      <Card className="divide-y">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {status === "PENDING" ? "Không có khoản nào đang chờ. Tiền thu hộ chỉ hiện ở đây sau khi đơn giao xong và trưởng bưu cục đã duyệt tiền bưu tá nộp." : "Không có khoản nào."}
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
                <Button onClick={() => setOpen(item)}>{item.kind === "PAYOUT_COD" ? `Trả ${money(item.amount)}` : `Thu ${money(item.amount)}`}</Button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckIcon className="inline size-3.5" /> Xong
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setVoucher(item)}>
                    <PrinterIcon className="size-3.5" /> In lại phiếu
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      {activeHubId ? <HubCash hubId={activeHubId} /> : null}

      {voucher ? <Voucher item={voucher} hubName={hubName(voucher.hubId)} onClose={() => setVoucher(null)} /> : null}

      {open ? (
        <CompleteDialog
          item={open}
          onClose={() => setOpen(null)}
          onDone={(done) => {
            setItems((current) => current.map((item) => (item.id === done.id ? done : item)).filter((item) => !status || item.status === status));
            setOpen(null);
            setVoucher(done);
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
        <ol className="grid gap-1 rounded-lg border bg-muted/20 p-3 text-xs">
          <li><b>Bước 1.</b> Hỏi khách số điện thoại đã dùng khi gửi hàng (không đọc số cho khách).</li>
          <li><b>Bước 2.</b> {payout ? "Đếm tiền và đưa cho khách." : "Nhận và đếm tiền của khách."}</li>
          <li><b>Bước 3.</b> Bấm xác nhận, in phiếu {payout ? "chi" : "thu"} cho khách ký.</li>
        </ol>
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
      toast.success(`Đã nộp ${money(collection.amount)} để trưởng bưu cục duyệt.`);
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
      <h2 className="mt-2 text-sm font-black">Tiền mặt tại quầy chờ gửi duyệt {items?.length ? `(${money(total)})` : ""}</h2>
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
                  {item.source === "COUNTER" ? "Cước khách trả tại quầy" : "Bị trả lại để kiểm đếm"}
                  {item.lastRejectionReason ? ` · ${item.lastRejectionReason}` : ""} · {formatDateTime(item.collectedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <strong className="tabular-nums">{money(item.amount)}</strong>
                <Button size="sm" disabled={sending === item.id} onClick={() => void send(item)}>
                  {sending === item.id ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
                  Gửi trưởng bưu cục duyệt
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </section>
  );
}

/** The paper the walk-in sender signs: a payment voucher for COD paid out, a receipt for a fee taken. */
function Voucher({ item, hubName, onClose }: { item: CounterSettlement; hubName: string; onClose: () => void }) {
  const payout = item.kind === "PAYOUT_COD";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 print:static print:bg-transparent" role="dialog" aria-modal="true">
      <div className="grid w-full max-w-lg gap-3 rounded-lg border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between print:hidden">
          <p className="text-base font-black">{payout ? "Phiếu chi" : "Phiếu thu"}</p>
          <Button variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}><XIcon className="size-4" /></Button>
        </div>
        <section className="counter-print rounded-lg border bg-white p-5 text-sm text-black">
          <div className="flex items-start justify-between gap-3 border-b border-black pb-2">
            <div>
              <p className="text-lg font-black">PAVEX · {payout ? "PHIẾU CHI" : "PHIẾU THU"}</p>
              <p className="text-xs">{hubName}</p>
            </div>
            <p className="text-right text-xs">{formatDateTime(item.completedAt ?? item.createdAt)}</p>
          </div>
          <dl className="mt-3 grid gap-1.5">
            <div className="flex justify-between gap-3"><dt>{payout ? "Trả cho" : "Thu của"}</dt><dd className="font-bold">{item.senderName} · {item.senderPhone}</dd></div>
            <div className="flex justify-between gap-3"><dt>Vận đơn</dt><dd className="font-mono font-bold">{item.trackingCode}</dd></div>
            <div className="flex justify-between gap-3"><dt>Nội dung</dt><dd className="font-bold">{payout ? "Trả tiền thu hộ" : "Thu cước hàng hoàn"}</dd></div>
            <div className="flex justify-between gap-3 border-t border-black pt-2 text-base"><dt className="font-bold">Số tiền</dt><dd className="font-black">{money(item.amount)}</dd></div>
            {item.note ? <div className="flex justify-between gap-3 text-xs"><dt>Ghi chú</dt><dd>{item.note}</dd></div> : null}
          </dl>
          <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs">
            <div><p className="font-bold">{payout ? "Người nhận tiền" : "Người nộp tiền"}</p><p className="mt-12">(Ký, ghi rõ họ tên)</p></div>
            <div><p className="font-bold">Nhân viên quầy</p><p className="mt-12">(Ký, ghi rõ họ tên)</p></div>
          </div>
        </section>
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button onClick={() => window.print()}><PrinterIcon className="size-3.5" /> In phiếu</Button>
        </div>
      </div>
    </div>
  );
}
