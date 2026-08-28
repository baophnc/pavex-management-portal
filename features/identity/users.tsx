"use client";

import {
  BadgeCheckIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  SearchIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  accountStatuses,
  profileStatuses,
  type AccountStatus,
  type ProfileStatus,
  type RoleItem,
  type UserListItem,
  type UserPage,
} from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

const accountLabels: Record<AccountStatus, string> = {
  ACTIVE: "Hoạt động",
  SUSPENDED: "Tạm khóa",
  DISABLED: "Vô hiệu hóa",
};

const profileLabels: Record<ProfileStatus, string> = {
  COMPLETED: "Đã hoàn tất",
  INCOMPLETE: "Chưa hoàn tất",
  PENDING_VERIFICATION: "Chờ xác minh",
  REJECTED: "Bị từ chối",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Quản trị hệ thống",
  OPERATIONS_MANAGER: "Quản lý vận hành",
  HUB_MANAGER: "Quản lý bưu cục",
  WAREHOUSE_STAFF: "Nhân viên kho",
  DRIVER: "Nhân viên giao nhận",
  MERCHANT: "Đối tác gửi hàng",
  CUSTOMER: "Khách hàng",
};

function parseAccountStatus(value: string | null): AccountStatus | "" {
  return accountStatuses.includes(value as AccountStatus)
    ? (value as AccountStatus)
    : "";
}

function parseProfileStatus(value: string | null): ProfileStatus | "" {
  return profileStatuses.includes(value as ProfileStatus)
    ? (value as ProfileStatus)
    : "";
}

function displayUserName(user: UserListItem) {
  return (
    user.displayName ??
    (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Chưa đặt tên")
  );
}

function accountBadge(status: AccountStatus) {
  const classes: Record<AccountStatus, string> = {
    ACTIVE:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    SUSPENDED:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    DISABLED: "border-destructive/20 bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
        classes[status],
      )}
    >
      {accountLabels[status]}
    </span>
  );
}

function profileBadge(status: ProfileStatus) {
  const classes: Record<ProfileStatus, string> = {
    COMPLETED:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    INCOMPLETE: "border-border bg-muted text-muted-foreground",
    PENDING_VERIFICATION:
      "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    REJECTED: "border-destructive/20 bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
        classes[status],
      )}
    >
      {profileLabels[status]}
    </span>
  );
}

export function IdentityUsers() {
  const { hasPermission } = useAccess();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canReadRoles = hasPermission("identity.roles.read");

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const status = parseAccountStatus(searchParams.get("status"));
  const profileStatus = parseProfileStatus(searchParams.get("profileStatus"));

  const [result, setResult] = useState<UserPage | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);
    if (profileStatus) params.set("profileStatus", profileStatus);
    return `users?${params.toString()}`;
  }, [page, profileStatus, role, search, status]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setResult((await apiRequest(endpoint)) as UserPage);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách tài khoản.",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const loadRoles = useCallback(async () => {
    if (!canReadRoles) {
      setRoles([]);
      return;
    }

    try {
      const payload = await apiRequest("roles");
      setRoles(Array.isArray(payload) ? (payload as RoleItem[]) : []);
    } catch {
      setRoles([]);
    }
  }, [canReadRoles]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void loadUsers();
      void loadRoles();
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadRoles, loadUsers]);

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

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function clearFilters() {
    router.replace(pathname, { scroll: false });
  }

  const totalPages = Math.max(1, result?.totalPages ?? 0);
  const hasFilters = Boolean(search || role || status || profileStatus);
  const activeOnPage =
    result?.items.filter((user) => user.status === "ACTIVE").length ?? 0;
  const verifiedOnPage =
    result?.items.filter((user) => user.emailVerified).length ?? 0;
  const completedOnPage =
    result?.items.filter((user) => user.profileStatus === "COMPLETED").length ??
    0;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
                <UserRoundIcon className="size-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.16em] text-brand uppercase">
                  Identity control
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Tài khoản người dùng
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Tra cứu tài khoản, trạng thái hồ sơ, xác minh email và vai trò trực
              tiếp từ Identity service. Bộ lọc được lưu trong URL để không mất
              ngữ cảnh khi chuyển workspace.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            <RefreshCwIcon
              className={cn("size-4", loading && "animate-spin")}
            />
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <Metric
            label="Tổng tài khoản"
            value={loading && !result ? "…" : result?.totalCount ?? 0}
          />
          <Metric
            label="Hoạt động / trang"
            value={activeOnPage}
            valueClassName="text-emerald-700 dark:text-emerald-300"
          />
          <Metric label="Email xác minh" value={verifiedOnPage} />
          <Metric label="Hồ sơ hoàn tất" value={completedOnPage} />
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="border-b p-3 sm:p-4">
          <form
            className="grid gap-2 xl:grid-cols-[minmax(18rem,1fr)_repeat(3,minmax(10rem,.42fr))_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              updateQuery({
                search: String(form.get("search") ?? "").trim(),
                page: 1,
              });
            }}
          >
            <div className="flex min-w-0 gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Tìm tài khoản</span>
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  key={search}
                  name="search"
                  defaultValue={search}
                  className="h-11 pl-9 sm:h-10"
                  placeholder="Email hoặc tên..."
                  autoComplete="off"
                />
              </label>
              <Button
                type="submit"
                variant="outline"
                className="h-11 sm:h-10"
              >
                Tìm
              </Button>
            </div>

            <select
              aria-label="Lọc theo vai trò"
              value={role}
              disabled={!canReadRoles}
              onChange={(event) =>
                updateQuery({ role: event.target.value, page: 1 })
              }
              className="h-11 rounded-md border bg-background px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
            >
              <option value="">
                {canReadRoles ? "Mọi vai trò" : "Không có quyền xem vai trò"}
              </option>
              {roles.map((item) => (
                <option key={item.id} value={item.code}>
                  {roleLabels[item.code] ?? item.name} ({item.code})
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái tài khoản"
              value={status}
              onChange={(event) =>
                updateQuery({ status: event.target.value, page: 1 })
              }
              className="h-11 rounded-md border bg-background px-3 text-xs font-bold sm:h-10"
            >
              <option value="">Mọi trạng thái tài khoản</option>
              {accountStatuses.map((item) => (
                <option key={item} value={item}>
                  {accountLabels[item]}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo trạng thái hồ sơ"
              value={profileStatus}
              onChange={(event) =>
                updateQuery({ profileStatus: event.target.value, page: 1 })
              }
              className="h-11 rounded-md border bg-background px-3 text-xs font-bold sm:h-10"
            >
              <option value="">Mọi trạng thái hồ sơ</option>
              {profileStatuses.map((item) => (
                <option key={item} value={item}>
                  {profileLabels[item]}
                </option>
              ))}
            </select>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 justify-center sm:h-10 xl:px-3"
                onClick={clearFilters}
              >
                <XIcon className="size-4" />
                Xóa lọc
              </Button>
            ) : (
              <span className="hidden xl:block" />
            )}
          </form>

          <div
            className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <span>
              Đang hiển thị{" "}
              <strong className="text-foreground">
                {result?.items.length ?? 0}
              </strong>{" "}
              / {result?.totalCount ?? 0} tài khoản
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-bold">
              Trang {page}/{totalPages}
            </span>
          </div>
        </div>

        {loading ? (
          <StateLoading />
        ) : error ? (
          <StateError message={error} onRetry={() => void loadUsers()} />
        ) : result?.items.length ? (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b bg-muted/70 text-[0.65rem] font-black tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Hồ sơ</th>
                  <th className="px-4 py-3">Khởi tạo</th>
                  <th className="px-4 py-3">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b last:border-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-black text-brand">
                          {initialsOf(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold">{displayUserName(user)}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>{user.email}</span>
                            {user.emailVerified ? (
                              <BadgeCheckIcon
                                className="size-3.5 text-emerald-600"
                                aria-label="Email đã xác minh"
                              />
                            ) : null}
                          </div>
                          <p
                            className="mt-1 max-w-64 truncate font-mono text-[0.6rem] text-muted-foreground/70"
                            title={user.userId}
                          >
                            {user.userId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex max-w-72 flex-wrap gap-1.5">
                        {user.roles.length ? (
                          user.roles.map((roleCode) => (
                            <span
                              key={roleCode}
                              className="rounded-md border bg-muted/30 px-2 py-1 text-[0.65rem] font-bold"
                              title={roleCode}
                            >
                              {roleLabels[roleCode] ?? roleCode}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {accountBadge(user.status)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {profileBadge(user.profileStatus)}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {formatDateTime(user.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateEmpty hasFilters={hasFilters} onClear={clearFilters} />
        )}

        <footer className="flex flex-col gap-2 border-t bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
            <CalendarDaysIcon className="size-3.5" />
            <span>{PAGE_SIZE} tài khoản mỗi trang · bộ lọc được giữ trong URL</span>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 sm:flex-none"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => updateQuery({ page: page - 1 })}
            >
              <ChevronLeftIcon className="size-4" />
              Trước
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => updateQuery({ page: page + 1 })}
            >
              Sau
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </footer>
      </Card>
    </div>
  );
}

function initialsOf(user: UserListItem) {
  const source = displayUserName(user) || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="p-3.5 sm:p-4">
      <p className="text-[0.6rem] font-black tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 text-xl font-black tabular-nums sm:text-2xl",
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StateLoading() {
  return (
    <div
      className="grid min-h-80 place-items-center"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <RefreshCwIcon className="mx-auto size-5 animate-spin text-brand" />
        <p className="mt-2 text-xs font-bold text-muted-foreground">
          Đang đồng bộ Identity...
        </p>
      </div>
    </div>
  );
}

function StateError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center p-6 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-black text-destructive">
          Không tải được Identity
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {message}
        </p>
        <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}

function StateEmpty({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <UserRoundIcon className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-black">Không tìm thấy tài khoản</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Thử bỏ bớt bộ lọc hoặc tìm bằng email/tên khác.
        </p>
        {hasFilters ? (
          <Button className="mt-4" size="sm" variant="outline" onClick={onClear}>
            <XIcon className="size-4" />
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </div>
  );
}
