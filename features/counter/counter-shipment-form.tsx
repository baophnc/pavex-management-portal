"use client";

import { CalculatorIcon, LoaderCircleIcon, PlusIcon, SearchIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCounterShipment, findCounterContacts, saveCounterContact } from "@/features/counter/api";
import type { CounterAddress, CounterContact, ShippingFeePayer } from "@/features/counter/contracts";
import { counterErrorMessage } from "@/features/counter/errors";
import { loadHubDirectory } from "@/features/directory/names";
import { getMyHubScope, type MyHub } from "@/features/operations/hub-scope";
import { createPricingQuote, getProvinces, getWards } from "@/features/pricing/api";
import type { PricingOption, PricingQuote, Province, Ward } from "@/features/pricing/contracts";
import { selectClassName, textareaClassName } from "@/features/pricing/ui";
import type { GoodsCategory } from "@/features/shipments/contracts";
import { goodsCategoryLabel, money } from "@/features/shipments/presentation";

const CATEGORIES: GoodsCategory[] = [
  "DOCUMENTS",
  "APPAREL",
  "ELECTRONICS",
  "DRY_FOOD",
  "COSMETICS",
  "HOUSEHOLD",
  "FRAGILE_GOODS",
  "OTHER",
];

type DraftParcel = {
  key: number;
  description: string;
  quantity: string;
  category: GoodsCategory;
  isFragile: boolean;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
};

const emptyAddress: CounterAddress = { contactName: "", contactPhone: "", addressLine: "", provinceCode: "", wardCode: "" };

let parcelKey = 0;
function newParcel(): DraftParcel {
  parcelKey += 1;
  return { key: parcelKey, description: "", quantity: "1", category: "OTHER", isFragile: false, weightKg: "", lengthCm: "", widthCm: "", heightCm: "" };
}

function positive(value: string) {
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

function wholeMoney(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Books a walk-in customer's shipment at the clerk's hub: weigh, quote from the hub's ward, take
 * the fee in cash if the sender pays, create the shipment and go to the labels and receipt.
 */
export function CounterShipmentForm() {
  const router = useRouter();
  const [hubs, setHubs] = useState<MyHub[]>([]);
  const [hubId, setHubId] = useState("");
  const [hubError, setHubError] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [sender, setSender] = useState<CounterAddress>(emptyAddress);
  const [recipient, setRecipient] = useState<CounterAddress>(emptyAddress);
  const [parcels, setParcels] = useState<DraftParcel[]>(() => [newParcel()]);
  const [cod, setCod] = useState("");
  const [declared, setDeclared] = useState("");
  const [payer, setPayer] = useState<ShippingFeePayer>("SENDER");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [optionId, setOptionId] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [cashConfirmed, setCashConfirmed] = useState(false);
  const [saveContacts, setSaveContacts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const hub = hubs.find((item) => item.id === hubId) ?? null;

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyHubScope(), getProvinces()])
      .then(async ([scope, items]) => {
        // Head office may book at any hub's counter, e.g. to help out or to test.
        const candidates: MyHub[] = scope.allHubs
          ? [...(await loadHubDirectory()).values()].map((item) => ({ ...item, primary: false }))
          : scope.hubs;
        if (cancelled) return;
        setProvinces(items);
        const own = candidates.filter((item) => item.status === "ACTIVE");
        setHubs(own);
        const first = own.find((item) => item.primary) ?? own[0];
        if (first) {
          setHubId(first.id);
          setSender((current) => ({ ...current, provinceCode: first.provinceCode, wardCode: first.wardCode }));
        } else {
          setHubError("Tài khoản chưa thuộc bưu cục nào nên chưa nhận gửi tại quầy được.");
        }
      })
      .catch(() => {
        if (!cancelled) setHubError("Không tải được bưu cục của bạn. Tải lại trang để thử lại.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Anything that changes the price makes the quote stale.
  const invalidate = useCallback(() => {
    setQuote(null);
    setOptionId("");
    setCashConfirmed(false);
  }, []);

  const option: PricingOption | null = quote?.options.find((item) => item.quoteId === optionId) ?? null;
  const codAmount = wholeMoney(cod);
  const declaredValue = wholeMoney(declared);
  const cashNow = option && payer === "SENDER" ? option.total : 0;
  const recipientPays = option ? codAmount + (payer === "RECIPIENT" ? option.total : 0) : codAmount;

  const parcelProblem = useMemo(() => {
    for (const [index, parcel] of parcels.entries()) {
      const label = `Kiện ${index + 1}`;
      if (!parcel.description.trim()) return `${label}: nhập mô tả hàng.`;
      if (!Number.isInteger(Number(parcel.quantity)) || Number(parcel.quantity) < 1) return `${label}: số lượng phải từ 1.`;
      if (!positive(parcel.weightKg)) return `${label}: nhập cân nặng (kg).`;
      if (!positive(parcel.lengthCm) || !positive(parcel.widthCm) || !positive(parcel.heightCm)) return `${label}: nhập đủ dài, rộng, cao (cm).`;
    }
    return null;
  }, [parcels]);

  async function requestQuote() {
    if (!hub) return;
    if (!recipient.provinceCode || !recipient.wardCode) {
      toast.error("Chọn tỉnh/thành và phường/xã của người nhận trước khi tính cước.");
      return;
    }
    if (parcelProblem) {
      toast.error(parcelProblem);
      return;
    }
    setQuoting(true);
    try {
      const next = await createPricingQuote({
        // The parcels are already at this hub: the price starts from its ward.
        originProvinceCode: hub.provinceCode,
        originWardCode: hub.wardCode,
        destinationProvinceCode: recipient.provinceCode,
        destinationWardCode: recipient.wardCode,
        codAmount,
        declaredValue,
        parcels: parcels.map((parcel) => ({
          weightKg: positive(parcel.weightKg)!,
          lengthCm: positive(parcel.lengthCm)!,
          widthCm: positive(parcel.widthCm)!,
          heightCm: positive(parcel.heightCm)!,
        })),
      });
      setQuote(next);
      setOptionId(next.options[0]?.quoteId ?? "");
      setCashConfirmed(false);
    } catch (reason) {
      toast.error(counterErrorMessage(reason, "Không tính được cước."));
    } finally {
      setQuoting(false);
    }
  }

  async function submit() {
    if (!hub || !option) return;
    if (!sender.contactName.trim() || !sender.contactPhone.trim() || !sender.addressLine.trim() || !sender.wardCode) {
      toast.error("Nhập đủ tên, số điện thoại và địa chỉ người gửi.");
      return;
    }
    if (!recipient.contactName.trim() || !recipient.contactPhone.trim() || !recipient.addressLine.trim()) {
      toast.error("Nhập đủ tên, số điện thoại và địa chỉ người nhận.");
      return;
    }
    if (payer === "SENDER" && !cashConfirmed) {
      toast.error(`Xác nhận đã nhận đủ ${money(cashNow)} tiền mặt trước khi tạo đơn.`);
      return;
    }
    setSubmitting(true);
    try {
      const created = await createCounterShipment(
        {
          hubId: hub.id,
          quoteId: option.quoteId,
          sender,
          recipient,
          shippingFeePayer: payer,
          parcels: parcels.map((parcel) => ({
            description: parcel.description.trim(),
            quantity: Number(parcel.quantity),
            category: parcel.category,
            isFragile: parcel.isFragile,
          })),
          note: note.trim() || null,
          cashReceived: cashNow,
        },
        idempotencyKey.current,
      );
      if (saveContacts) {
        // The shipment exists either way; a contact that fails to save is only a convenience lost.
        await Promise.allSettled(
          [sender, recipient].map((party) =>
            saveCounterContact({
              phone: party.contactPhone,
              name: party.contactName,
              addressLine: party.addressLine,
              provinceCode: party.provinceCode,
              wardCode: party.wardCode,
            }),
          ),
        );
      }
      toast.success(`Đã tạo vận đơn ${created.trackingCode}.`);
      router.push(`/counter/${encodeURIComponent(created.trackingCode)}/print`);
    } catch (reason) {
      toast.error(counterErrorMessage(reason, "Không tạo được vận đơn."));
      // A retry after a real failure is a new request.
      idempotencyKey.current = crypto.randomUUID();
      setSubmitting(false);
    }
  }

  if (hubError) {
    return <Card className="p-6 text-sm font-bold text-destructive">{hubError}</Card>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid gap-4">
        <Section title="1. Bưu cục nhận gửi">
          {hubs.length > 1 ? (
            <select
              className={selectClassName}
              value={hubId}
              onChange={(event) => {
                setHubId(event.target.value);
                invalidate();
              }}
            >
              {hubs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold">{hub ? `${hub.code} · ${hub.name}` : "Đang tải…"}</p>
          )}
          <p className="text-xs text-muted-foreground">Cước tính từ bưu cục này; hàng nhập kho ngay khi tạo đơn, không cần bưu tá đến lấy.</p>
        </Section>

        <Section title="2. Người gửi">
          <PartyFields value={sender} provinces={provinces} onChange={setSender} />
        </Section>

        <Section title="3. Người nhận">
          <PartyFields
            value={recipient}
            provinces={provinces}
            onChange={(next) => {
              if (next.provinceCode !== recipient.provinceCode || next.wardCode !== recipient.wardCode) invalidate();
              setRecipient(next);
            }}
          />
        </Section>

        <Section title="4. Kiện hàng">
          <div className="grid gap-3">
            {parcels.map((parcel, index) => (
              <ParcelRow
                key={parcel.key}
                index={index}
                parcel={parcel}
                canRemove={parcels.length > 1}
                onChange={(next) => {
                  const changesPrice = ["weightKg", "lengthCm", "widthCm", "heightCm"].some(
                    (field) => next[field as keyof DraftParcel] !== parcel[field as keyof DraftParcel],
                  );
                  if (changesPrice) invalidate();
                  setParcels((items) => items.map((item) => (item.key === parcel.key ? next : item)));
                }}
                onRemove={() => {
                  invalidate();
                  setParcels((items) => items.filter((item) => item.key !== parcel.key));
                }}
              />
            ))}
            {parcels.length < 20 ? (
              <Button
                type="button"
                variant="outline"
                className="justify-self-start"
                onClick={() => {
                  invalidate();
                  setParcels((items) => [...items, newParcel()]);
                }}
              >
                <PlusIcon className="size-3.5" /> Thêm kiện
              </Button>
            ) : null}
          </div>
        </Section>

        <Section title="5. Thu hộ và cước">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tiền thu hộ (COD)" hint="Người nhận trả khi nhận hàng; Pavex trả lại người gửi bằng tiền mặt tại quầy này.">
              <Input inputMode="numeric" value={cod} placeholder="0" onChange={(event) => { setCod(event.target.value); invalidate(); }} />
            </Field>
            <Field label="Giá trị khai báo" hint="Dùng để tính phí bảo hiểm.">
              <Input inputMode="numeric" value={declared} placeholder="0" onChange={(event) => { setDeclared(event.target.value); invalidate(); }} />
            </Field>
            <Field label="Người trả cước">
              <select
                className={selectClassName}
                value={payer}
                onChange={(event) => {
                  setPayer(event.target.value as ShippingFeePayer);
                  setCashConfirmed(false);
                }}
              >
                <option value="SENDER">Người gửi trả ngay tại quầy</option>
                <option value="RECIPIENT">Người nhận trả khi nhận hàng</option>
              </select>
            </Field>
            <Field label="Ghi chú">
              <textarea className={`${textareaClassName} min-h-9`} rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
          </div>
        </Section>
      </div>

      <div className="grid content-start gap-4 xl:sticky xl:top-4">
        <Section title="6. Cước và thanh toán">
          <Button type="button" variant="outline" disabled={quoting || !hub} onClick={() => void requestQuote()}>
            {quoting ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <CalculatorIcon className="size-3.5" />}
            {quote ? "Tính lại cước" : "Tính cước"}
          </Button>
          {quote ? (
            <div className="grid gap-2">
              {quote.options.map((item) => (
                <label
                  key={item.quoteId}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-md border p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
                >
                  <span className="flex items-center gap-2">
                    <input type="radio" name="service" checked={optionId === item.quoteId} onChange={() => { setOptionId(item.quoteId); setCashConfirmed(false); }} />
                    <span className="font-bold">{item.serviceLevel === "Express" ? "Hoả tốc" : "Tiêu chuẩn"}</span>
                    <span className="text-xs text-muted-foreground">{item.estimatedMinDays}–{item.estimatedMaxDays} ngày</span>
                  </span>
                  <span className="font-black">{money(item.total)}</span>
                </label>
              ))}
              <p className="text-[0.68rem] text-muted-foreground">Cân tính cước {quote.chargeableWeightKg} kg · báo giá hết hạn sau ít phút, quá hạn thì tính lại.</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nhập người nhận và kiện hàng rồi bấm Tính cước.</p>
          )}
          {option ? (
            <dl className="grid gap-1.5 rounded-md bg-muted/40 p-3 text-sm">
              <Row label="Thu ngay tại quầy" value={money(cashNow)} strong />
              <Row label="Người nhận trả khi giao" value={money(recipientPays)} />
              {codAmount > 0 ? <Row label="Trả lại người gửi (sau khi giao)" value={money(codAmount)} /> : null}
            </dl>
          ) : null}
          {option && payer === "SENDER" ? (
            <label className="flex items-start gap-2 text-sm font-bold">
              <input type="checkbox" className="mt-1" checked={cashConfirmed} onChange={(event) => setCashConfirmed(event.target.checked)} />
              Đã nhận đủ {money(cashNow)} tiền mặt của người gửi
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={saveContacts} onChange={(event) => setSaveContacts(event.target.checked)} />
            Lưu người gửi và người nhận vào danh bạ cho lần sau
          </label>
          <Button type="button" disabled={!option || submitting || (payer === "SENDER" && !cashConfirmed)} onClick={() => void submit()}>
            {submitting ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}
            Tạo vận đơn và in nhãn
          </Button>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/25 px-4 py-3">
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      <div className="grid gap-3 p-4">{children}</div>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[0.65rem] font-normal leading-5 text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-base font-black text-brand" : "font-bold"}>{value}</dd>
    </div>
  );
}

const wardCache = new Map<string, Promise<Ward[]>>();
function wardsOf(provinceCode: string) {
  if (!wardCache.has(provinceCode)) {
    wardCache.set(provinceCode, getWards(provinceCode).catch((reason) => {
      wardCache.delete(provinceCode);
      throw reason;
    }));
  }
  return wardCache.get(provinceCode)!;
}

/** Phone first: a known customer fills the rest from the counter address book. */
function PartyFields({
  value,
  provinces,
  onChange,
}: {
  value: CounterAddress;
  provinces: Province[];
  onChange: (next: CounterAddress) => void;
}) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [matches, setMatches] = useState<CounterContact[] | null>(null);
  const [looking, setLooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value.provinceCode) {
      void Promise.resolve().then(() => !cancelled && setWards([]));
      return () => {
        cancelled = true;
      };
    }
    wardsOf(value.provinceCode)
      .then((items) => !cancelled && setWards(items))
      .catch(() => !cancelled && setWards([]));
    return () => {
      cancelled = true;
    };
  }, [value.provinceCode]);

  async function lookup() {
    if (value.contactPhone.replace(/\D/g, "").length < 9) {
      toast.error("Nhập đủ số điện thoại rồi bấm Tra.");
      return;
    }
    setLooking(true);
    try {
      setMatches(await findCounterContacts(value.contactPhone));
    } catch (reason) {
      toast.error(counterErrorMessage(reason, "Không tra được danh bạ."));
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Số điện thoại">
        <div className="flex gap-2">
          <Input
            inputMode="tel"
            value={value.contactPhone}
            maxLength={20}
            onChange={(event) => {
              setMatches(null);
              onChange({ ...value, contactPhone: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void lookup();
              }
            }}
          />
          <Button type="button" variant="outline" disabled={looking} onClick={() => void lookup()}>
            {looking ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <SearchIcon className="size-3.5" />} Tra
          </Button>
        </div>
      </Field>
      <Field label="Họ tên">
        <Input value={value.contactName} maxLength={120} onChange={(event) => onChange({ ...value, contactName: event.target.value })} />
      </Field>
      {matches ? (
        <div className="grid gap-1.5 sm:col-span-2">
          {matches.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có trong danh bạ. Nhập thông tin bên dưới; đơn tạo xong sẽ được lưu lại.</p>
          ) : (
            matches.map((contact) => (
              <button
                key={contact.id}
                type="button"
                className="rounded-md border px-3 py-2 text-left text-xs hover:border-brand hover:bg-brand/5"
                onClick={() => {
                  onChange({
                    contactName: contact.name,
                    contactPhone: contact.phone,
                    addressLine: contact.addressLine,
                    provinceCode: contact.provinceCode,
                    wardCode: contact.wardCode,
                  });
                  setMatches(null);
                }}
              >
                <span className="font-bold">{contact.name}</span> · {contact.addressLine}, {contact.wardName}, {contact.provinceName}
                <span className="text-muted-foreground"> · đã gửi {contact.useCount} lần</span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <Field label="Tỉnh / thành">
        <select
          className={selectClassName}
          value={value.provinceCode}
          onChange={(event) => onChange({ ...value, provinceCode: event.target.value, wardCode: "" })}
        >
          <option value="">Chọn tỉnh/thành</option>
          {provinces.map((province) => (
            <option key={province.code} value={province.code}>
              {province.fullName || province.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Phường / xã">
        <select
          className={selectClassName}
          value={value.wardCode}
          disabled={!value.provinceCode}
          onChange={(event) => onChange({ ...value, wardCode: event.target.value })}
        >
          <option value="">Chọn phường/xã</option>
          {wards.map((ward) => (
            <option key={ward.code} value={ward.code}>
              {ward.fullName || ward.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Số nhà, đường">
          <Input value={value.addressLine} maxLength={500} onChange={(event) => onChange({ ...value, addressLine: event.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function ParcelRow({
  index,
  parcel,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  parcel: DraftParcel;
  canRemove: boolean;
  onChange: (next: DraftParcel) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<DraftParcel>) => onChange({ ...parcel, ...patch });
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-brand">Kiện {index + 1}</p>
        {canRemove ? (
          <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2Icon className="inline size-3.5" /> Bỏ kiện
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_90px]">
        <Field label="Mô tả hàng">
          <Input value={parcel.description} maxLength={500} onChange={(event) => set({ description: event.target.value })} />
        </Field>
        <Field label="Loại hàng">
          <select className={selectClassName} value={parcel.category} onChange={(event) => set({ category: event.target.value as GoodsCategory })}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {goodsCategoryLabel(category)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Số lượng">
          <Input inputMode="numeric" value={parcel.quantity} onChange={(event) => set({ quantity: event.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Cân nặng (kg)">
          <Input inputMode="decimal" value={parcel.weightKg} onChange={(event) => set({ weightKg: event.target.value })} />
        </Field>
        <Field label="Dài (cm)">
          <Input inputMode="decimal" value={parcel.lengthCm} onChange={(event) => set({ lengthCm: event.target.value })} />
        </Field>
        <Field label="Rộng (cm)">
          <Input inputMode="decimal" value={parcel.widthCm} onChange={(event) => set({ widthCm: event.target.value })} />
        </Field>
        <Field label="Cao (cm)">
          <Input inputMode="decimal" value={parcel.heightCm} onChange={(event) => set({ heightCm: event.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-xs font-bold">
        <input type="checkbox" checked={parcel.isFragile} onChange={(event) => set({ isFragile: event.target.checked })} />
        Hàng dễ vỡ
      </label>
    </div>
  );
}
