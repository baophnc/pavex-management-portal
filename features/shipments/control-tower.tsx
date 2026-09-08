"use client";

import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldAlertIcon,
  TruckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getAllHubs } from "@/features/network/api";
import type { Hub } from "@/features/network/contracts";
import {
  getShipmentControlTowerAlerts,
  getShipmentControlTowerSummary,
} from "@/features/shipments/api";
import {
  SHIPMENT_CONTROL_ALERT_SEVERITIES,
  SHIPMENT_CONTROL_ALERT_TYPES,
  type ShipmentControlAlertSeverity,
  type ShipmentControlAlertType,
  type ShipmentControlTowerAlert,
  type ShipmentControlTowerPage,
  type ShipmentControlTowerSummary,
} from "@/features/shipments/contracts";
import {
  shipmentControlAlertSeverityLabel,
  shipmentControlAlertTypeLabel,
} from "@/features/shipments/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 30;

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function severityClass(severity: ShipmentControlAlertSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "border-destructive/25 bg-destructive/10 text-destructive";
    case "WARNING":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "INFO":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-200";
  }
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

function AlertLink({
  alert,
  canOpenShipment,
  canOpenCase,
}: {
  alert: ShipmentControlTowerAlert;
  canOpenShipment: boolean;
  canOpenCase: boolean;
}) {
  if (alert.caseId && canOpenCase) {
    return (
      <Link
        href={`/shipments/cases/${encodeURIComponent(alert.caseId)}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-[0.68rem] font-black hover:bg-muted"
      >
        Mở case <ExternalLinkIcon className="size-3" />
      </Link>
    );
  }
  if (alert.trackingCode && canOpenShipment) {
    return (
      <Link
        href={`/shipments/${encodeURIComponent(alert.trackingCode)}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-[0.68rem] font-black hover:bg-muted"
      >
        Mở vận đơn <ExternalLinkIcon className="size-3" />
      </Link>
    );
  }
  return (
    <span className="text-[0.68rem] text-muted-foreground">
      Không có quyền mở chi tiết
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: ShipmentControlAlertSeverity;
}) {
  return (
    <Card className={cn(tone && severityClass(tone))}>
      <CardContent>
        <p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-black">{value?.toLocaleString("vi-VN") ?? "—"}</p>
      </CardContent>
    </Card>
  );
}

export function ShipmentControlTower() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission, hasAnyPermission } = useAccess();

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const type = (searchParams.get("type") ?? "") as ShipmentControlAlertType | "";
  const severity = (searchParams.get("severity") ?? "") as ShipmentControlAlertSeverity | "";
  const hubId = searchParams.get("hubId") ?? "";
  const search = searchParams.get("search") ?? "";

  const [searchDraft, setSearchDraft] = useState(search);
  const [hubDraft, setHubDraft] = useState(hubId);
  const [data, setData] = useState<ShipmentControlTowerPage | null>(null);
  const [summary, setSummary] = useState<ShipmentControlTowerSummary | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const globalScope = hasPermission("operations.assignments.manage");
  const hubScope = hasPermission("operations.hub.manage");
  const canReadNetwork = hasAnyPermission(["network.read", "network.manage"]);
  const canOpenShipments = hasPermission("shipments.admin.read");
  const canOpenCases = hasPermission("shipments.cases.manage");

  useEffect(() => {
    const task = window.setTimeout(() => setSearchDraft(search), 0);
    return () => window.clearTimeout(task);
  }, [search]);

  useEffect(() => {
    const task = window.setTimeout(() => setHubDraft(hubId), 0);
    return () => window.clearTimeout(task);
  }, [hubId]);

  useEffect(() => {
    if (!canReadNetwork) return;
    let cancelled = false;
    void getAllHubs()
      .then((items) => {
        if (!cancelled) setHubs(items.filter((item) => item.status === "ACTIVE"));
      })
      .catch(() => {
        if (!cancelled) setHubs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canReadNetwork]);

  const alertQuery = useMemo(() => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (type) query.set("type", type);
    if (severity) query.set("severity", severity);
    if (hubId) query.set("hubId", hubId);
    if (search) query.set("search", search);
    return query;
  }, [hubId, page, search, severity, type]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPage, nextSummary] = await Promise.all([
        getShipmentControlTowerAlerts(alertQuery),
        getShipmentControlTowerSummary(hubId || null),
      ]);
      setData(nextPage);
      setSummary(nextSummary);
    } catch (cause) {
      const text = message(cause, "Không thể tải Control Tower.");
      setError(text);
      toast.error(text);
    } finally {
      setLoading(false);
    }
  }, [alertQuery, hubId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const update = (values: Record<string, string | number>) => {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, raw]) => {
      const value = String(raw).trim();
      if (value) query.set(key, value);
      else query.delete(key);
    });
    if (!("page" in values)) query.set("page", "1");
    const serialized = query.toString();
    router.push(serialized ? `${pathname}?${serialized}` : pathname);
  };

  const hubName = (id: string) => {
    const hub = hubs.find((item) => item.id === id);
    return hub ? `${hub.code} · ${hub.name}` : shortId(id);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Shipment operations</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Control Tower</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Cảnh báo được backend tính trực tiếp từ trạng thái vận đơn, route SLA, exception/case và delivery proof. Đây là read-only operational view, không phải incident store độc lập.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} /> Làm mới
          </Button>
        </div>
      </section>

      <div className={cn(
        "flex gap-2 rounded-lg border p-3 text-xs leading-5",
        globalScope
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
          : "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200",
      )}>
        {globalScope ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" /> : <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />}
        <span>
          {globalScope
            ? "Global Operations scope: backend cho phép xem cảnh báo trên toàn mạng lưới."
            : hubScope
              ? "Hub-scoped Operations access: backend chỉ trả cảnh báo thuộc các hub membership đang hoạt động của bạn."
              : "JWT hiện không có Operations scope hợp lệ; backend sẽ từ chối Control Tower dù có permission đọc."}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng cảnh báo" value={summary?.total} />
        <SummaryCard label="Critical" value={summary?.critical} tone="CRITICAL" />
        <SummaryCard label="Warning" value={summary?.warning} tone="WARNING" />
        <SummaryCard label="Info" value={summary?.info} tone="INFO" />
      </div>

      {summary ? (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlertIcon className="size-4 text-brand" />
              <p className="text-sm font-black">Alert mix</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {SHIPMENT_CONTROL_ALERT_TYPES.map((alertType) => {
                const count = summary.byType[alertType] ?? 0;
                const selected = type === alertType;
                return (
                  <button
                    key={alertType}
                    type="button"
                    onClick={() => update({ type: selected ? "" : alertType })}
                    className={cn(
                      "rounded-lg border p-3 text-left transition hover:bg-muted/50",
                      selected && "border-brand/40 bg-brand/5",
                    )}
                  >
                    <p className="text-[0.62rem] font-black uppercase leading-4 text-muted-foreground">
                      {shipmentControlAlertTypeLabel(alertType)}
                    </p>
                    <p className="mt-2 text-xl font-black">{count}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3">
          <div className="grid gap-2 lg:grid-cols-[1fr_220px_220px_1fr_auto]">
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") update({ search: searchDraft });
              }}
              placeholder="Tracking, parcel, case, nội dung cảnh báo..."
            />
            <select
              value={type}
              onChange={(event) => update({ type: event.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Tất cả loại</option>
              {SHIPMENT_CONTROL_ALERT_TYPES.map((value) => (
                <option key={value} value={value}>{shipmentControlAlertTypeLabel(value)}</option>
              ))}
            </select>
            <select
              value={severity}
              onChange={(event) => update({ severity: event.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Mọi mức độ</option>
              {SHIPMENT_CONTROL_ALERT_SEVERITIES.map((value) => (
                <option key={value} value={value}>{shipmentControlAlertSeverityLabel(value)}</option>
              ))}
            </select>
            {canReadNetwork && hubs.length ? (
              <select
                value={hubDraft}
                onChange={(event) => setHubDraft(event.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Tất cả hub trong scope</option>
                {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}
              </select>
            ) : (
              <div className="flex h-10 items-center rounded-md border bg-muted/20 px-3 text-xs text-muted-foreground">Hub scope đang do backend giới hạn tự động.</div>
            )}
            <Button variant="outline" onClick={() => update({ search: searchDraft, hubId: hubDraft })}>
              <SearchIcon className="size-4" /> Lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {loading && !data ? (
          <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><LoaderCircleIcon className="size-4 animate-spin" /> Đang tải cảnh báo...</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b bg-muted/30 text-[0.65rem] uppercase text-muted-foreground">
                <tr>
                  {['Mức độ', 'Cảnh báo', 'Đối tượng', 'Hub', 'SLA / hoạt động', 'Drill-down'].map((header) => (
                    <th key={header} className="px-4 py-3">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((alert) => (
                  <tr key={alert.key} className="border-b align-top last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex rounded-full border px-2 py-1 text-[0.64rem] font-black", severityClass(alert.severity))}>
                        {shipmentControlAlertSeverityLabel(alert.severity)}
                      </span>
                      {alert.overdueMinutes != null ? (
                        <p className="mt-1.5 flex items-center gap-1 text-[0.64rem] font-bold text-muted-foreground">
                          <Clock3Icon className="size-3" /> trễ {alert.overdueMinutes.toLocaleString("vi-VN")} phút
                        </p>
                      ) : null}
                    </td>
                    <td className="max-w-[410px] px-4 py-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.06em] text-brand">{shipmentControlAlertTypeLabel(alert.type)}</p>
                      <p className="mt-1 text-xs font-black">{alert.title}</p>
                      <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">{alert.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      {alert.trackingCode ? (
                        <p className="flex items-center gap-1 text-xs font-black"><TruckIcon className="size-3.5 text-brand" /> {alert.trackingCode}</p>
                      ) : null}
                      {alert.parcelCode ? <p className="mt-1 font-mono text-[0.66rem] text-muted-foreground">Parcel {alert.parcelCode}</p> : null}
                      {alert.caseNumber ? <p className="mt-1 text-[0.68rem] font-bold">Case {alert.caseNumber}</p> : null}
                      {!alert.trackingCode && !alert.caseNumber ? <span className="text-xs text-muted-foreground">—</span> : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold">{hubName(alert.hubId)}</p>
                      <p className="mt-1 font-mono text-[0.62rem] text-muted-foreground">{shortId(alert.hubId)}</p>
                      {alert.routeLegId ? <p className="mt-1 font-mono text-[0.62rem] text-muted-foreground">leg {shortId(alert.routeLegId)}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-[0.68rem] leading-5 text-muted-foreground">
                      <p>Phát hiện: {formatDateTime(alert.detectedAt)}</p>
                      <p>Due: {alert.dueAt ? formatDateTime(alert.dueAt) : "—"}</p>
                      <p>Hoạt động cuối: {alert.lastActivityAt ? formatDateTime(alert.lastActivityAt) : "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <AlertLink alert={alert} canOpenShipment={canOpenShipments} canOpenCase={canOpenCases} />
                    </td>
                  </tr>
                ))}
                {!loading && data?.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <CheckCircle2Icon className="mx-auto size-8 text-emerald-600" />
                      <p className="mt-3 text-sm font-black">Không có cảnh báo phù hợp</p>
                      <p className="mt-1 text-xs text-muted-foreground">Scope/filter hiện tại không có anomaly đang được Control Tower phát hiện.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {data.totalCount.toLocaleString("vi-VN")} cảnh báo · trang {data.page}/{Math.max(1, data.totalPages)}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => update({ page: page - 1 })}>
              <ChevronLeftIcon className="size-4" /> Trước
            </Button>
            <Button size="sm" variant="outline" disabled={page >= data.totalPages || loading} onClick={() => update({ page: page + 1 })}>
              Sau <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs leading-5 text-sky-800 dark:text-sky-200">
        <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
        Backend Control Tower derive alert trực tiếp từ live state. Vì chưa có persisted alert lifecycle nên Management không hiển thị acknowledge/owner/escalation giả.
      </div>
    </div>
  );
}
