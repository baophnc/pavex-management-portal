"use client";

import {
  ArrowRightIcon,
  BoxIcon,
  FilterIcon,
  RefreshCwIcon,
  SearchIcon,
  TruckIcon,
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminShipments } from "@/features/shipments/api";
import type {
  AdminShipmentSummary,
  ShipmentLifecycleStatus,
  ShipmentStatus,
} from "@/features/shipments/contracts";
import {
  SHIPMENT_LIFECYCLE_STATUSES,
  SHIPMENT_STATUSES,
} from "@/features/shipments/contracts";
import {
  lifecycleLabel,
  money,
  serviceLevelLabel,
  shipmentErrorMessage,
  shipmentStatusLabel,
} from "@/features/shipments/presentation";
import { formatDateTime } from "@/lib/utils";

const selectClassName =
  "h-9 rounded-md border bg-background px-3 text-xs font-bold outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const critical = status === "DELIVERY_FAILED";
  const done = status === "DELIVERED" || status === "RETURNED";
  return (
    <span
      className={
        critical
          ? "rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[0.62rem] font-black text-destructive"
          : done
            ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[0.62rem] font-black text-emerald-700 dark:text-emerald-300"
            : "rounded-full border bg-muted/45 px-2 py-1 text-[0.62rem] font-black"
      }
    >
      {shipmentStatusLabel(status)}
    </span>
  );
}

export function AdminShipments({
  initialQuery = "",
  initialStatus = "",
  initialLifecycleStatus = "",
}: {
  initialQuery?: string;
  initialStatus?: ShipmentStatus | "";
  initialLifecycleStatus?: ShipmentLifecycleStatus | "";
}) {
  const [items, setItems] = useState<AdminShipmentSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<ShipmentStatus | "">(initialStatus);
  const [lifecycleStatus, setLifecycleStatus] =
    useState<ShipmentLifecycleStatus | "">(initialLifecycleStatus);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeParams = useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams({ limit: "25" });
      if (query.trim()) params.set("q", query.trim());
      if (status) params.set("status", status);
      if (lifecycleStatus) params.set("lifecycleStatus", lifecycleStatus);
      if (cursor) params.set("cursor", cursor);
      return params;
    },
    [lifecycleStatus, query, status],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminShipments(makeParams());
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setTotalCount(result.totalCount);
    } catch (reason) {
      setItems([]);
      setNextCursor(null);
      setTotalCount(0);
      setError(shipmentErrorMessage(reason, "Không thể tải danh sách vận đơn."));
    } finally {
      setLoading(false);
    }
  }, [makeParams]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load();
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const result = await getAdminShipments(makeParams(nextCursor));
      setItems((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
      setTotalCount(result.totalCount);
    } catch (reason) {
      setError(shipmentErrorMessage(reason, "Không thể tải thêm vận đơn."));
    } finally {
      setLoadingMore(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
    setLifecycleStatus("");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[0.62rem] font-black tracking-[0.14em] text-brand uppercase">
              Vận hành vận đơn
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Vận đơn toàn hệ thống
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
              Tra cứu trạng thái, hành trình, cước phí và lịch sử xử lý vận đơn trên toàn hệ thống Pavex.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/25 px-4 py-3">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
              Tổng theo bộ lọc
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums">
              {totalCount.toLocaleString("vi-VN")}
            </p>
          </div>
        </div>
      </section>

      <Card className="p-4">
        <form
          onSubmit={submit}
          className="grid gap-3 xl:grid-cols-[minmax(18rem,1fr)_13rem_13rem_auto]"
        >
          <label className="grid gap-1.5 text-xs font-bold">
            Tìm vận đơn
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Mã vận đơn / mã tham chiếu đối tác"
                className="pl-9"
                maxLength={120}
              />
            </div>
          </label>
          <label className="grid gap-1.5 text-xs font-bold">
            Trạng thái
            <select
              className={selectClassName}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ShipmentStatus | "")
              }
            >
              <option value="">Tất cả trạng thái</option>
              {SHIPMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {shipmentStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold">
            Vòng đời
            <select
              className={selectClassName}
              value={lifecycleStatus}
              onChange={(event) =>
                setLifecycleStatus(
                  event.target.value as ShipmentLifecycleStatus | "",
                )
              }
            >
              <option value="">Tất cả vòng đời</option>
              {SHIPMENT_LIFECYCLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {lifecycleLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>
              <FilterIcon className="size-3.5" />
              Lọc
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={loading}
            >
              Xóa lọc
            </Button>
          </div>
        </form>
      </Card>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="font-bold text-destructive">{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCwIcon className="size-3.5" /> Thử lại
          </Button>
        </div>
      ) : null}

      {loading ? (
        <Card className="grid min-h-72 place-items-center p-6 text-xs font-bold text-muted-foreground">
          <span className="flex items-center gap-2">
            <RefreshCwIcon className="size-4 animate-spin" /> Đang tải vận đơn...
          </span>
        </Card>
      ) : items.length === 0 ? (
        <Card className="grid min-h-72 place-items-center p-6 text-center">
          <div>
            <BoxIcon className="mx-auto size-9 text-muted-foreground" />
            <p className="mt-3 text-sm font-black">Không có vận đơn phù hợp</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Thử thay đổi từ khóa hoặc bộ lọc.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-xs">
              <thead className="bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Vận đơn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Hành trình</th>
                  <th className="px-4 py-3">Điểm nhận</th>
                  <th className="px-4 py-3">Cước / Thu hộ</th>
                  <th className="px-4 py-3">Tạo lúc</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="align-top transition hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/shipments/${encodeURIComponent(shipment.trackingCode)}`}
                        className="font-mono text-xs font-black text-brand hover:underline"
                      >
                        {shipment.trackingCode}
                      </Link>
                      <p className="mt-1 max-w-52 truncate text-[0.66rem] text-muted-foreground">
                        {shipment.merchantReference
                          ? `Tham chiếu: ${shipment.merchantReference}`
                          : "Không có mã tham chiếu"}
                      </p>
                      <p className="mt-1 text-[0.62rem] font-bold text-muted-foreground">
                        {serviceLevelLabel(shipment.serviceLevel)} · {shipment.parcelCount} kiện
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={shipment.status} />
                      <p className="mt-2 text-[0.64rem] font-bold text-muted-foreground">
                        {lifecycleLabel(shipment.lifecycleStatus)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-bold">
                        <TruckIcon className="size-3.5 text-brand" />
                        {shipment.originHubName} → {shipment.destinationHubName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{shipment.destinationProvinceName}</p>
                      <p className="mt-1 text-[0.64rem] text-muted-foreground">
                        {shipment.destinationWardName}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <p className="font-black">{money(shipment.shippingFee)}</p>
                      <p className="mt-1 text-[0.64rem] text-muted-foreground">
                        Thu hộ {money(shipment.codAmount)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[0.68rem] font-bold">
                      {formatDateTime(shipment.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/shipments/${encodeURIComponent(shipment.trackingCode)}`}
                        className="inline-flex items-center gap-1 text-[0.68rem] font-black text-brand hover:underline"
                      >
                        Chi tiết <ArrowRightIcon className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-2 border-t bg-muted/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.66rem] font-bold text-muted-foreground">
              Đã tải {items.length.toLocaleString("vi-VN")} / {totalCount.toLocaleString("vi-VN")} vận đơn
            </p>
            {nextCursor ? (
              <Button
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? (
                  <RefreshCwIcon className="size-3.5 animate-spin" />
                ) : null}
                Tải thêm
              </Button>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
