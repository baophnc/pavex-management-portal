"use client";

import {
  ArrowUpRightIcon,
  Building2Icon,
  CircleUserRoundIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UserRoundCogIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import { apiRequest } from "@/lib/api/client";

const PATHS = {
  users: "users?page=1&pageSize=1",
  roles: "roles",
  merchants: "admin/merchants?page=1&pageSize=1",
  pendingMerchants:
    "admin/merchants?page=1&pageSize=1&status=PENDING_VERIFICATION",
} as const;

type Metric = {
  key: keyof typeof PATHS;
  label: string;
  href: string;
  permission: string;
  hint: string;
  icon: typeof UsersRoundIcon;
};

const metrics: Metric[] = [
  {
    key: "users",
    label: "Tài khoản Identity",
    href: "/identity/users",
    permission: "identity.users.read",
    hint: "Mở danh sách người dùng",
    icon: UsersRoundIcon,
  },
  {
    key: "roles",
    label: "Vai trò hệ thống",
    href: "/identity/roles",
    permission: "identity.roles.read",
    hint: "Xem role và permission",
    icon: ShieldCheckIcon,
  },
  {
    key: "merchants",
    label: "Tổng Merchant",
    href: "/partners/merchants",
    permission: "partners.merchants.read",
    hint: "Mở danh sách Merchant",
    icon: Building2Icon,
  },
  {
    key: "pendingMerchants",
    label: "Merchant chờ duyệt",
    href: "/partners/merchants?status=PENDING_VERIFICATION",
    permission: "partners.merchants.read",
    hint: "Xử lý hồ sơ đang chờ",
    icon: UserRoundCogIcon,
  },
];

function countPayload(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  if (typeof record.totalCount === "number") return record.totalCount;
  if (typeof record.totalElements === "number") return record.totalElements;
  if (Array.isArray(record.items)) return record.items.length;
  if (Array.isArray(record.content)) return record.content.length;
  return null;
}

function MetricSkeleton() {
  return (
    <span
      className="inline-block h-9 w-16 animate-pulse rounded-lg bg-muted"
      aria-label="Đang tải"
    />
  );
}

export function DashboardOverview() {
  const { hasPermission, user } = useAccess();
  const [values, setValues] = useState<
    Partial<Record<keyof typeof PATHS, number | null>>
  >({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const next: Partial<Record<keyof typeof PATHS, number | null>> = {};
    const failures: string[] = [];

    await Promise.all(
      metrics.map(async (metric) => {
        if (!hasPermission(metric.permission)) {
          next[metric.key] = null;
          return;
        }

        try {
          next[metric.key] = countPayload(await apiRequest(PATHS[metric.key]));
        } catch {
          next[metric.key] = null;
          failures.push(metric.key);
        }
      }),
    );

    setValues(next);
    setFailed(failures);
    setLoading(false);
  }, [hasPermission]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const pendingMerchant = values.pendingMerchants;
  const identityTotal = values.users;

  const priorityText = useMemo(() => {
    if (!hasPermission("partners.merchants.read")) {
      return "Tài khoản hiện tại không có quyền đọc hàng chờ Merchant.";
    }
    if (loading) return "Đang tải dữ liệu mới nhất từ backend.";
    if (failed.includes("pendingMerchants")) {
      return "Chưa đọc được hàng chờ Merchant. Có thể tải lại để thử lại.";
    }
    if (typeof pendingMerchant === "number" && pendingMerchant > 0) {
      return `Có ${pendingMerchant.toLocaleString("vi-VN")} hồ sơ Merchant đang chờ xét duyệt.`;
    }
    return "Không có hồ sơ Merchant đang chờ xét duyệt.";
  }, [failed, hasPermission, loading, pendingMerchant]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-brand/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-primary/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[0.6rem] font-black tracking-[0.14em] text-brand uppercase">
                Pavex Management Portal
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[0.6rem] font-bold text-muted-foreground">
                <ShieldCheckIcon className="size-3 text-emerald-600" />
                Hiển thị theo permission backend
              </span>
            </div>
            <h1 className="mt-4 max-w-3xl text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">
              Identity và Partners trong một workspace quản trị.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Dashboard chỉ tổng hợp những module đã có backend trong phiên bản
              hiện tại. Mỗi chỉ số và liên kết đều tuân theo permission của tài
              khoản đang đăng nhập.
            </p>
          </div>

          <div className="rounded-2xl border bg-background/75 p-4 shadow-sm backdrop-blur">
            <p className="text-[0.62rem] font-black tracking-[0.14em] text-muted-foreground uppercase">
              Ưu tiên hiện tại
            </p>
            <p className="mt-2 text-sm font-black leading-5">{priorityText}</p>
            {hasPermission("partners.merchants.read") ? (
              <Link
                href="/partners/merchants?status=PENDING_VERIFICATION"
                className="mt-4 inline-flex items-center gap-1 text-xs font-black text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
              >
                Mở hàng chờ Merchant
                <ArrowUpRightIcon className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[0.62rem] font-black tracking-[0.14em] text-brand uppercase">
            Tổng quan theo quyền
          </p>
          <h2 className="mt-1 text-xl font-black">
            Xin chào, {user?.displayName ?? user?.email ?? "Pavex operator"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {typeof identityTotal === "number"
              ? `${identityTotal.toLocaleString("vi-VN")} tài khoản Identity đang được quản lý.`
              : "Dữ liệu được tải theo permission hiện tại."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="self-start sm:self-auto"
        >
          <RefreshCwIcon className={loading ? "animate-spin" : ""} />
          Làm mới dữ liệu
        </Button>
      </div>

      {failed.length > 0 && !loading ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-200"
        >
          Có {failed.length} chỉ số chưa tải được. Các module còn lại vẫn có thể
          sử dụng bình thường.
        </div>
      ) : null}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Chỉ số quản trị"
      >
        {metrics.map((metric) => {
          const allowed = hasPermission(metric.permission);
          const Icon = metric.icon;
          const value = values[metric.key];
          const metricFailed = failed.includes(metric.key);
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-4" />
                </span>
                {allowed ? (
                  <ArrowUpRightIcon className="size-3.5 text-muted-foreground/55" />
                ) : null}
              </div>
              <p className="mt-4 text-xs font-bold text-muted-foreground">
                {metric.label}
              </p>
              <div className="mt-1 min-h-10 text-3xl font-black tracking-tight tabular-nums">
                {loading ? (
                  <MetricSkeleton />
                ) : allowed && !metricFailed && typeof value === "number" ? (
                  value.toLocaleString("vi-VN")
                ) : (
                  "—"
                )}
              </div>
              <p className="mt-2 text-[0.65rem] font-bold leading-4 text-muted-foreground">
                {!allowed
                  ? "Tài khoản hiện tại không có quyền"
                  : metricFailed
                    ? "Không đọc được dữ liệu lúc này"
                    : metric.hint}
              </p>
            </>
          );

          return allowed ? (
            <Link
              key={metric.key}
              href={metric.href}
              className="group rounded-2xl border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 motion-reduce:transform-none"
            >
              {content}
            </Link>
          ) : (
            <div
              key={metric.key}
              aria-disabled="true"
              className="cursor-not-allowed rounded-2xl border bg-muted/25 p-4 opacity-55"
            >
              {content}
            </div>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader>
            <p className="text-sm font-black">Đi nhanh tới chức năng</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Chỉ hiển thị các đường dẫn tài khoản hiện tại được phép sử dụng.
            </p>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {hasPermission("identity.users.read") ? (
              <Link
                href="/identity/users"
                className="flex items-center gap-3 rounded-xl border bg-background p-3 transition hover:bg-muted"
              >
                <UsersRoundIcon className="size-4 text-brand" />
                <span className="text-xs font-black">Quản lý người dùng</span>
              </Link>
            ) : null}
            {hasPermission("partners.merchants.read") ? (
              <Link
                href="/partners/merchants"
                className="flex items-center gap-3 rounded-xl border bg-background p-3 transition hover:bg-muted"
              >
                <Building2Icon className="size-4 text-brand" />
                <span className="text-xs font-black">Quản lý Merchant</span>
              </Link>
            ) : null}
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-xl border bg-background p-3 transition hover:bg-muted"
            >
              <CircleUserRoundIcon className="size-4 text-brand" />
              <span className="text-xs font-black">Tài khoản của tôi</span>
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
