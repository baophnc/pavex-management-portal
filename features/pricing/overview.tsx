"use client";

import { ArrowRightIcon, CalculatorIcon, HistoryIcon, ListChecksIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentRatePlan, getRatePlans } from "@/features/pricing/api";
import type { RatePlan } from "@/features/pricing/contracts";
import { pricingErrorMessage } from "@/features/pricing/errors";
import { dateTime, money, percent, PricingError, PricingLoading, PricingMetric, PricingPageHeader, PricingStatusBadge } from "@/features/pricing/ui";

export function PricingOverview() {
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [current, setCurrent] = useState<RatePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRatePlans(),
      getCurrentRatePlan().catch(() => null),
    ])
      .then(([all, activePlan]) => {
        if (!active) return;
        setPlans(all);
        setCurrent(activePlan);
        setError(null);
      })
      .catch((reason) => {
        if (active) setError(pricingErrorMessage(reason, "Không thể tải tổng quan Pricing."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const drafts = plans.filter((plan) => plan.status === "DRAFT").length;
  const retired = plans.filter((plan) => plan.status === "RETIRED").length;

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Pricing"
        title="Quản lý giá cước"
        description="Quản lý bảng giá theo phiên bản, kiểm soát chính sách phụ phí và mô phỏng cước trước khi Shipment sử dụng quote."
        help={{
          description: "Pricing là nơi quyết định giá cước, phụ phí và SLA ước tính. Bảng giá đang áp dụng được dùng cho mọi yêu cầu tính cước mới.",
          bullets: [
            "Không sửa trực tiếp bảng giá đang áp dụng; hãy tạo phiên bản nháp mới.",
            "Mỗi bảng giá cần đủ 6 quy tắc: Tiêu chuẩn/Nhanh × 3 phạm vi.",
            "Mô phỏng cước gọi đúng Quote Engine thật và Network thật.",
          ],
        }}
        actions={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }}><RefreshCwIcon className="size-4" />Làm mới</Button>}
      />

      {loading ? <PricingLoading /> : error ? <PricingError message={error} onRetry={() => { setLoading(true); setRefreshKey((value) => value + 1); }} /> : (
        <>
          <section className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 lg:grid-cols-4">
            <PricingMetric label="Bảng giá đang áp dụng" value={current ? "1" : "0"} note={current?.name ?? "Chưa có bảng giá hiệu lực"} />
            <PricingMetric label="Bản nháp" value={drafts} note="Có thể chỉnh sửa" />
            <PricingMetric label="Đã ngừng" value={retired} note="Giữ lại lịch sử" />
            <PricingMetric label="Quy tắc giá hiện hành" value={current?.ruleCount ?? 0} note="Mục tiêu đủ 6 quy tắc" />
          </section>

          {current ? (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b bg-muted/25 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black">{current.name}</h2>
                    <PricingStatusBadge status={current.status} />
                    <span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">Phiên bản {current.revision}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Áp dụng từ {dateTime(current.effectiveFrom)} · hết hiệu lực {dateTime(current.effectiveTo)}</p>
                </div>
                <Link href="/pricing/rate-plans" className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3.5 text-xs font-bold transition hover:bg-muted">
                  Xem bảng giá <ArrowRightIcon className="size-4" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                <PricingMetric label="Phụ phí vùng xa / đầu" value={money(current.remoteEndpointSurcharge)} />
                <PricingMetric label="Phụ phí hải đảo" value={percent(current.islandTransportRate)} note="Tính trên phí vận chuyển" />
                <PricingMetric label="Quote hiệu lực" value={`${current.quoteTtlMinutes} phút`} />
                <PricingMetric label="Khối lượng đơn tối đa" value={`${current.maxShipmentChargeableWeightKg} kg`} />
              </div>
            </Card>
          ) : (
            <Card className="border-amber-500/25 bg-amber-500/[0.04] p-5">
              <h2 className="font-black">Chưa có bảng giá đang áp dụng</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Quote Engine sẽ không thể tính cước cho khách hàng cho tới khi một bảng giá đầy đủ được kích hoạt.</p>
            </Card>
          )}

          <section className="grid gap-3 lg:grid-cols-3">
            <Link href="/pricing/rate-plans" className="rounded-xl border bg-card p-4 transition hover:border-brand/35 hover:bg-brand/[0.02]">
              <ListChecksIcon className="size-5 text-brand" />
              <h3 className="mt-3 font-black">Bảng giá & phiên bản</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Tạo bản nháp, chỉnh chính sách, cấu hình 6 quy tắc và quản lý vòng đời bảng giá.</p>
            </Link>
            <Link href="/pricing/simulator" className="rounded-xl border bg-card p-4 transition hover:border-brand/35 hover:bg-brand/[0.02]">
              <CalculatorIcon className="size-5 text-brand" />
              <h3 className="mt-3 font-black">Mô phỏng tính cước</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Chọn địa chỉ thật, nhập kiện hàng và xem Standard/Express mà Quote Engine trả về.</p>
            </Link>
            <Link href="/pricing/audit" className="rounded-xl border bg-card p-4 transition hover:border-brand/35 hover:bg-brand/[0.02]">
              <HistoryIcon className="size-5 text-brand" />
              <h3 className="mt-3 font-black">Nhật ký thay đổi</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Theo dõi ai tạo, sửa, kích hoạt, ngừng hoặc xóa bảng giá và quy tắc.</p>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
