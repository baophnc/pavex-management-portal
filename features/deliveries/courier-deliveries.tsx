"use client";

import {
  BanknoteIcon,
  CheckIcon,
  LoaderCircleIcon,
  PackageIcon,
  PhoneIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deliveriesApi, deliveryErrorMessage } from "@/features/deliveries/api";
import {
  type CourierDelivery,
  type CourierParcel,
  type DeliveryFailureReason,
  type DeliveryProofMethod,
  failureReasonLabels,
  parcelStatusLabels,
  proofMethodLabels,
} from "@/features/deliveries/contracts";
import type { CashCollection, CashRemittance } from "@/features/finance/contracts";
import { remittanceStatusLabels } from "@/features/finance/contracts";
import { StatusPill } from "@/features/finance/ui";
import { getMyHubScope } from "@/features/operations/hub-scope";
import {
  dateTime,
  money,
  PricingError,
  PricingField,
  PricingLoading,
  PricingMoneyInput,
  PricingPageHeader,
  selectClassName,
  textareaClassName,
} from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

type Action = { kind: "deliver" | "fail"; delivery: CourierDelivery; parcel: CourierParcel };

export function CourierDeliveries() {
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [cash, setCash] = useState<CashCollection[]>([]);
  const [remittances, setRemittances] = useState<CashRemittance[]>([]);
  const [hubNames, setHubNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cashError, setCashError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"deliveries" | "cash">("deliveries");
  const [action, setAction] = useState<Action | null>(null);
  const [remitHubId, setRemitHubId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Cash comes from Billing; a Billing outage must not hide the parcels still to deliver.
    Promise.allSettled([
      deliveriesApi.mine(),
      deliveriesApi.myCash(),
      deliveriesApi.myRemittances(),
      getMyHubScope(),
    ]).then(([mine, collections, sent, scope]) => {
      if (!active) return;
      if (mine.status === "fulfilled") {
        setDeliveries(mine.value);
        setError(null);
      } else {
        setError(deliveryErrorMessage(mine.reason, "Không thể tải danh sách đơn đang giao."));
      }
      if (collections.status === "fulfilled" && sent.status === "fulfilled") {
        setCash(collections.value);
        setRemittances(sent.value);
        setCashError(null);
      } else {
        const reason = collections.status === "rejected" ? collections.reason : (sent as PromiseRejectedResult).reason;
        setCashError(deliveryErrorMessage(reason, "Không thể tải tiền đang giữ."));
      }
      if (scope.status === "fulfilled") {
        setHubNames(Object.fromEntries(scope.value.hubs.map((hub) => [hub.id, `${hub.name} (${hub.code})`])));
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshKey]);

  const reload = () => { setLoading(true); setRefreshKey((value) => value + 1); };

  const carrying = deliveries.flatMap((delivery) => delivery.parcels).filter((parcel) => parcel.status === "OUT_FOR_DELIVERY").length;
  // Cash the courier still carries; after a rejected remittance it sits at the hub instead.
  const held = cash.filter((item) => item.status === "HELD" && !item.currentHubId);
  const heldTotal = held.reduce((total, item) => total + item.amount, 0);

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Việc của tôi"
        title="Giao hàng & tiền thu"
        description="Kiện bạn đang mang đi giao, số tiền cần thu của từng đơn và tiền mặt cần nộp về bưu cục."
        help={{
          description: "Mỗi đơn chỉ thu tiền một lần, đủ số tiền, ở kiện đầu tiên giao thành công. Các kiện sau của cùng đơn không thu thêm.",
          bullets: [
            "Người nhận không trả đủ tiền: chọn “Không giao được” với lý do “Người nhận không thanh toán”.",
            "Cuối ca, nộp toàn bộ tiền đang giữ về bưu cục đã giao đơn; số tiền nộp phải khớp từng đồng.",
          ],
        }}
        actions={<Button variant="outline" disabled={loading} onClick={reload}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Tải lại</Button>}
      />

      <div className="grid grid-cols-2 gap-2">
        <TabButton active={tab === "deliveries"} onClick={() => setTab("deliveries")} icon={<PackageIcon className="size-4" />} label="Đang giao" value={`${carrying} kiện`} />
        <TabButton active={tab === "cash"} onClick={() => setTab("cash")} icon={<BanknoteIcon className="size-4" />} label="Tiền đang giữ" value={money(heldTotal)} />
      </div>

      {loading ? <PricingLoading label="Đang tải việc giao hàng..." /> : tab === "deliveries" ? (
        error ? <PricingError message={error} onRetry={reload} /> : deliveries.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Bạn chưa giữ kiện nào để giao. Kiện sẽ hiện ở đây sau khi bưu cục quét xuất kho giao cho bạn.</Card>
        ) : (
          <div className="grid gap-3">
            {deliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.trackingCode}
                delivery={delivery}
                onAction={(kind, parcel) => setAction({ kind, delivery, parcel })}
              />
            ))}
          </div>
        )
      ) : cashError ? <PricingError message={cashError} onRetry={reload} /> : (
        <CashPanel held={held} cash={cash} remittances={remittances} hubNames={hubNames} onRemit={setRemitHubId} />
      )}

      {action?.kind === "deliver" ? (
        <DeliverSheet
          delivery={action.delivery}
          parcel={action.parcel}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); reload(); }}
        />
      ) : null}
      {action?.kind === "fail" ? (
        <FailSheet
          delivery={action.delivery}
          parcel={action.parcel}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); reload(); }}
        />
      ) : null}
      {remitHubId ? (
        <RemitSheet
          hubName={hubNames[remitHubId] ?? "Bưu cục"}
          hubId={remitHubId}
          items={held.filter((item) => item.originHubId === remitHubId)}
          onClose={() => setRemitHubId(null)}
          onDone={() => { setRemitHubId(null); reload(); }}
        />
      ) : null}
    </div>
  );
}

function TabButton({ active, onClick, icon, label, value }: { active: boolean; onClick: () => void; icon: ReactNode; label: string; value: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "rounded-xl border bg-card p-3 text-left transition",
        active ? "border-brand/40 ring-2 ring-brand/10" : "hover:border-brand/30",
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">{icon}{label}</span>
      <span className="mt-1 block text-lg font-black tabular-nums">{value}</span>
    </button>
  );
}

function CollectionPill({ delivery }: { delivery: CourierDelivery }) {
  switch (delivery.collectionStatus) {
    case "PENDING":
      return <StatusPill tone="warning">Thu {money(delivery.amountToCollect)}</StatusPill>;
    case "COLLECTED":
      return <StatusPill tone="success">Đã thu {money(delivery.amountToCollect)}</StatusPill>;
    default:
      return <StatusPill tone="muted">Không thu tiền</StatusPill>;
  }
}

function DeliveryCard({ delivery, onAction }: { delivery: CourierDelivery; onAction: (kind: Action["kind"], parcel: CourierParcel) => void }) {
  const recipient = delivery.recipient;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b bg-muted/25 p-4">
        <div className="min-w-0">
          <p className="font-mono text-sm font-black">{delivery.trackingCode}</p>
          <p className="mt-1 text-xs text-muted-foreground">{delivery.serviceLevel === "EXPRESS" ? "Nhanh" : "Tiêu chuẩn"} · {delivery.parcelCount} kiện</p>
        </div>
        <CollectionPill delivery={delivery} />
      </div>
      <div className="grid gap-1 p-4 text-sm">
        <p className="font-black">{recipient.contactName}</p>
        <a href={`tel:${recipient.contactPhone}`} className="inline-flex w-fit items-center gap-1.5 font-bold text-brand underline-offset-4 hover:underline">
          <PhoneIcon className="size-3.5" />{recipient.contactPhone}
        </a>
        <p className="leading-6 text-muted-foreground">{recipient.addressLine}, {recipient.wardName}, {recipient.provinceName}</p>
        {delivery.note ? <p className="mt-1 rounded-lg bg-muted/40 p-2 text-xs leading-5"><strong>Ghi chú:</strong> {delivery.note}</p> : null}
      </div>
      <div className="grid gap-2 border-t p-4">
        {delivery.parcels.map((parcel) => (
          <div key={parcel.parcelCode} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-black">Kiện {parcel.sequence}/{delivery.parcelCount} · <span className="font-mono">{parcel.parcelCode}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">{parcel.description}{parcel.isFragile ? " · Dễ vỡ" : ""}</p>
              </div>
              <StatusPill tone={parcel.status === "DELIVERED" ? "success" : parcel.status === "OUT_FOR_DELIVERY" ? "brand" : "muted"}>
                {parcelStatusLabels[parcel.status] ?? parcel.status}
              </StatusPill>
            </div>
            {parcel.status === "OUT_FOR_DELIVERY" ? (
              parcel.assignmentId ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button onClick={() => onAction("deliver", parcel)}><CheckIcon className="size-4" />Giao thành công</Button>
                  <Button variant="outline" onClick={() => onAction("fail", parcel)}><XIcon className="size-4" />Không giao được</Button>
                </div>
              ) : (
                <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">Kiện chưa có phân công giao hàng. Liên hệ điều phối bưu cục.</p>
              )
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[95] grid items-end bg-black/45 sm:place-items-center sm:p-4" role="presentation" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b p-4"><h2 className="text-base font-black">{title}</h2></div>
        <div className="grid gap-4 p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t p-4">{footer}</div>
      </div>
    </div>
  );
}

function SheetError({ message }: { message: string | null }) {
  return message ? <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{message}</div> : null;
}

function DeliverSheet({ delivery, parcel, onClose, onDone }: { delivery: CourierDelivery; parcel: CourierParcel; onClose: () => void; onDone: () => void }) {
  const needsCollection = delivery.collectionStatus === "PENDING";
  const [method, setMethod] = useState<DeliveryProofMethod>("PHOTO");
  const [photo, setPhoto] = useState<File | null>(null);
  const [code, setCode] = useState("");
  const [recipientName, setRecipientName] = useState(delivery.recipient.contactName);
  const [collected, setCollected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept across retries so a resend after a lost response is recognised as the same attempt.
  const keyRef = useRef<string | null>(null);
  const uploadedRef = useRef<{ file: File; reference: string } | null>(null);

  const hasEvidence = method === "PHOTO" ? photo !== null : code.trim().length > 0;
  const amountMatches = !needsCollection || collected === delivery.amountToCollect;
  const ready = recipientName.trim().length > 0 && hasEvidence && amountMatches;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      let evidenceReference = code.trim();
      if (method === "PHOTO" && photo) {
        if (uploadedRef.current?.file !== photo) {
          uploadedRef.current = { file: photo, reference: (await deliveriesApi.uploadEvidence(photo)).reference };
        }
        evidenceReference = uploadedRef.current.reference;
      }
      keyRef.current ??= crypto.randomUUID();
      await deliveriesApi.recordAttempt({
        assignmentId: parcel.assignmentId!,
        parcelCode: parcel.parcelCode,
        idempotencyKey: keyRef.current,
        outcome: "DELIVERED",
        proofMethod: method,
        recipientName: recipientName.trim(),
        evidenceReference,
        ...(needsCollection ? { collectedAmount: collected } : {}),
      });
      toast.success(needsCollection ? `Đã giao kiện và ghi nhận thu ${money(collected)}.` : "Đã ghi nhận giao thành công.");
      onDone();
    } catch (reason) {
      setError(deliveryErrorMessage(reason, "Không thể ghi nhận giao hàng."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Giao thành công · Kiện ${parcel.sequence}/${delivery.parcelCount}`}
      onClose={saving ? () => undefined : onClose}
      footer={<>
        <Button variant="outline" disabled={saving} onClick={onClose}>Hủy</Button>
        <Button disabled={!ready || saving} onClick={() => void submit()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}Xác nhận đã giao</Button>
      </>}
    >
      {needsCollection ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3">
          <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Thu của người nhận trước khi giao hàng (một lần cho cả {delivery.parcelCount} kiện)</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{money(delivery.amountToCollect)}</p>
          <div className="mt-3">
            <PricingField label="Số tiền bạn đã thu" hint={collected > 0 && !amountMatches ? <span className="text-destructive">Phải đúng bằng {money(delivery.amountToCollect)}. Nếu người nhận không trả đủ, hãy chọn “Không giao được”.</span> : undefined}>
              <PricingMoneyInput value={collected} disabled={saving} onValueChange={setCollected} />
            </PricingField>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border bg-muted/25 p-3 text-xs">
          {delivery.collectionStatus === "COLLECTED" ? "Tiền của đơn này đã được thu ở kiện trước. Không thu thêm." : "Đơn này không cần thu tiền."}
        </p>
      )}

      <PricingField label="Tên người nhận hàng">
        <Input value={recipientName} maxLength={200} disabled={saving} onChange={(event) => setRecipientName(event.target.value)} />
      </PricingField>

      <PricingField label="Chứng từ giao hàng">
        <select className={selectClassName} value={method} disabled={saving} onChange={(event) => setMethod(event.target.value as DeliveryProofMethod)}>
          {(Object.keys(proofMethodLabels) as DeliveryProofMethod[]).map((value) => <option key={value} value={value}>{proofMethodLabels[value]}</option>)}
        </select>
      </PricingField>

      {method === "PHOTO" ? (
        <PricingField label="Ảnh giao hàng" hint="Chụp kiện hàng tại nơi giao, thấy rõ nhãn kiện.">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={saving}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-bold"
            onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          />
        </PricingField>
      ) : (
        <PricingField label={method === "OTP" ? "Mã OTP người nhận đọc" : "Mã phiếu ký nhận"}>
          <Input value={code} maxLength={100} disabled={saving} onChange={(event) => setCode(event.target.value)} />
        </PricingField>
      )}

      <SheetError message={error} />
    </Sheet>
  );
}

function FailSheet({ delivery, parcel, onClose, onDone }: { delivery: CourierDelivery; parcel: CourierParcel; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<DeliveryFailureReason>("RECIPIENT_UNAVAILABLE");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const ready = reason !== "OTHER" || note.trim().length > 0;

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      keyRef.current ??= crypto.randomUUID();
      await deliveriesApi.recordAttempt({
        assignmentId: parcel.assignmentId!,
        parcelCode: parcel.parcelCode,
        idempotencyKey: keyRef.current,
        outcome: "FAILED",
        failureReason: reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success("Đã ghi nhận giao không thành công.");
      onDone();
    } catch (cause) {
      setError(deliveryErrorMessage(cause, "Không thể ghi nhận giao không thành công."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Không giao được · Kiện ${parcel.sequence}/${delivery.parcelCount}`}
      onClose={saving ? () => undefined : onClose}
      footer={<>
        <Button variant="outline" disabled={saving} onClick={onClose}>Hủy</Button>
        <Button variant="destructive" disabled={!ready || saving} onClick={() => void submit()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}Ghi nhận</Button>
      </>}
    >
      {delivery.collectionStatus === "PENDING" ? (
        <p className="rounded-xl border bg-muted/25 p-3 text-xs leading-5">Không thu tiền khi giao không thành công. Nếu người nhận không chịu trả {money(delivery.amountToCollect)}, chọn “Người nhận không thanh toán”.</p>
      ) : null}
      <PricingField label="Lý do">
        <select className={selectClassName} value={reason} disabled={saving} onChange={(event) => setReason(event.target.value as DeliveryFailureReason)}>
          {(Object.keys(failureReasonLabels) as DeliveryFailureReason[]).map((value) => <option key={value} value={value}>{failureReasonLabels[value]}</option>)}
        </select>
      </PricingField>
      <PricingField label={reason === "OTHER" ? "Mô tả lý do" : "Ghi chú (không bắt buộc)"}>
        <textarea value={note} maxLength={500} disabled={saving} className={textareaClassName} onChange={(event) => setNote(event.target.value)} />
      </PricingField>
      <SheetError message={error} />
    </Sheet>
  );
}

function CashPanel({ held, cash, remittances, hubNames, onRemit }: { held: CashCollection[]; cash: CashCollection[]; remittances: CashRemittance[]; hubNames: Record<string, string>; onRemit: (hubId: string) => void }) {
  const byHub = Object.entries(held.reduce<Record<string, CashCollection[]>>((groups, item) => {
    (groups[item.originHubId] ??= []).push(item);
    return groups;
  }, {}));
  const returnedToHub = cash.filter((item) => item.status === "HELD" && item.currentHubId);
  const hubName = (id: string) => hubNames[id] ?? "Bưu cục";

  return (
    <div className="grid gap-4">
      {byHub.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Bạn không giữ khoản tiền nào cần nộp.</Card>
      ) : byHub.map(([hubId, items]) => {
        const total = items.reduce((sum, item) => sum + item.amount, 0);
        return (
          <Card key={hubId} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/25 p-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Nộp về {hubName(hubId)}</p>
                <p className="mt-1 text-xl font-black tabular-nums">{money(total)}</p>
                <p className="text-xs text-muted-foreground">{items.length} đơn</p>
              </div>
              <Button onClick={() => onRemit(hubId)}><BanknoteIcon className="size-4" />Nộp tiền</Button>
            </div>
            <ul className="divide-y text-sm">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-mono text-xs font-bold">{item.trackingCode}</span>
                  <span className="font-bold tabular-nums">{money(item.amount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {returnedToHub.length ? (
        <Card className="p-4 text-xs leading-5">
          <p className="font-black">Đã bị từ chối, đang ở bưu cục ({returnedToHub.length})</p>
          <p className="mt-1 text-muted-foreground">Bưu cục sẽ kiểm đếm lại và nộp tiếp các khoản này; bạn không cần nộp lại.</p>
          <ul className="mt-2 grid gap-1">
            {returnedToHub.map((item) => (
              <li key={item.id}><span className="font-mono font-bold">{item.trackingCode}</span> · {money(item.amount)}{item.lastRejectionReason ? ` · ${item.lastRejectionReason}` : ""}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-black">Phiếu nộp gần đây</h2>
        {remittances.length === 0 ? (
          <Card className="p-4 text-xs text-muted-foreground">Chưa có phiếu nộp tiền nào.</Card>
        ) : (
          <div className="grid gap-2">
            {remittances.slice(0, 10).map((item) => (
              <Card key={item.id} className="p-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-black">{item.remittanceNumber}</span>
                  <StatusPill tone={item.status === "APPROVED" ? "success" : item.status === "REJECTED" ? "danger" : "warning"}>{remittanceStatusLabels[item.status]}</StatusPill>
                </div>
                <p className="mt-1 text-muted-foreground">{hubName(item.hubId)} · {money(item.declaredAmount)} · {item.items.length} đơn · {dateTime(item.submittedAt)}</p>
                {item.rejectionReason ? <p className="mt-1 text-destructive">Lý do từ chối: {item.rejectionReason}</p> : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RemitSheet({ hubId, hubName, items, onClose, onDone }: { hubId: string; hubName: string; items: CashCollection[]; onClose: () => void; onDone: () => void }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const [declared, setDeclared] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = declared === total;

  const submit = async () => {
    if (!matches || saving) return;
    setSaving(true);
    setError(null);
    try {
      const remittance = await deliveriesApi.submitRemittance(hubId, items.map((item) => item.id), declared);
      toast.success(`Đã gửi phiếu nộp ${remittance.remittanceNumber}.`);
      onDone();
    } catch (reason) {
      setError(deliveryErrorMessage(reason, "Không thể gửi phiếu nộp tiền."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      title={`Nộp tiền về ${hubName}`}
      onClose={saving ? () => undefined : onClose}
      footer={<>
        <Button variant="outline" disabled={saving} onClick={onClose}>Hủy</Button>
        <Button disabled={!matches || saving} onClick={() => void submit()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <BanknoteIcon className="size-4" />}Gửi phiếu nộp</Button>
      </>}
    >
      <div className="rounded-xl border bg-muted/25 p-3">
        <p className="text-xs font-bold text-muted-foreground">Tổng tiền của {items.length} đơn</p>
        <p className="mt-1 text-2xl font-black tabular-nums">{money(total)}</p>
      </div>
      <PricingField
        label="Số tiền bạn đếm được và nộp"
        hint={declared > 0 && !matches ? <span className="text-destructive">Phải khớp đúng {money(total)}. Nếu thiếu hoặc thừa, báo trưởng bưu cục trước khi nộp.</span> : "Đếm lại tiền mặt rồi nhập đúng số tiền bàn giao."}
      >
        <PricingMoneyInput value={declared} disabled={saving} onValueChange={setDeclared} />
      </PricingField>
      <SheetError message={error} />
    </Sheet>
  );
}
