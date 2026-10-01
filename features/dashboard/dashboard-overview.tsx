"use client";

import { ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { visibleModules } from "@/components/layout/navigation";
import { ToolbarButton } from "@/components/workspace/filters";
import { Panel, StatGrid, StatTile } from "@/components/workspace/panel";
import { useAccess } from "@/features/auth/access-context";
import { getMyHubScope } from "@/features/operations/hub-scope";
import {
  canAccessControlTower,
  canAccessOperationsAssignments,
  canAccessOperationsWorkforce,
  canAccessShipmentCases,
  canAccessShipmentExceptionQueue,
  canAccessShipmentList,
  canAccessSupportRequests,
  hasPermission,
  seesAllHubs,
} from "@/lib/auth/access";
import { apiRequest } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/auth/contracts";

type Metric = {
  key: string;
  label: string;
  hint: string;
  href: string;
  /** Counts that need someone to act, listed under "Cần xử lý" when above zero. */
  attention?: string;
  canAccess: (user: CurrentUser | null) => boolean;
  load: () => Promise<number | null>;
};

type Section = { title: string; metrics: Metric[] };

function numberField(value: unknown, field: string) {
  const candidate = typeof value === "object" && value !== null ? (value as Record<string, unknown>)[field] : null;
  return typeof candidate === "number" ? candidate : null;
}

function countPayload(value: unknown) {
  if (Array.isArray(value)) return value.length;
  return numberField(value, "totalCount") ?? numberField(value, "totalElements");
}

const loadCount = async (path: string) => countPayload(await apiRequest(path));
const loadField = async (path: string, field: string) => numberField(await apiRequest(path), field);
const shipmentCount = (query: string) => () => loadCount(`admin/shipments?limit=1&${query}`);

async function loadWaitingAssignments() {
  const [pending, rejected] = await Promise.all([
    apiRequest<unknown[]>("admin/operations/assignments?status=PENDING"),
    apiRequest<unknown[]>("admin/operations/assignments?status=REJECTED"),
  ]);
  return pending.length + rejected.length;
}

const sections: Section[] = [
  {
    title: "Vận đơn",
    metrics: [
      { key: "active", label: "Đang hoạt động", hint: "Vận đơn chưa kết thúc", href: "/shipments?lifecycleStatus=ACTIVE", canAccess: canAccessShipmentList, load: shipmentCount("lifecycleStatus=ACTIVE") },
      { key: "awaitingPickup", label: "Chờ lấy hàng", hint: "Bưu tá chưa lấy", href: "/shipments?status=AWAITING_PICKUP", canAccess: canAccessShipmentList, load: shipmentCount("status=AWAITING_PICKUP") },
      { key: "inTransit", label: "Đang trung chuyển", hint: "Đang trên xe giữa các kho", href: "/shipments?status=IN_TRANSIT", canAccess: canAccessShipmentList, load: shipmentCount("status=IN_TRANSIT") },
      { key: "outForDelivery", label: "Đang giao", hint: "Bưu tá đang đi giao", href: "/shipments?status=OUT_FOR_DELIVERY", canAccess: canAccessShipmentList, load: shipmentCount("status=OUT_FOR_DELIVERY") },
      { key: "deliveryFailed", label: "Giao thất bại", hint: "Cần hẹn giao lại hoặc hoàn", href: "/shipments?status=DELIVERY_FAILED", attention: "vận đơn giao thất bại", canAccess: canAccessShipmentList, load: shipmentCount("status=DELIVERY_FAILED") },
      { key: "delivered", label: "Đã giao", hint: "Giao thành công", href: "/shipments?status=DELIVERED", canAccess: canAccessShipmentList, load: shipmentCount("status=DELIVERED") },
      { key: "returning", label: "Đang hoàn", hint: "Đang trả về người gửi", href: "/shipments?status=RETURNING", canAccess: canAccessShipmentList, load: shipmentCount("status=RETURNING") },
      { key: "cancelled", label: "Đã huỷ", hint: "Huỷ trước hoặc sau khi lấy hàng", href: "/shipments?status=CANCELLED", canAccess: canAccessShipmentList, load: shipmentCount("status=CANCELLED") },
    ],
  },
  {
    title: "Điều phối và sự cố",
    metrics: [
      { key: "waitingAssignments", label: "Việc chờ điều phối", hint: "Chưa có người nhận hoặc bị từ chối", href: "/operations/assignments?status=PENDING", attention: "việc chờ điều phối", canAccess: canAccessOperationsAssignments, load: loadWaitingAssignments },
      { key: "exceptions", label: "Ngoại lệ chờ duyệt", hint: "Huỷ, hoàn, chuyển tiếp chờ cấp duyệt", href: "/shipments/exceptions?status=PENDING_APPROVAL", attention: "yêu cầu ngoại lệ chờ duyệt", canAccess: canAccessShipmentExceptionQueue, load: () => loadField("admin/shipments/exception-queue/summary", "pendingApproval") },
      { key: "cases", label: "Sự cố mức cao", hint: "Hồ sơ sự cố mức Cao hoặc Nghiêm trọng", href: "/shipments/cases", attention: "hồ sơ sự cố mức cao", canAccess: canAccessShipmentCases, load: () => loadField("admin/shipment-cases/summary", "highOrCritical") },
      { key: "alerts", label: "Cảnh báo nghiêm trọng", hint: "Đơn trễ hạn, lệch tuyến, kẹt lâu", href: "/control-tower?severity=CRITICAL", attention: "cảnh báo nghiêm trọng", canAccess: canAccessControlTower, load: () => loadField("admin/shipments/control-tower/summary", "critical") },
      { key: "deadLetters", label: "Sự kiện gửi lỗi", hint: "Sự kiện giữa các hệ thống cần gửi lại", href: "/operations/dispatch", attention: "sự kiện gửi lỗi", canAccess: (user) => hasPermission(user, "operations.assignments.manage"), load: () => loadField("admin/operations/outbox/summary", "deadLetteredCount") },
      { key: "workforce", label: "Nhân sự đang làm", hint: "Trong phạm vi bưu cục bạn được xem", href: "/operations/workforce?status=ACTIVE", canAccess: canAccessOperationsWorkforce, load: () => loadCount("admin/operations/workforce?page=1&pageSize=1&status=ACTIVE") },
    ],
  },
  {
    title: "Khách hàng và tài khoản",
    metrics: [
      { key: "merchants", label: "Shop chờ duyệt", hint: "Hồ sơ shop cần xét duyệt", href: "/partners/merchants?status=PENDING_VERIFICATION", attention: "shop chờ duyệt", canAccess: (user) => hasPermission(user, "partners.merchants.read"), load: () => loadCount("admin/merchants?page=1&pageSize=1&status=PENDING_VERIFICATION") },
      { key: "support", label: "Yêu cầu hỗ trợ mới", hint: "Khách đang chờ phản hồi", href: "/support", attention: "yêu cầu hỗ trợ mới", canAccess: canAccessSupportRequests, load: () => loadField("admin/support/requests/counts", "new") },
      { key: "users", label: "Tài khoản", hint: "Người dùng trong phạm vi quản trị", href: "/identity/users", canAccess: (user) => hasPermission(user, "identity.users.read"), load: () => loadCount("users?page=1&pageSize=1") },
    ],
  },
];

/** Pages people open most, offered as shortcuts when they may open them. */
const SHORTCUTS = [
  "/shipments/tracking",
  "/shipments",
  "/operations/assignments",
  "/operations/shifts",
  "/fleet",
  "/deliveries",
  "/finance/cash",
  "/partners/merchants",
  "/support",
  "/network/hubs",
];

function Banner({ name, scope }: { name: string; scope: string }) {
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  return (
    <section className="relative overflow-hidden rounded-md bg-brand text-white">
      <svg className="absolute inset-y-0 right-0 h-full w-2/3 opacity-25" viewBox="0 0 600 140" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <path d="M-10 110 C 90 110 120 40 220 40 S 360 100 450 70 560 20 620 30" fill="none" stroke="white" strokeWidth="3" strokeDasharray="10 8" />
        <path d="M40 140 C 140 120 200 90 300 96 S 480 130 620 90" fill="none" stroke="white" strokeWidth="1.5" />
        {[[220, 40], [450, 70], [300, 96], [120, 84]].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="9" fill="white" opacity="0.35" />
            <circle cx={x} cy={y} r="4" fill="white" />
          </g>
        ))}
        <rect x="500" y="84" width="54" height="30" rx="4" fill="white" opacity="0.9" />
        <rect x="554" y="94" width="20" height="20" rx="3" fill="white" opacity="0.9" />
        <circle cx="516" cy="118" r="6" fill="white" />
        <circle cx="560" cy="118" r="6" fill="white" />
      </svg>
      <div className="relative px-5 py-5 sm:px-7">
        <p className="text-2xl font-black tracking-tight italic sm:text-3xl">PAVEX</p>
        <p className="mt-1 text-sm font-semibold">Xin chào, {name}</p>
        <p className="mt-0.5 text-xs text-white/80">
          {today.charAt(0).toUpperCase() + today.slice(1)} · {scope}
        </p>
      </div>
    </section>
  );
}

export function DashboardOverview() {
  const { user } = useAccess();
  const [values, setValues] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [scope, setScope] = useState<string | null>(null);

  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({ ...section, metrics: section.metrics.filter((metric) => metric.canAccess(user)) }))
        .filter((section) => section.metrics.length > 0),
    [user],
  );
  const shortcuts = useMemo(() => {
    const items = visibleModules(user).flatMap((area) => area.groups.flatMap((group) => group.items));
    return SHORTCUTS.map((href) => items.find((item) => item.href === href)).filter((item) => item !== undefined);
  }, [user]);
  const limitedToHubs = Boolean(user && !seesAllHubs(user) && hasPermission(user, "operations.hub.read"));

  const load = useCallback(async () => {
    setLoading(true);
    const next: Record<string, number | null> = {};
    await Promise.all(
      visibleSections.flatMap((section) =>
        section.metrics.map(async (metric) => {
          try {
            next[metric.key] = await metric.load();
          } catch {
            next[metric.key] = null;
          }
        }),
      ),
    );
    setValues(next);
    setUpdatedAt(new Date());
    setLoading(false);
  }, [visibleSections]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!limitedToHubs) return;
    let active = true;
    getMyHubScope()
      .then((result) => {
        if (active) setScope(result.hubs.map((hub) => hub.name).join(", ") || "Chưa được phân bưu cục");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [limitedToHubs]);

  const attention = visibleSections
    .flatMap((section) => section.metrics)
    .filter((metric) => metric.attention && (values[metric.key] ?? 0) > 0);
  const unreadable = Object.values(values).filter((value) => value === null).length;
  const scopeLabel = limitedToHubs ? `Bưu cục: ${scope ?? "đang tải…"}` : "Toàn mạng lưới";

  function display(key: string) {
    if (loading) return <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted align-middle" aria-label="Đang tải" />;
    const value = values[key];
    return typeof value === "number" ? value.toLocaleString("vi-VN") : "—";
  }

  return (
    <div className="space-y-2.5">
      <Banner name={user?.displayName || user?.email || "bạn"} scope={scopeLabel} />

      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2.5">
        <p className="text-xs">
          <span className="text-muted-foreground">Phạm vi thống kê : </span>
          <span className="font-semibold">{scopeLabel}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {updatedAt ? `Cập nhật lúc ${updatedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}` : "Đang tải số liệu…"}
        </p>
        <div className="ml-auto">
          <ToolbarButton tone="primary" icon={<RotateCcwIcon className={loading ? "animate-spin" : ""} />} onClick={() => void load()} disabled={loading}>
            Làm mới
          </ToolbarButton>
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-2.5">
          {visibleSections.map((section) => (
            <Panel key={section.title} title={section.title}>
              <StatGrid>
                {section.metrics.map((metric) => (
                  <StatTile
                    key={metric.key}
                    label={metric.label}
                    hint={metric.hint}
                    href={metric.href}
                    value={display(metric.key)}
                    tone={metric.attention && (values[metric.key] ?? 0) > 0 ? "warning" : "default"}
                  />
                ))}
              </StatGrid>
            </Panel>
          ))}
          {!loading && unreadable > 0 ? (
            <p className="px-1 text-[0.68rem] text-muted-foreground">
              {unreadable} chỉ số chưa đọc được lúc này (hiện “—”). Các trang vẫn dùng bình thường.
            </p>
          ) : null}
        </div>

        <div className="space-y-2.5">
          <Panel title="Cần xử lý" bodyClassName="p-0">
            {loading ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">Đang tải…</p>
            ) : attention.length ? (
              <ul className="divide-y">
                {attention.map((metric) => (
                  <li key={metric.key}>
                    <Link href={metric.href} className="flex items-center gap-2 px-3 py-2.5 text-xs transition hover:bg-muted">
                      <span className="rounded-sm bg-brand px-1.5 py-0.5 text-[0.62rem] font-bold text-white tabular-nums">
                        {(values[metric.key] ?? 0).toLocaleString("vi-VN")}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{metric.attention}</span>
                      <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-xs text-muted-foreground">Không có việc tồn cần xử lý trong phạm vi của bạn.</p>
            )}
          </Panel>

          {shortcuts.length ? (
            <Panel title="Lối tắt" bodyClassName="grid grid-cols-2 gap-1.5">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="truncate rounded border px-2.5 py-2 text-xs transition hover:border-brand/40 hover:text-brand"
                >
                  {item.label}
                </Link>
              ))}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
