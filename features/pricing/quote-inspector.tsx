"use client";

import {
  BoxesIcon,
  CircleDollarSignIcon,
  CopyIcon,
  SearchIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPricingQuoteSnapshot } from "@/features/pricing/api";
import type { PricingQuoteSnapshot } from "@/features/pricing/contracts";
import {
  pricingZoneLabel,
  serviceLevelLabel,
} from "@/features/pricing/contracts";
import { pricingErrorMessage } from "@/features/pricing/errors";
import {
  dateTime,
  money,
  PricingError,
  PricingLoading,
  PricingMetric,
  PricingPageHeader,
} from "@/features/pricing/ui";

function locationSummary(location: PricingQuoteSnapshot["origin"]) {
  return `${location.provinceCode} / ${location.wardCode}`;
}

function tierLabel(tier: PricingQuoteSnapshot["origin"]["coverageTier"]) {
  if (tier === "REMOTE") return "Vùng xa";
  if (tier === "ISLAND") return "Hải đảo";
  return "Tiêu chuẩn";
}

export function PricingQuoteInspector({ initialQuoteId = "" }: { initialQuoteId?: string }) {
  const [quoteId, setQuoteId] = useState(initialQuoteId);
  const [quote, setQuote] = useState<PricingQuoteSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQuoteId));
  const [error, setError] = useState<string | null>(null);

  async function load(target = quoteId) {
    const value = target.trim();
    if (!value) {
      toast.error("Nhập Quote ID cần kiểm tra.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setQuote(await getPricingQuoteSnapshot(value));
    } catch (reason) {
      setQuote(null);
      setError(pricingErrorMessage(reason, "Không thể tải snapshot quote."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialQuoteId) return;
    let active = true;
    const task = window.setTimeout(() => {
      void getPricingQuoteSnapshot(initialQuoteId)
        .then((result) => {
          if (!active) return;
          setQuote(result);
          setError(null);
        })
        .catch((reason) => {
          if (!active) return;
          setQuote(null);
          setError(pricingErrorMessage(reason, "Không thể tải snapshot quote."));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(task);
    };
  }, [initialQuoteId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}.`);
  }

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Pricing support"
        title="Kiểm tra quote"
        description="Tra cứu snapshot giá đã phát hành theo Quote ID để support đối chiếu bảng giá, tuyến giá, trọng lượng và từng khoản phí mà Shipment sẽ sử dụng."
        help={{
          description:
            "Admin endpoint đọc đúng snapshot bất biến của quote. Đây là dữ liệu phù hợp để điều tra vì sao một vận đơn nhận mức giá cụ thể.",
          bullets: [
            "Quote snapshot giữ rate code/revision tại lúc phát hành, không đổi theo bảng giá hiện tại.",
            "Kiểm tra origin/destination resolution để biết vùng giá và tier phụ phí.",
            "Quote hết hạn vẫn có thể được admin xem để support; Shipment mới sẽ không được dùng quote hết hạn.",
          ],
        }}
      />

      <Card className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submit}>
          <Input
            value={quoteId}
            onChange={(event) => setQuoteId(event.target.value)}
            placeholder="Quote ID (UUID)"
            className="font-mono"
          />
          <Button type="submit" disabled={loading} className="shrink-0">
            <SearchIcon className="size-4" />
            Tra cứu quote
          </Button>
        </form>
      </Card>

      {loading ? (
        <PricingLoading label="Đang tải snapshot quote..." />
      ) : error ? (
        <PricingError message={error} onRetry={() => void load()} />
      ) : !quote ? (
        <Card className="grid min-h-64 place-items-center p-6 text-center">
          <div>
            <CircleDollarSignIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-black">Chưa chọn quote</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dán Quote ID từ Shipment, log Pricing hoặc trang mô phỏng để kiểm tra.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b bg-muted/25 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border bg-brand/5 px-2.5 py-1 text-[0.62rem] font-black text-brand">
                    {serviceLevelLabel(quote.serviceLevel)}
                  </span>
                  <span className="rounded-full border px-2.5 py-1 text-[0.62rem] font-black">
                    {pricingZoneLabel(quote.pricingZone)}
                  </span>
                </div>
                <p className="mt-3 font-mono text-xs font-black">{quote.quoteId}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Phát hành {dateTime(quote.createdAt)} · hết hạn {dateTime(quote.expiresAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copy(quote.quoteId, "Quote ID")}
              >
                <CopyIcon className="size-3.5" />
                Sao chép ID
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              <PricingMetric label="Tổng cước" value={money(quote.fees.total)} />
              <PricingMetric label="Khối lượng thực" value={`${quote.actualWeightKg} kg`} />
              <PricingMetric label="Khối lượng quy đổi" value={`${quote.volumetricWeightKg} kg`} />
              <PricingMetric label="Khối lượng tính cước" value={`${quote.chargeableWeightKg} kg`} />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-4">
              <p className="text-sm font-black">Snapshot bảng giá</p>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg border p-3"><p className="text-muted-foreground">Rate code</p><p className="mt-1 font-mono font-black">{quote.rateCode}</p></div>
                <div className="rounded-lg border p-3"><p className="text-muted-foreground">Revision</p><p className="mt-1 font-black">{quote.rateRevision}</p></div>
                <div className="rounded-lg border p-3"><p className="text-muted-foreground">Rate version</p><p className="mt-1 font-mono font-black">{quote.rateVersion}</p></div>
                <div className="rounded-lg border p-3"><p className="text-muted-foreground">Rate plan ID</p><p className="mt-1 break-all font-mono text-[0.68rem] font-black">{quote.ratePlanId}</p></div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-black">Các khoản phí</p>
              <div className="mt-4 divide-y rounded-lg border text-xs">
                {[
                  ["Phí cơ bản", quote.fees.baseFee],
                  ["Khối lượng tăng thêm", quote.fees.additionalWeightFee],
                  ["Phụ phí khu vực", quote.fees.areaSurcharge],
                  ["Phí COD", quote.fees.codFee],
                  ["Phí bảo hiểm", quote.fees.insuranceFee],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="text-muted-foreground">{String(label)}</span>
                    <strong>{money(Number(value))}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 bg-muted/25 px-3 py-3 text-sm">
                  <strong>Tổng</strong><strong>{money(quote.fees.total)}</strong>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {[
              ["Điểm gửi", quote.origin],
              ["Điểm nhận", quote.destination],
            ].map(([label, rawLocation]) => {
              const location = rawLocation as PricingQuoteSnapshot["origin"];
              return (
                <Card key={String(label)} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black">{String(label)}</p>
                    <span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">{tierLabel(location.coverageTier)}</span>
                  </div>
                  <p className="mt-3 text-sm font-black">{locationSummary(location)}</p>
                  <div className="mt-3 grid gap-2 font-mono text-[0.65rem] text-muted-foreground">
                    <p>serviceAreaId: {location.serviceAreaId}</p>
                    <p>regionId: {location.regionId}</p>
                    <p>primaryHubId: {location.primaryHubId}</p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b p-4">
              <BoxesIcon className="size-4 text-brand" />
              <p className="text-sm font-black">Kiện hàng ({quote.parcelCount})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr><th className="px-4 py-3">Kiện</th><th className="px-4 py-3">Thực</th><th className="px-4 py-3">Quy đổi</th><th className="px-4 py-3">Tính cước</th><th className="px-4 py-3">Kích thước</th></tr>
                </thead>
                <tbody className="divide-y">
                  {quote.parcels.map((parcel) => (
                    <tr key={parcel.sequence}>
                      <td className="px-4 py-3 font-black">#{parcel.sequence}</td>
                      <td className="px-4 py-3">{parcel.actualWeightKg} kg</td>
                      <td className="px-4 py-3">{parcel.volumetricWeightKg} kg</td>
                      <td className="px-4 py-3 font-black">{parcel.chargeableWeightKg} kg</td>
                      <td className="px-4 py-3">{parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="grid gap-3 p-4 text-xs sm:grid-cols-3">
            <div><p className="text-muted-foreground">COD</p><p className="mt-1 font-black">{money(quote.codAmount)}</p></div>
            <div><p className="text-muted-foreground">Giá trị khai báo</p><p className="mt-1 font-black">{money(quote.declaredValue)}</p></div>
            <div><p className="text-muted-foreground">SLA dự kiến</p><p className="mt-1 font-black">{quote.estimatedMinDays}–{quote.estimatedMaxDays} ngày</p></div>
          </Card>
        </>
      )}
    </div>
  );
}
