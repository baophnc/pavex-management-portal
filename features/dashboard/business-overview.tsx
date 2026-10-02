"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { BarList, ChartTable, ColumnChart, compact, Legend, LineChart } from "@/features/dashboard/charts";
import { HubSelect, useHubScope } from "@/features/directory/hub-scope";
import { useHubDirectory } from "@/features/directory/names";
import { useAccess } from "@/features/auth/access-context";
import { money } from "@/features/pricing/ui";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type DayStats = { date: string; created: number; bookedFees: number; delivered: number; failed: number; cancelled: number; returned: number };
type HubStats = { hubId: string; created: number; bookedFees: number; delivered: number; failed: number };
type Stats = { from: string; to: string; days: DayStats[]; hubs: HubStats[] };
type Outstanding = { heldByCouriers: number; atHubs: number; waitingApproval: number; collections: number };

const RANGES = [
  { days: 7, label: "7 ngày" },
  { days: 30, label: "30 ngày" },
  { days: 90, label: "90 ngày" },
];

function vietnamDay(offset = 0) {
  const date = new Date(Date.now() + offset * 86_400_000);
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;

function rate(delivered: number, failed: number) {
  const total = delivered + failed;
  return total ? Math.round((delivered / total) * 100) : null;
}

/**
 * How the business is going, for managers: fees booked per day, deliveries against failures, cash
 * not yet approved and, for head office, how the hubs compare. One date range and one hub filter
 * scope everything below them.
 */
export function BusinessOverview() {
  const { hasAnyPermission, hasPermission } = useAccess();
  // Figures for the people who run hubs or the company, not for every staff member.
  const canSeeShipments = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]) &&
    hasAnyPermission(["scope.all-hubs", "operations.hub.manage"]);
  const canSeeCash = hasPermission("billing.cash.approve");
  const scope = useHubScope();
  const directory = useHubDirectory();
  const [days, setDays] = useState(30);
  const [hubId, setHubId] = useState<string | null>(null);
  const activeHub = hubId ?? scope.initialHubId;
  const [stats, setStats] = useState<Stats | null>(null);
  const [cash, setCash] = useState<Outstanding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canSeeShipments || scope.loading) return;
    let active = true;
    const query = new URLSearchParams({ from: vietnamDay(-(days - 1)), to: vietnamDay() });
    if (activeHub) query.set("hubId", activeHub);
    const cashQuery = activeHub ? `?hubId=${activeHub}` : "";
    Promise.all([
      apiRequest<Stats>(`admin/shipments/stats?${query}`),
      canSeeCash && (scope.allHubs || activeHub)
        ? apiRequest<Outstanding>(`admin/billing/cash/outstanding${cashQuery}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([nextStats, nextCash]) => {
        if (!active) return;
        setStats(nextStats);
        setCash(nextCash);
      })
      .catch(() => { if (active) setStats(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeHub, canSeeCash, canSeeShipments, days, scope.allHubs, scope.loading]);

  const totals = useMemo(() => {
    const list = stats?.days ?? [];
    const sum = (pick: (day: DayStats) => number) => list.reduce((total, day) => total + pick(day), 0);
    return { fees: sum((day) => day.bookedFees), created: sum((day) => day.created), delivered: sum((day) => day.delivered), failed: sum((day) => day.failed), returned: sum((day) => day.returned) };
  }, [stats]);

  if (!canSeeShipments) return null;

  const labels = (stats?.days ?? []).map((day) => shortDate(day.date));
  const success = rate(totals.delivered, totals.failed);
  const hubName = (id: string) => {
    const hub = directory.get(id);
    return hub ? `${hub.code} · ${hub.name}` : "Bưu cục";
  };
  const deliveredSeries = { name: "Giao thành công", color: "var(--viz-1)", values: (stats?.days ?? []).map((day) => day.delivered) };
  const failedSeries = { name: "Giao không được", color: "var(--viz-2)", values: (stats?.days ?? []).map((day) => day.failed) };

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-black">Tình hình kinh doanh</h2>
        <div className="flex overflow-hidden rounded-md border" role="group" aria-label="Khoảng thời gian">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => { setLoading(true); setDays(range.days); }}
              className={cn("h-8 px-3 text-xs font-bold", days === range.days ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {range.label}
            </button>
          ))}
        </div>
        <HubSelect scope={scope} value={activeHub} allLabel="Tất cả bưu cục" className="h-8 w-auto min-w-56 text-xs" onChange={(next) => { setLoading(true); setHubId(next); }} />
      </div>

      <div className={cn("grid gap-3 transition-opacity", loading && stats && "opacity-60")}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Tile label={`Cước phát sinh ${days} ngày`} value={stats ? money(totals.fees) : "…"} note={stats ? `${totals.created.toLocaleString("vi-VN")} đơn · trung bình ${money(Math.round(totals.fees / Math.max(1, days)))}/ngày` : ""} />
          <Tile label="Tỉ lệ giao thành công" value={success === null ? "—" : `${success}%`} note={`${totals.delivered.toLocaleString("vi-VN")} đơn giao xong · ${totals.failed.toLocaleString("vi-VN")} đơn giao không được`} />
          <Tile label="Đơn hoàn về" value={stats ? totals.returned.toLocaleString("vi-VN") : "…"} note="Đã trả lại người gửi trong khoảng này" />
          {cash ? (
            <Tile
              label="Tiền thu hộ chưa duyệt"
              value={money(cash.heldByCouriers + cash.atHubs + cash.waitingApproval)}
              note={`Bưu tá đang giữ ${money(cash.heldByCouriers)} · chờ duyệt ${money(cash.waitingApproval)}`}
              href="/finance/cash"
            />
          ) : null}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <Card className="p-4">
            <p className="text-sm font-black">Cước phát sinh theo ngày</p>
            <p className="text-xs text-muted-foreground">Tổng cước của các đơn được tạo mỗi ngày, tính ở bưu cục gửi.</p>
            <div className="mt-3">
              <ColumnChart name="Cước phát sinh" format={money} data={(stats?.days ?? []).map((day) => ({ key: day.date, label: shortDate(day.date), value: day.bookedFees }))} />
            </div>
            <ChartTable headers={["Ngày", "Số đơn", "Cước"]} rows={(stats?.days ?? []).map((day) => [shortDate(day.date), day.created, money(day.bookedFees)])} />
          </Card>
          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black">Giao hàng theo ngày</p>
                <p className="text-xs text-muted-foreground">Số đơn giao xong và số đơn có lần giao không được, tính ở bưu cục giao.</p>
              </div>
              <Legend items={[deliveredSeries, failedSeries]} />
            </div>
            <div className="mt-3">
              <LineChart labels={labels} series={[deliveredSeries, failedSeries]} format={(value) => `${value.toLocaleString("vi-VN")} đơn`} />
            </div>
            <ChartTable
              headers={["Ngày", "Giao thành công", "Giao không được", "Tỉ lệ"]}
              rows={(stats?.days ?? []).map((day) => [shortDate(day.date), day.delivered, day.failed, rate(day.delivered, day.failed) === null ? "—" : `${rate(day.delivered, day.failed)}%`])}
            />
          </Card>
        </div>

        {stats && stats.hubs.length > 1 ? (
          <Card className="p-4">
            <p className="text-sm font-black">So sánh các bưu cục</p>
            <p className="mb-3 text-xs text-muted-foreground">Cước phát sinh trong {days} ngày, kèm tỉ lệ giao thành công của từng bưu cục.</p>
            <BarList
              format={compact}
              rows={stats.hubs.map((hub) => {
                const hubRate = rate(hub.delivered, hub.failed);
                return { key: hub.hubId, label: hubName(hub.hubId), value: hub.bookedFees, note: `${hub.created} đơn${hubRate === null ? "" : ` · giao thành công ${hubRate}%`}` };
              })}
            />
            <ChartTable
              headers={["Bưu cục", "Đơn tạo", "Cước", "Giao xong", "Giao không được", "Tỉ lệ"]}
              rows={stats.hubs.map((hub) => [hubName(hub.hubId), hub.created, money(hub.bookedFees), hub.delivered, hub.failed, rate(hub.delivered, hub.failed) === null ? "—" : `${rate(hub.delivered, hub.failed)}%`])}
            />
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function Tile({ label, value, note, href }: { label: string; value: string; note: string; href?: string }) {
  const body = (
    <Card className={cn("h-full p-4", href && "transition hover:border-brand/40")}>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-[0.7rem] text-muted-foreground">{note}</p>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
