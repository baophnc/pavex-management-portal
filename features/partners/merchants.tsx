"use client";

import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  ExternalLinkIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  merchantReasonLabel,
  merchantStatuses,
  merchantStatusLabel,
  type MerchantListResponse,
  type MerchantProfile,
  type MerchantStatus,
} from "@/features/partners/contracts";
import { HubSelect, useHubScope } from "@/features/directory/hub-scope";
import { HubName } from "@/features/directory/names";
import { searchMerchants } from "@/features/partners/api";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

function parseStatus(value: string | null): MerchantStatus | "" {
  return merchantStatuses.includes(value as MerchantStatus)
    ? (value as MerchantStatus)
    : "";
}

function statusClass(status: MerchantStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "PENDING_VERIFICATION":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "SUSPENDED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "REJECTED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
  }
}

function StatusBadge({ status }: { status: MerchantStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
        statusClass(status),
      )}
    >
      {merchantStatusLabel(status)}
    </span>
  );
}

function MerchantCard({ merchant }: { merchant: MerchantProfile }) {
  return (
    <article className="rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
          <StoreIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{merchant.businessName}</p>
              <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                {merchant.merchantCode}
              </p>
            </div>
            <StatusBadge status={merchant.status} />
          </div>

          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Người liên hệ
              </p>
              <p className="mt-1 font-bold">{merchant.contactName}</p>
            </div>
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Email
              </p>
              <p className="mt-1 break-all font-bold">
                {merchant.contactEmail || "—"}
              </p>
            </div>
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Mã số thuế
              </p>
              <p className="mt-1 font-mono font-bold">{merchant.taxCode || "—"}</p>
            </div>
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                Tạo lúc
              </p>
              <p className="mt-1 font-bold">{formatDateTime(merchant.createdAt)}</p>
            </div>
          </div>

          <Link
            href={`/partners/merchants/${merchant.id}`}
            className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border bg-background px-3.5 text-xs font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
          >
            Mở hồ sơ
            <ExternalLinkIcon className="size-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function QuickStatusFilter({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[0.65rem] font-black transition",
        active
          ? "border-brand/30 bg-brand/10 text-brand"
          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function MerchantManagement() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const status = parseStatus(searchParams.get("status"));
  const query = searchParams.get("search")?.trim() ?? "";
  const hubId = searchParams.get("hubId") ?? "";
  const scope = useHubScope();

  const [result, setResult] = useState<MerchantListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setResult(
        await searchMerchants({
          page,
          pageSize: PAGE_SIZE,
          status,
          search: query,
          hubId,
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách cửa hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [hubId, page, query, status]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function updateQuery(values: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(values)) {
      if (
        value === null ||
        value === "" ||
        (key === "page" && Number(value) <= 1)
      ) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function applySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateQuery({
      search: String(form.get("search") ?? "").trim(),
      page: 1,
    });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  const rows = result?.content ?? [];
  const pages = Math.max(1, result?.totalPages ?? 0);
  const pendingOnPage = rows.filter(
    (item) => item.status === "PENDING_VERIFICATION",
  ).length;
  const activeOnPage = rows.filter((item) => item.status === "ACTIVE").length;
  const attentionOnPage = rows.filter(
    (item) =>
      item.status === "PENDING_VERIFICATION" || item.status === "SUSPENDED",
  ).length;
  const hasFilters = Boolean(status || query || hubId);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
                <Building2Icon className="size-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
                  Quản lý đối tác
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Quản lý cửa hàng
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Xem hồ sơ doanh nghiệp, xét duyệt và quản lý trạng thái
              cửa hàng. Tìm theo mã cửa hàng, tên doanh nghiệp, mã số thuế
              hoặc email liên hệ.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Tổng theo bộ lọc
            </p>
            <p className="mt-1.5 text-xl font-black tabular-nums sm:text-2xl">
              {loading && !result ? "…" : result?.totalElements ?? 0}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Chờ duyệt / trang
            </p>
            <p className="mt-1.5 text-xl font-black tabular-nums text-amber-700 sm:text-2xl dark:text-amber-300">
              {pendingOnPage}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Đang hoạt động
            </p>
            <p className="mt-1.5 text-xl font-black tabular-nums text-emerald-700 sm:text-2xl dark:text-emerald-300">
              {activeOnPage}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Cần chú ý / trang
            </p>
            <p className="mt-1.5 text-xl font-black tabular-nums sm:text-2xl">
              {attentionOnPage}
            </p>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="border-b p-3 sm:p-4">
          <form
            className="grid gap-2 lg:grid-cols-[minmax(18rem,1fr)_minmax(11rem,.34fr)_auto]"
            onSubmit={applySearch}
          >
            <div className="flex min-w-0 gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Tìm cửa hàng</span>
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  key={query}
                  name="search"
                  defaultValue={query}
                  className="h-11 pl-9 sm:h-10"
                  placeholder="Mã cửa hàng, doanh nghiệp, MST, email..."
                  autoComplete="off"
                />
              </label>
              <Button type="submit" variant="outline" className="h-11 sm:h-10">
                Tìm
              </Button>
            </div>

            <HubSelect
              scope={scope}
              value={hubId}
              allLabel="Tất cả bưu cục"
              className="h-11 w-auto text-xs font-bold sm:h-10"
              onChange={(next) => updateQuery({ hubId: next || null, page: 1 })}
            />

            <select
              value={status}
              onChange={(event) =>
                updateQuery({ status: event.target.value, page: 1 })
              }
              className="h-11 rounded-md border bg-background px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:h-10"
              aria-label="Lọc trạng thái cửa hàng"
            >
              <option value="">Tất cả trạng thái</option>
              {merchantStatuses.map((item) => (
                <option key={item} value={item}>
                  {merchantStatusLabel(item)}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                <XIcon className="size-4" />
                Xóa lọc
              </Button>
            ) : (
              <div className="hidden lg:block" />
            )}
          </form>

          <div className="mt-3 flex flex-wrap gap-2" aria-label="Lọc nhanh cửa hàng">
            <QuickStatusFilter
              active={!status}
              label="Tất cả"
              onClick={() => updateQuery({ status: null, page: 1 })}
            />
            <QuickStatusFilter
              active={status === "PENDING_VERIFICATION"}
              label="Chờ xét duyệt"
              onClick={() =>
                updateQuery({ status: "PENDING_VERIFICATION", page: 1 })
              }
            />
            <QuickStatusFilter
              active={status === "ACTIVE"}
              label="Đang hoạt động"
              onClick={() => updateQuery({ status: "ACTIVE", page: 1 })}
            />
            <QuickStatusFilter
              active={status === "SUSPENDED"}
              label="Tạm ngưng"
              onClick={() => updateQuery({ status: "SUSPENDED", page: 1 })}
            />
            <QuickStatusFilter
              active={status === "REJECTED"}
              label="Đã từ chối"
              onClick={() => updateQuery({ status: "REJECTED", page: 1 })}
            />
          </div>
        </div>

        {error ? (
          <div className="border-b bg-destructive/5 px-4 py-3 text-xs font-bold text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !result ? (
          <div className="grid min-h-64 place-items-center text-center">
            <div>
              <RefreshCwIcon className="mx-auto size-5 animate-spin text-brand" />
              <p className="mt-3 text-xs font-bold text-muted-foreground">
                Đang tải cửa hàng...
              </p>
            </div>
          </div>
        ) : rows.length ? (
          <>
            <div className="grid gap-3 p-3 lg:hidden">
              {rows.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[72rem] text-left text-xs">
                <thead className="border-b bg-muted/35 text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Cửa hàng</th>
                    <th className="px-4 py-3">Doanh nghiệp</th>
                    <th className="px-4 py-3">Liên hệ</th>
                    <th className="px-4 py-3">Mã số thuế</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((merchant) => (
                    <tr key={merchant.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-mono text-[0.68rem] font-black">
                          {merchant.merchantCode}
                        </p>
                        <p className="mt-1 text-[0.62rem] text-muted-foreground">
                          {merchant.servingHubId ? <HubName id={merchant.servingHubId} /> : "Chưa xác định bưu cục"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="max-w-64 truncate font-black">
                          {merchant.businessName}
                        </p>
                        <p className="mt-1 text-[0.68rem] text-muted-foreground">
                          {merchant.contactName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-bold">{merchant.contactPhone}</p>
                        <p className="mt-1 max-w-56 truncate text-[0.68rem] text-muted-foreground">
                          {merchant.contactEmail || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-top font-mono font-bold">
                        {merchant.taxCode || "—"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <StatusBadge status={merchant.status} />
                        {merchant.statusReasonCode ? (
                          <p className="mt-1.5 max-w-48 text-[0.62rem] leading-4 text-muted-foreground">
                            {merchantReasonLabel(merchant.statusReasonCode)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <p className="font-bold">{formatDateTime(merchant.updatedAt)}</p>

                      </td>
                      <td className="px-4 py-3.5 text-right align-top">
                        <Link
                          href={`/partners/merchants/${merchant.id}`}
                          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-background px-3 text-[0.68rem] font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                        >
                          Mở hồ sơ
                          <ExternalLinkIcon className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="grid min-h-64 place-items-center px-5 text-center">
            <div className="max-w-md">
              <ShieldCheckIcon className="mx-auto size-7 text-muted-foreground" />
              <p className="mt-3 text-sm font-black">Không có cửa hàng phù hợp</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="flex items-center gap-2 text-[0.68rem] font-bold text-muted-foreground">
            <Clock3Icon className="size-3.5" />
            Trang {result?.page ?? page}/{pages} · {result?.totalElements ?? 0} cửa hàng
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => updateQuery({ page: page - 1 })}
            >
              <ChevronLeftIcon className="size-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              disabled={loading || page >= pages}
              onClick={() => updateQuery({ page: page + 1 })}
            >
              Sau
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
