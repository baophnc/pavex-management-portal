"use client";

import {
  ArrowUpRightIcon,
  CalculatorIcon,
  LoaderCircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createPricingQuote,
  getCurrentRatePlan,
  getProvinces,
  getWards,
} from "@/features/pricing/api";
import type {
  PricingParcelInput,
  PricingQuote,
  Province,
  RatePlan,
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
  PricingField,
  PricingMoneyInput,
  PricingPageHeader,
  selectClassName,
} from "@/features/pricing/ui";

const emptyParcel: PricingParcelInput = {
  weightKg: 1,
  lengthCm: 20,
  widthCm: 20,
  heightCm: 20,
};

export function PricingSimulator() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [activePlan, setActivePlan] = useState<RatePlan | null>(null);
  const [originWards, setOriginWards] = useState<Ward[]>([]);
  const [destinationWards, setDestinationWards] = useState<Ward[]>([]);
  const [originProvinceCode, setOriginProvinceCode] = useState("");
  const [originWardCode, setOriginWardCode] = useState("");
  const [destinationProvinceCode, setDestinationProvinceCode] = useState("");
  const [destinationWardCode, setDestinationWardCode] = useState("");
  const [codAmount, setCodAmount] = useState(0);
  const [declaredValue, setDeclaredValue] = useState(0);
  const [parcels, setParcels] = useState<PricingParcelInput[]>([{ ...emptyParcel }]);
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      getProvinces(),
      getCurrentRatePlan().catch(() => null),
    ])
      .then(([items, plan]) => {
        if (!active) return;
        setProvinces(items);
        setActivePlan(plan);
      })
      .catch((reason) =>
        toast.error(pricingErrorMessage(reason, "Không thể tải dữ liệu tính cước.")),
      );
    return () => {
      active = false;
    };
  }, []);

  const changeOriginProvince = (code: string) => {
    setOriginProvinceCode(code);
    setOriginWardCode("");
    setOriginWards([]);
    setQuote(null);
    if (!code) return;
    setLoadingOrigin(true);
    getWards(code)
      .then(setOriginWards)
      .catch((reason) =>
        toast.error(pricingErrorMessage(reason, "Không thể tải xã/phường điểm gửi.")),
      )
      .finally(() => setLoadingOrigin(false));
  };

  const changeDestinationProvince = (code: string) => {
    setDestinationProvinceCode(code);
    setDestinationWardCode("");
    setDestinationWards([]);
    setQuote(null);
    if (!code) return;
    setLoadingDestination(true);
    getWards(code)
      .then(setDestinationWards)
      .catch((reason) =>
        toast.error(pricingErrorMessage(reason, "Không thể tải xã/phường điểm nhận.")),
      )
      .finally(() => setLoadingDestination(false));
  };

  const updateParcel = (
    index: number,
    key: keyof PricingParcelInput,
    value: number,
  ) => {
    setParcels((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
    setQuote(null);
  };

  const calculate = async () => {
    if (
      !originProvinceCode ||
      !originWardCode ||
      !destinationProvinceCode ||
      !destinationWardCode
    ) {
      toast.error("Chọn đầy đủ địa chỉ gửi và nhận.");
      return;
    }
    if (
      !parcels.length ||
      parcels.some(
        (parcel) =>
          parcel.weightKg <= 0 ||
          parcel.lengthCm <= 0 ||
          parcel.widthCm <= 0 ||
          parcel.heightCm <= 0,
      )
    ) {
      toast.error("Khối lượng và kích thước tất cả kiện phải lớn hơn 0.");
      return;
    }
    setLoading(true);
    try {
      setQuote(
        await createPricingQuote({
          originProvinceCode,
          originWardCode,
          destinationProvinceCode,
          destinationWardCode,
          codAmount,
          declaredValue,
          parcels,
        }),
      );
    } catch (reason) {
      setQuote(null);
      toast.error(pricingErrorMessage(reason, "Không thể tính cước."));
    } finally {
      setLoading(false);
    }
  };

  const originName = useMemo(
    () =>
      originWards.find((ward) => ward.code === originWardCode)?.fullName ||
      originWards.find((ward) => ward.code === originWardCode)?.name ||
      "Điểm gửi",
    [originWards, originWardCode],
  );
  const destinationName = useMemo(
    () =>
      destinationWards.find((ward) => ward.code === destinationWardCode)?.fullName ||
      destinationWards.find((ward) => ward.code === destinationWardCode)?.name ||
      "Điểm nhận",
    [destinationWards, destinationWardCode],
  );

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Bảng giá & cước"
        title="Tính thử cước vận chuyển"
        description="Chọn địa chỉ, kiện hàng và dịch vụ bổ sung để xem mức cước thực tế mà hệ thống đang áp dụng."
        help={{
          description:
            "Kết quả được tính từ bảng giá đang áp dụng và phạm vi phục vụ hiện tại của mạng lưới.",
          bullets: [
            "Tiền thu hộ không được cộng trực tiếp vào cước vận chuyển; chỉ phí dịch vụ thu hộ được cộng.",
            "Giá trị khai báo có thể phát sinh phí bảo hiểm theo chính sách bảng giá.",
            "Kết quả tính cước chỉ có hiệu lực trong một khoảng thời gian nhất định.",
          ],
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4">
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/25 px-4 py-3">
              <h2 className="text-sm font-black">1. Điểm gửi và điểm nhận</h2>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-xs font-black text-brand">Điểm gửi</p>
                <PricingField label="Tỉnh / thành">
                  <select
                    className={selectClassName}
                    value={originProvinceCode}
                    onChange={(event) => changeOriginProvince(event.target.value)}
                  >
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.fullName || province.name}
                      </option>
                    ))}
                  </select>
                </PricingField>
                <PricingField label="Xã / phường">
                  <select
                    className={selectClassName}
                    disabled={!originProvinceCode || loadingOrigin}
                    value={originWardCode}
                    onChange={(event) => {
                      setOriginWardCode(event.target.value);
                      setQuote(null);
                    }}
                  >
                    <option value="">
                      {loadingOrigin ? "Đang tải..." : "Chọn xã/phường"}
                    </option>
                    {originWards.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.fullName || ward.name}
                      </option>
                    ))}
                  </select>
                </PricingField>
              </div>

              <div className="grid gap-3 rounded-lg border p-3">
                <p className="text-xs font-black text-brand">Điểm nhận</p>
                <PricingField label="Tỉnh / thành">
                  <select
                    className={selectClassName}
                    value={destinationProvinceCode}
                    onChange={(event) => changeDestinationProvince(event.target.value)}
                  >
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.fullName || province.name}
                      </option>
                    ))}
                  </select>
                </PricingField>
                <PricingField label="Xã / phường">
                  <select
                    className={selectClassName}
                    disabled={!destinationProvinceCode || loadingDestination}
                    value={destinationWardCode}
                    onChange={(event) => {
                      setDestinationWardCode(event.target.value);
                      setQuote(null);
                    }}
                  >
                    <option value="">
                      {loadingDestination ? "Đang tải..." : "Chọn xã/phường"}
                    </option>
                    {destinationWards.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.fullName || ward.name}
                      </option>
                    ))}
                  </select>
                </PricingField>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
              <div>
                <h2 className="text-sm font-black">2. Kiện hàng</h2>
                <p className="mt-1 text-[0.68rem] text-muted-foreground">
                  Hệ thống hỗ trợ tối đa 20 kiện trong một lần tính cước.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={parcels.length >= 20}
                onClick={() =>
                  setParcels((items) => [...items, { ...emptyParcel }])
                }
              >
                <PlusIcon className="size-3.5" />
                Thêm kiện
              </Button>
            </div>
            <div className="grid gap-3 p-4">
              {parcels.map((parcel, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[80px_repeat(4,minmax(0,1fr))_auto] sm:items-end"
                >
                  <div>
                    <p className="text-xs font-black">Kiện {index + 1}</p>
                    <p className="mt-1 text-[0.62rem] text-muted-foreground">
                      Đơn vị kg/cm
                    </p>
                  </div>
                  <PricingField label="Khối lượng">
                    <Input
                      type="number"
                      min={0.01}
                      step={0.1}
                      value={parcel.weightKg}
                      onChange={(event) =>
                        updateParcel(index, "weightKg", Number(event.target.value))
                      }
                    />
                  </PricingField>
                  <PricingField label="Dài">
                    <Input
                      type="number"
                      min={0.01}
                      step={1}
                      value={parcel.lengthCm}
                      onChange={(event) =>
                        updateParcel(index, "lengthCm", Number(event.target.value))
                      }
                    />
                  </PricingField>
                  <PricingField label="Rộng">
                    <Input
                      type="number"
                      min={0.01}
                      step={1}
                      value={parcel.widthCm}
                      onChange={(event) =>
                        updateParcel(index, "widthCm", Number(event.target.value))
                      }
                    />
                  </PricingField>
                  <PricingField label="Cao">
                    <Input
                      type="number"
                      min={0.01}
                      step={1}
                      value={parcel.heightCm}
                      onChange={(event) =>
                        updateParcel(index, "heightCm", Number(event.target.value))
                      }
                    />
                  </PricingField>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={parcels.length <= 1}
                    aria-label={`Xóa kiện ${index + 1}`}
                    onClick={() => {
                      setParcels((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      );
                      setQuote(null);
                    }}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b bg-muted/25 px-4 py-3">
              <h2 className="text-sm font-black">3. Thu hộ & giá trị hàng hóa</h2>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <PricingField
                label="Số tiền cần thu hộ"
                hint={
                  activePlan
                    ? `Miễn phí dịch vụ thu hộ đến ${money(activePlan.codFreeThreshold)} · tối đa ${money(activePlan.maximumCod)}.`
                    : "Nhập số tiền Pavex cần thu từ người nhận khi giao hàng."
                }
              >
                <PricingMoneyInput
                  value={codAmount}
                  onValueChange={(value) => {
                    setCodAmount(value);
                    setQuote(null);
                  }}
                />
              </PricingField>
              <PricingField
                label="Giá trị khai báo"
                hint={
                  activePlan
                    ? `Miễn phí bảo hiểm đến ${money(activePlan.insuranceFreeThreshold)} · tối đa ${money(activePlan.maximumDeclaredValue)}.`
                    : "Giá trị hàng hóa dùng để tính phí bảo hiểm khi vượt ngưỡng miễn phí."
                }
              >
                <PricingMoneyInput
                  value={declaredValue}
                  onValueChange={(value) => {
                    setDeclaredValue(value);
                    setQuote(null);
                  }}
                />
              </PricingField>
            </div>
            <div className="flex justify-end border-t p-4">
              <Button size="lg" disabled={loading} onClick={() => void calculate()}>
                {loading ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : (
                  <CalculatorIcon className="size-4" />
                )}
                Tính cước
              </Button>
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-4 xl:sticky xl:top-4">
          {!quote ? (
            <Card className="grid min-h-72 place-items-center p-6 text-center">
              <div>
                <CalculatorIcon className="mx-auto size-8 text-muted-foreground" />
                <h2 className="mt-3 font-black">Chưa có kết quả</h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Chọn địa chỉ, nhập kiện hàng rồi bấm Tính cước để xem mức phí.
                </p>
              </div>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <div className="border-b bg-brand/[0.05] p-4">
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-brand">
                    Kết quả tính cước
                  </p>
                  <h2 className="mt-1 text-base font-black">
                    {originName} → {destinationName}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pricingZoneLabel(quote.lane)} · {quote.parcelCount} kiện
                  </p>
                </div>
                <div className="grid grid-cols-3 divide-x">
                  <div className="p-3">
                    <p className="text-[0.6rem] font-black uppercase text-muted-foreground">
                      Thực tế
                    </p>
                    <p className="mt-1 text-sm font-black">{quote.actualWeightKg} kg</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[0.6rem] font-black uppercase text-muted-foreground">
                      Quy đổi
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {quote.volumetricWeightKg} kg
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[0.6rem] font-black uppercase text-muted-foreground">
                      Tính cước
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {quote.chargeableWeightKg} kg
                    </p>
                  </div>
                </div>
                <div className="border-t px-4 py-3 text-[0.68rem] text-muted-foreground">
                  Kết quả có hiệu lực đến {dateTime(quote.expiresAt)}
                </div>
              </Card>

              {quote.options.map((option) => (
                <Card key={option.quoteId} className="overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b bg-muted/25 p-4">
                    <div>
                      <p className="text-sm font-black">
                        {serviceLevelLabel(option.serviceLevel)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Dự kiến {option.estimatedMinDays}–{option.estimatedMaxDays} ngày
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.62rem] font-bold text-muted-foreground">
                        Tổng cước vận chuyển
                      </p>
                      <p className="mt-1 text-xl font-black text-brand">
                        {money(option.total)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 p-4 text-xs">
                    {[
                      ["Phí cơ bản", option.baseFee],
                      ["Phí khối lượng tăng thêm", option.additionalWeightFee],
                      ["Phụ phí khu vực", option.areaSurcharge],
                      ["Phí dịch vụ thu hộ", option.codFee],
                      ["Phí bảo hiểm", option.insuranceFee],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between gap-3">
                        <span className="text-muted-foreground">{String(label)}</span>
                        <strong>{money(Number(value))}</strong>
                      </div>
                    ))}
                    <div className="mt-1 flex justify-between gap-3 border-t pt-3 text-sm">
                      <strong>Tổng cước</strong>
                      <strong>{money(option.total)}</strong>
                    </div>
                  </div>

                  <div className="grid gap-2 border-t bg-muted/15 p-4 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Số tiền cần thu hộ</span>
                      <strong>{money(codAmount)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Phí dịch vụ thu hộ</span>
                      <strong>{money(option.codFee)}</strong>
                    </div>
                    {codAmount > 0 && option.codFee === 0 ? (
                      <p className="rounded-md border bg-background px-3 py-2 text-[0.68rem] leading-5 text-muted-foreground">
                        Số tiền thu hộ không cộng vào cước. Phí dịch vụ thu hộ hiện bằng 0 theo chính sách bảng giá đang áp dụng.
                      </p>
                    ) : null}
                    {declaredValue > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Giá trị khai báo</span>
                        <strong>{money(declaredValue)}</strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t px-4 py-3">
                    <Link
                      href={`/pricing/quotes?quoteId=${encodeURIComponent(option.quoteId)}`}
                      className="inline-flex items-center gap-1 text-xs font-black text-brand hover:underline"
                    >
                      Xem chi tiết cách tính cước
                      <ArrowUpRightIcon className="size-3.5" />
                    </Link>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
