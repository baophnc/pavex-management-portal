"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  accountStatuses,
  profileStatuses,
  type AccountStatus,
  type ProfileStatus,
  type RoleItem,
  type UserPage,
} from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";

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

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
}

function displayUserName(user: UserPage["items"][number]) {
  return (
    user.displayName ??
    (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Chưa đặt tên")
  );
}

export function IdentityUsers() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("search")?.trim() ?? "";
  const role = searchParams.get("role")?.trim() ?? "";
  const status = accountStatuses.includes(
    searchParams.get("status") as AccountStatus,
  )
    ? (searchParams.get("status") as AccountStatus)
    : "";
  const profileStatus = profileStatuses.includes(
    searchParams.get("profileStatus") as ProfileStatus,
  )
    ? (searchParams.get("profileStatus") as ProfileStatus)
    : "";
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
    return `users?${params}`;
  }, [page, profileStatus, role, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, roleItems] = await Promise.all([
        apiRequest(endpoint) as Promise<UserPage>,
        apiRequest("roles").catch(() => []) as Promise<RoleItem[]>,
      ]);
      setResult(users);
      setRoles(roleItems);
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

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function updateQuery(values: Record<string, string | number>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) =>
      value === "" || (key === "page" && value === 1)
        ? params.delete(key)
        : params.set(key, String(value)),
    );
    router.replace(params.size ? `${pathname}?${params}` : pathname, {
      scroll: false,
    });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/10 via-card to-card p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-black tracking-[0.16em] text-brand uppercase">
              Identity control
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              Tài khoản người dùng
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Tra cứu account, trạng thái hồ sơ và vai trò trực tiếp từ Identity
              service.
            </p>
          </div>
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </Button>
        </div>
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          <Metric label="Tổng tài khoản" value={result?.totalCount ?? 0} />
          <Metric
            label="Hoạt động / trang"
            value={
              result?.items.filter((item) => item.status === "ACTIVE").length ??
              0
            }
          />
          <Metric
            label="Email xác minh"
            value={
              result?.items.filter((item) => item.emailVerified).length ?? 0
            }
          />
          <Metric
            label="Hồ sơ hoàn tất"
            value={
              result?.items.filter((item) => item.profileStatus === "COMPLETED")
                .length ?? 0
            }
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-card">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            updateQuery({
              search: String(
                new FormData(event.currentTarget).get("search") ?? "",
              ).trim(),
              page: 1,
            });
          }}
          className="grid gap-2 border-b p-4 lg:grid-cols-[minmax(15rem,1fr)_repeat(3,minmax(10rem,.45fr))_auto]"
        >
          <Input
            name="search"
            defaultValue={search}
            placeholder="Email hoặc tên..."
          />
          <Select
            value={role}
            onChange={(value) => updateQuery({ role: value, page: 1 })}
          >
            <option value="">Mọi vai trò</option>
            {roles.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select
            value={status}
            onChange={(value) => updateQuery({ status: value, page: 1 })}
          >
            <option value="">Mọi trạng thái</option>
            {accountStatuses.map((item) => (
              <option key={item} value={item}>
                {accountLabels[item]}
              </option>
            ))}
          </Select>
          <Select
            value={profileStatus}
            onChange={(value) => updateQuery({ profileStatus: value, page: 1 })}
          >
            <option value="">Mọi hồ sơ</option>
            {profileStatuses.map((item) => (
              <option key={item} value={item}>
                {profileLabels[item]}
              </option>
            ))}
          </Select>
          <Button type="submit">Tìm</Button>
        </form>
        {loading ? (
          <StateMessage>Đang đồng bộ Identity...</StateMessage>
        ) : error ? (
          <StateMessage tone="error">{error}</StateMessage>
        ) : result?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-muted/70 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Người dùng</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Tài khoản</th>
                  <th className="px-4 py-3">Hồ sơ</th>
                  <th className="px-4 py-3">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((user) => (
                  <tr key={user.userId} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-bold">{displayUserName(user)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {user.roles.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={accountLabels[user.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={profileLabels[user.profileStatus]} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(user.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateMessage>Không tìm thấy tài khoản.</StateMessage>
        )}
        <footer className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
          <span>
            Trang {page}/{Math.max(1, result?.totalPages ?? 1)}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: page - 1 })}
            >
              Trước
            </button>
            <button
              className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
              disabled={page >= (result?.totalPages ?? 1)}
              onClick={() => updateQuery({ page: page + 1 })}
            >
              Sau
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4">
      <p className="text-[0.6rem] font-black tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border bg-muted px-2.5 py-1 text-[0.65rem] font-black">
      {value}
    </span>
  );
}
function StateMessage({
  children,
  tone = "normal",
}: {
  children: React.ReactNode;
  tone?: "normal" | "error";
}) {
  return (
    <div
      className={`grid min-h-64 place-items-center p-6 text-sm font-bold ${tone === "error" ? "text-brand" : "text-muted-foreground"}`}
    >
      {children}
    </div>
  );
}
function Select({
  children,
  value,
  onChange,
}: {
  children: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-lg border bg-white px-3 text-sm font-bold"
    >
      {children}
    </select>
  );
}
