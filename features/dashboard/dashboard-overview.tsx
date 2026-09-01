"use client";

import {
  ActivityIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CircleDollarSignIcon,
  CircleGaugeIcon,
  CircleUserRoundIcon,
  ClipboardListIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import {
  canAccessControlTower,
  canAccessOperations,
  canAccessOperationsAssignments,
  canAccessOperationsWorkforce,
  canAccessShipmentCases,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/access";
import { apiRequest } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/auth/contracts";

type MetricKey =
  | "users"
  | "pendingMerchants"
  | "activeShipments"
  | "deliveryFailed"
  | "activeWorkforce"
  | "pendingAssignments"
  | "highRiskCases"
  | "criticalAlerts"
  | "deadLetters";

type Metric = {
  key: MetricKey;
  label: string;
  href: string;
  hint: string;
  icon: typeof UsersRoundIcon;
  canAccess: (user: CurrentUser | null) => boolean;
  load: () => Promise<number | null>;
};

type Capability = {
  label: string;
  description: string;
  href: string;
  icon: typeof UsersRoundIcon;
  canAccess: (user: CurrentUser | null) => boolean;
};

function record(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function numberField(value: unknown, field: string) {
  const candidate = record(value)?.[field];
  return typeof candidate === "number" ? candidate : null;
}

function countPayload(value: unknown) {
  if (Array.isArray(value)) return value.length;
  return numberField(value, "totalCount") ?? numberField(value, "totalElements");
}

async function loadCount(path: string) {
  return countPayload(await apiRequest(path));
}

async function loadField(path: string, field: string) {
  return numberField(await apiRequest(path), field);
}

async function loadPendingAssignments() {
  const [pending, rejected] = await Promise.all([
    apiRequest<unknown[]>("admin/operations/assignments?status=PENDING"),
    apiRequest<unknown[]>("admin/operations/assignments?status=REJECTED"),
  ]);
  return pending.length + rejected.length;
}

const metrics: Metric[] = [
  {
    key: "users",
    label: "Tài khoản Identity",
    href: "/identity/users",
    hint: "Người dùng trong phạm vi quản trị",
    icon: UsersRoundIcon,
    canAccess: (user) => hasPermission(user, "identity.users.read"),
    load: () => loadCount("users?page=1&pageSize=1"),
  },
  {
    key: "pendingMerchants",
    label: "Merchant chờ duyệt",
    href: "/partners/merchants?status=PENDING_VERIFICATION",
    hint: "Hồ sơ cần xét duyệt",
    icon: Building2Icon,
    canAccess: (user) => hasPermission(user, "partners.merchants.read"),
    load: () =>
      loadCount("admin/merchants?page=1&pageSize=1&status=PENDING_VERIFICATION"),
  },
  {
    key: "activeShipments",
    label: "Vận đơn đang hoạt động",
    href: "/shipments?lifecycleStatus=ACTIVE",
    hint: "Shipment lifecycle ACTIVE",
    icon: TruckIcon,
    canAccess: (user) => hasPermission(user, "shipments.admin.read"),
    load: () => loadCount("admin/shipments?limit=1&lifecycleStatus=ACTIVE"),
  },
  {
    key: "deliveryFailed",
    label: "Giao thất bại",
    href: "/shipments?status=DELIVERY_FAILED",
    hint: "Ưu tiên xử lý ngoại lệ giao",
    icon: ShieldAlertIcon,
    canAccess: (user) => hasPermission(user, "shipments.admin.read"),
    load: () => loadCount("admin/shipments?limit=1&status=DELIVERY_FAILED"),
  },
  {
    key: "activeWorkforce",
    label: "Workforce active",
    href: "/operations/workforce?status=ACTIVE",
    hint: "Theo scope global hoặc hub backend cấp",
    icon: UsersRoundIcon,
    canAccess: canAccessOperationsWorkforce,
    load: () =>
      loadCount("admin/operations/workforce?page=1&pageSize=1&status=ACTIVE"),
  },
  {
    key: "pendingAssignments",
    label: "Assignment chờ điều phối",
    href: "/operations/assignments?status=PENDING",
    hint: "PENDING + REJECTED cần redispatch",
    icon: ClipboardListIcon,
    canAccess: canAccessOperationsAssignments,
    load: loadPendingAssignments,
  },
  {
    key: "highRiskCases",
    label: "Case High / Critical",
    href: "/shipments/cases",
    hint: "Case active cần ưu tiên điều tra",
    icon: ShieldAlertIcon,
    canAccess: canAccessShipmentCases,
    load: () => loadField("admin/shipment-cases/summary", "highOrCritical"),
  },
  {
    key: "criticalAlerts",
    label: "Control Tower critical",
    href: "/control-tower?severity=CRITICAL",
    hint: "Alert operational mức CRITICAL",
    icon: ActivityIcon,
    canAccess: canAccessControlTower,
    load: () => loadField("admin/shipments/control-tower/summary", "critical"),
  },
  {
    key: "deadLetters",
    label: "Outbox dead-letter",
    href: "/operations/dispatch",
    hint: "Integration event cần retry/discard",
    icon: ShieldAlertIcon,
    canAccess: (user) => hasPermission(user, "operations.assignments.manage"),
    load: () => loadField("admin/operations/outbox/summary", "deadLetteredCount"),
  },
];

const capabilities: Capability[] = [
  {
    label: "Identity & Access",
    description: "Users, role catalog và permission matrix.",
    href: "/identity/users",
    icon: ShieldCheckIcon,
    canAccess: (user) =>
      hasAnyPermission(user, ["identity.users.read", "identity.roles.read"]),
  },
  {
    label: "Partners",
    description: "Merchant verification và trạng thái đối tác.",
    href: "/partners/merchants",
    icon: Building2Icon,
    canAccess: (user) => hasPermission(user, "partners.merchants.read"),
  },
  {
    label: "Network",
    description: "Hub, coverage, route, capacity và audit.",
    href: "/network",
    icon: CircleGaugeIcon,
    canAccess: (user) => hasAnyPermission(user, ["network.read", "network.manage"]),
  },
  {
    label: "Pricing",
    description: "Rate plan, quote inspection và pricing audit.",
    href: "/pricing",
    icon: CircleDollarSignIcon,
    canAccess: (user) => hasAnyPermission(user, ["pricing.read", "pricing.manage"]),
  },
  {
    label: "Operations",
    description: "Workforce, shifts, assignments và dispatch reliability.",
    href: "/operations",
    icon: ClipboardListIcon,
    canAccess: canAccessOperations,
  },
  {
    label: "Shipment",
    description: "Vận đơn, delivery, exception và weight review.",
    href: "/shipments",
    icon: TruckIcon,
    canAccess: (user) => hasPermission(user, "shipments.admin.read"),
  },
  {
    label: "Shipment Cases",
    description: "Problem parcel và unidentified parcel investigation.",
    href: "/shipments/cases",
    icon: ShieldAlertIcon,
    canAccess: canAccessShipmentCases,
  },
  {
    label: "Control Tower",
    description: "SLA, route deviation, stuck shipment và proof anomaly.",
    href: "/control-tower",
    icon: ActivityIcon,
    canAccess: canAccessControlTower,
  },
];

function MetricSkeleton() {
  return (
    <span
      className="inline-block h-9 w-16 animate-pulse rounded-lg bg-muted"
      aria-label="Đang tải"
    />
  );
}

export function DashboardOverview() {
  const { user } = useAccess();
  const [values, setValues] = useState<Partial<Record<MetricKey, number | null>>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<MetricKey[]>([]);

  const visibleMetrics: Metric[] = useMemo(
    () => metrics.filter((metric: Metric) => metric.canAccess(user)),
    [user],
  );
  const visibleCapabilities: Capability[] = useMemo(
    () => capabilities.filter((item: Capability) => item.canAccess(user)),
    [user],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const next: Partial<Record<MetricKey, number | null>> = {};
    const failures: MetricKey[] = [];

    await Promise.all(
      visibleMetrics.map(async (metric: Metric) => {
        try {
          next[metric.key] = await metric.load();
        } catch {
          next[metric.key] = null;
          failures.push(metric.key);
        }
      }),
    );

    setValues(next);
    setFailed(failures);
    setLoading(false);
  }, [visibleMetrics]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const priority = (() => {
    if (loading) {
      return {
        text: "Đang tải tín hiệu ưu tiên từ các backend bạn được phép xem.",
        href: null as string | null,
        label: null as string | null,
      };
    }

    const candidates: Array<[MetricKey, string, string, string]> = [
      ["criticalAlerts", "Control Tower", "/control-tower?severity=CRITICAL", "cảnh báo critical"],
      ["deadLetters", "Dispatch & outbox", "/operations/dispatch", "dead-letter integration"],
      ["deliveryFailed", "Vận đơn giao thất bại", "/shipments?status=DELIVERY_FAILED", "vận đơn giao thất bại"],
      ["pendingAssignments", "Assignment chờ điều phối", "/operations/assignments?status=PENDING", "assignment cần điều phối/redispatch"],
      ["highRiskCases", "Shipment cases", "/shipments/cases", "case High/Critical"],
      ["pendingMerchants", "Merchant chờ duyệt", "/partners/merchants?status=PENDING_VERIFICATION", "merchant chờ xét duyệt"],
    ];

    for (const [key, label, href, noun] of candidates) {
      const value = values[key];
      if (typeof value === "number" && value > 0) {
        return {
          text: `Có ${value.toLocaleString("vi-VN")} ${noun} cần chú ý.`,
          href,
          label,
        };
      }
    }

    if (failed.length > 0) {
      return {
        text: "Một số chỉ số chưa tải được; các workspace còn lại vẫn hoạt động độc lập.",
        href: null,
        label: null,
      };
    }

    return {
      text: "Không có tín hiệu ưu tiên từ các module bạn được phép xem.",
      href: null,
      label: null,
    };
  })();

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.14em] text-brand uppercase">
                Pavex Management Portal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[0.6rem] font-bold text-muted-foreground">
                <ShieldCheckIcon className="size-3 text-emerald-600" />
                Backend authorization là source of truth
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
              Điều hành luồng logistics Pavex từ một workspace theo capability.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Identity, Partners, Network, Pricing, Operations và Shipment đã nối API quản trị thật. Dashboard chỉ gọi endpoint mà JWT hiện tại được phép sử dụng và không suy diễn quyền từ role ở frontend.
            </p>
          </div>

          <div className="rounded-2xl border bg-background/75 p-4 shadow-sm backdrop-blur">
            <p className="text-[0.62rem] font-black tracking-[0.14em] text-muted-foreground uppercase">
              Ưu tiên hiện tại
            </p>
            <p className="mt-2 text-sm font-black leading-5">{priority.text}</p>
            {priority.href ? (
              <Link href={priority.href} className="mt-4 inline-flex items-center gap-1 text-xs font-black text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35">
                Mở {priority.label}
                <ArrowUpRightIcon className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.62rem] font-black tracking-[0.14em] text-brand uppercase">Live backend snapshot</p>
          <h2 className="mt-1 text-xl font-black">Xin chào, {user?.displayName ?? user?.email ?? "Pavex operator"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {visibleCapabilities.length} workspace khả dụng · {visibleMetrics.length} chỉ số được phép tải với JWT hiện tại.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} className="self-start sm:self-auto">
          <RefreshCwIcon className={loading ? "animate-spin" : ""} />
          Làm mới dữ liệu
        </Button>
      </div>

      {failed.length > 0 && !loading ? (
        <div role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-200">
          Có {failed.length} chỉ số chưa tải được. Dashboard không chặn truy cập các workspace đã được cấp quyền.
        </div>
      ) : null}

      {visibleMetrics.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" aria-label="Chỉ số quản trị">
          {visibleMetrics.map((metric: Metric) => {
            const Icon = metric.icon;
            const value = values[metric.key];
            const metricFailed = failed.includes(metric.key);
            return (
              <Link key={metric.key} href={metric.href} className="group rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 motion-reduce:transform-none">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand"><Icon className="size-4" /></span>
                  <ArrowUpRightIcon className="size-3.5 text-muted-foreground/55" />
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground">{metric.label}</p>
                <div className="mt-1 min-h-10 text-3xl font-black tracking-tight tabular-nums">
                  {loading ? <MetricSkeleton /> : !metricFailed && typeof value === "number" ? value.toLocaleString("vi-VN") : "—"}
                </div>
                <p className="mt-2 text-[0.65rem] font-bold leading-4 text-muted-foreground">
                  {metricFailed ? "Không đọc được dữ liệu lúc này" : metric.hint}
                </p>
              </Link>
            );
          })}
        </section>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-[1.45fr_0.75fr]">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <p className="text-sm font-black">Workspace theo capability</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Chỉ hiện module mà permission hiện tại thực sự cho phép mở.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibleCapabilities.map((item: Capability) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group rounded-xl border bg-background p-3 transition hover:border-brand/30 hover:bg-muted/35">
                  <div className="flex items-center justify-between gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></span>
                    <ArrowUpRightIcon className="size-3.5 text-muted-foreground/55" />
                  </div>
                  <p className="mt-3 text-xs font-black">{item.label}</p>
                  <p className="mt-1 text-[0.66rem] leading-4 text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <p className="text-sm font-black">Integration guardrails</p>
          </CardHeader>
          <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
            <p><span className="font-black text-foreground">RBAC:</span> route guard, sidebar và dashboard dùng chung capability helpers.</p>
            <p><span className="font-black text-foreground">Scope:</span> Operations hub scope và Control Tower scope vẫn do backend quyết định.</p>
            <p><span className="font-black text-foreground">Reliability:</span> outbox/dead-letter chỉ hiện cho global assignment manager.</p>
            <p><span className="font-black text-foreground">Alerts:</span> Control Tower là computed read-only view; Management không tạo lifecycle giả.</p>
            <Link href="/account" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-black text-foreground hover:bg-muted">
              <CircleUserRoundIcon className="size-4 text-brand" /> Tài khoản của tôi
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
