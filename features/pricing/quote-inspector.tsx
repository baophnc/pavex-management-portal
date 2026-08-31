"use client";

import { BoxesIcon, CircleDollarSignIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import {
  getPricingQuoteSnapshot,
  getProvinces,
  getWards,
} from "@/features/pricing/api";
import type {
  PricingQuoteLocationSnapshot,
  PricingQuoteSnapshot,
  Province,
  Ward,
} from "@/features/pricing/contracts";
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

function tierLabel(tier: PricingQuoteLocationSnapshot["coverageTier"]) {
  if (tier === "REMOTE") return "Vùng xa";
  if (tier === "ISLAND") return "Hải đảo";
  return "Tiêu chuẩn";
}

function placeName(
  location: PricingQuoteLocationSnapshot,
  provinces: Province[],
  wards: Ward[],
) {
  const province = provinces.find((item) => item.code === location.provinceCode);
  const ward = wards.find((item) => item.code === location.wardCode);
  const provinceName = province?.fullName || province?.name || location.provinceCode;
  const wardName = ward?.fullName || ward?.name || location.wardCode;
  return `${wardName}, ${provinceName}`;
}

export function PricingQuoteInspector({
  initialQuoteId = "",
}: {
  initialQuoteId?: string;
}) {
  const [quote, setQuote] = useState<PricingQuoteSnapshot | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [originWards, setOriginWards] = useState<Ward[]>([]);
  const [destinationWards, setDestinationWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(Boolean(initialQuoteId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialQuoteId) return;
    let active = true;

    void getPricingQuoteSnapshot(initialQuoteId)
      .then(async (result) => {
        if (!active) return;
        setQuote(result);
        setError(null);

        const [provinceItems, originWardItems, destinationWardItems] =
          await Promise.all([
            getProvinces().catch(() => []),
            getWards(result.origin.provinceCode).catch(() => []),
            result.destination.provinceCode === result.origin.provinceCode
              ? getWards(result.origin.provinceCode).catch(() => [])
              : getWards(result.destination.provinceCode).catch(() => []),
          ]);

        if (!active) return;
        setProvinces(provinceItems);
        setOriginWards(originWardItems);
        setDestinationWards(destinationWardItems);
      })
      .catch((reason) => {
        if (!active) return;
        setQuote(null);
        setError(pricingErrorMessage(reason, "Không thể tải chi tiết cách tính cước."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialQuoteId]);

  const originName = useMemo(
    () =>
      quote
        ? placeName(quote.origin, provinces, originWards)
        : "Điểm gửi",
    [originWards, provinces, quote],
  );
  const destinationName = useMemo(
    () =>
      quote
        ? placeName(quote.destination, provinces, destinationWards)
        : "Điểm nhận",
    [destinationWards, provinces, quote],
  );

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Bảng giá & cước"
        title="Chi tiết cách tính cước"
        description="Xem lại mức cước đã được hệ thống tính cho một vận đơn hoặc một lần tính thử, bao gồm khối lượng, phụ phí và dịch vụ bổ sung."
        help={{
          description:
            "Trang này dùng để đối chiếu cách hệ thống đã tính ra tổng cước tại thời điểm kết quả được phát hành.",
          bullets: [
            "Tổng cước bằng phí cơ bản, phí khối lượng tăng thêm, phụ phí khu vực, phí thu hộ và phí bảo hiểm.",
            "Số tiền thu hộ là tiền cần thu từ người nhận, không phải một phần của cước vận chuyển.",
            "Thông tin bảng giá được giữ theo thời điểm tính để việc đối chiếu không bị thay đổi bởi cấu hình mới.",
          ],
        }}
      />

      {loading ? (
        <PricingLoading label="Đang tải chi tiết cách tính cước..." />
      ) : error ? (
        <PricingError message={error} />
      ) : !initialQuoteId || !quote ? (
        <Card className="grid min-h-64 place-items-center p-6 text-center">
          <div>
            <CircleDollarSignIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-black">Chưa có dữ liệu cước để xem</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              Mở trang này từ chi tiết vận đơn hoặc từ kết quả tính thử cước để xem đúng dữ liệu cần đối chiếu.
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
                <h2 className="mt-3 text-base font-black">
                  {originName} → {destinationName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tính lúc {dateTime(quote.createdAt)} · có hiệu lực đến {dateTime(quote.expiresAt)}
                </p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2 text-right">
                <p className="text-[0.62rem] font-bold text-muted-foreground">
                  Phiên bản bảng giá
                </p>
                <p className="mt-0.5 text-sm font-black">{quote.rateRevision}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              <PricingMetric label="Tổng cước" value={money(quote.fees.total)} />
              <PricingMetric label="Khối lượng thực" value={`${quote.actualWeightKg} kg`} />
              <PricingMetric label="Khối lượng quy đổi" value={`${quote.volumetricWeightKg} kg`} />
              <PricingMetric label="Khối lượng tính cước" value={`${quote.chargeableWeightKg} kg`} />
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="overflow-hidden">
              <div className="border-b p-4">
                <p className="text-sm font-black">Chi tiết cước vận chuyển</p>
              </div>
              <div className="divide-y text-xs">
                {[
                  ["Phí cơ bản", quote.fees.baseFee],
                  ["Phí khối lượng tăng thêm", quote.fees.additionalWeightFee],
                  ["Phụ phí khu vực", quote.fees.areaSurcharge],
                  ["Phí dịch vụ thu hộ", quote.fees.codFee],
                  ["Phí bảo hiểm", quote.fees.insuranceFee],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="text-muted-foreground">{String(label)}</span>
                    <strong>{money(Number(value))}</strong>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 bg-muted/25 px-4 py-4 text-sm">
                  <strong>Tổng cước</strong>
                  <strong className="text-brand">{money(quote.fees.total)}</strong>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <p className="text-sm font-black">Thu hộ & giá trị hàng hóa</p>
              <div className="mt-4 grid gap-3 text-xs">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Số tiền cần thu hộ</p>
                  <p className="mt-1 text-lg font-black">{money(quote.codAmount)}</p>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    Không cộng trực tiếp vào tổng cước vận chuyển.
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Phí dịch vụ thu hộ</p>
                  <p className="mt-1 text-base font-black">{money(quote.fees.codFee)}</p>
                  {quote.codAmount > 0 && quote.fees.codFee === 0 ? (
                    <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                      Được miễn theo chính sách bảng giá áp dụng tại thời điểm tính.
                    </p>
                  ) : null}
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Giá trị khai báo</p>
                  <p className="mt-1 text-base font-black">{money(quote.declaredValue)}</p>
                  <p className="mt-1 text-[0.68rem] text-muted-foreground">
                    Phí bảo hiểm: {money(quote.fees.insuranceFee)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black">Điểm gửi</p>
                <span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">
                  {tierLabel(quote.origin.coverageTier)}
                </span>
              </div>
              <p className="mt-3 text-sm font-black">{originName}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black">Điểm nhận</p>
                <span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">
                  {tierLabel(quote.destination.coverageTier)}
                </span>
              </div>
              <p className="mt-3 text-sm font-black">{destinationName}</p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 border-b p-4">
              <BoxesIcon className="size-4 text-brand" />
              <p className="text-sm font-black">Kiện hàng ({quote.parcelCount})</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Kiện</th>
                    <th className="px-4 py-3">Khối lượng thực</th>
                    <th className="px-4 py-3">Khối lượng quy đổi</th>
                    <th className="px-4 py-3">Khối lượng tính cước</th>
                    <th className="px-4 py-3">Kích thước</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quote.parcels.map((parcel) => (
                    <tr key={parcel.sequence}>
                      <td className="px-4 py-3 font-black">#{parcel.sequence}</td>
                      <td className="px-4 py-3">{parcel.actualWeightKg} kg</td>
                      <td className="px-4 py-3">{parcel.volumetricWeightKg} kg</td>
                      <td className="px-4 py-3 font-black">{parcel.chargeableWeightKg} kg</td>
                      <td className="px-4 py-3">
                        {parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="grid gap-3 p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Thời gian giao dự kiến</p>
              <p className="mt-1 font-black">
                {quote.estimatedMinDays}–{quote.estimatedMaxDays} ngày
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Phạm vi tính cước</p>
              <p className="mt-1 font-black">{pricingZoneLabel(quote.pricingZone)}</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
