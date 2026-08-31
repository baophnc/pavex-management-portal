"use client";

import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UserRoundSearchIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { searchUsers } from "@/features/identity/api";
import type { UserListItem } from "@/features/identity/contracts";
import {
  createWorkforceMember,
  getWorkforce,
} from "@/features/operations/api";
import {
  workforceKinds,
  workforceStatuses,
  type WorkforceMember,
  type WorkforceMemberKind,
  type WorkforceMemberStatus,
  type WorkforcePage,
} from "@/features/operations/contracts";
import {
  availabilityLabel,
  workforceIdentityName,
  workforceKindLabel,
  workforceStatusLabel,
} from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function statusClass(status: WorkforceMemberStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "SUSPENDED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "OFFBOARDED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

function identityRoleHint(kind: WorkforceMemberKind) {
  switch (kind) {
    case "COURIER":
    case "LINE_HAUL_DRIVER":
      return "Identity user cần role DRIVER.";
    case "WAREHOUSE_OPERATOR":
      return "Identity user cần role WAREHOUSE_STAFF.";
    case "DISPATCHER":
      return "Identity user cần role OPERATIONS_MANAGER hoặc HUB_MANAGER.";
  }
}

function CreateWorkforceDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (member: WorkforceMember) => void;
}) {
  const { hasPermission } = useAccess();
  const canSearchIdentity = hasPermission("identity.users.read");
  const [kind, setKind] = useState<WorkforceMemberKind>("COURIER");
  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<UserListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setKind("COURIER");
      setUserId("");
      setSearch("");
      setResults([]);
    }
  }, [open]);

  const runSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    try {
      const page = await searchUsers({ page: 1, pageSize: 10, search: q });
      setResults(page.items);
    } catch (error) {
      toast.error(apiMessage(error, "Không thể tìm tài khoản Identity."));
    } finally {
      setSearching(false);
    }
  };

  const submit = async () => {
    if (!userId.trim()) {
      toast.error("Chọn hoặc nhập Identity user ID.");
      return;
    }
    setSaving(true);
    try {
      const member = await createWorkforceMember({
        userId: userId.trim(),
        kind,
      });
      toast.success("Đã tạo workforce member.");
      onCreated(member);
      onClose();
    } catch (error) {
      toast.error(apiMessage(error, "Không thể tạo workforce member."));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-xl border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">
              Workforce onboarding
            </p>
            <h2 className="mt-1 text-lg font-black">Thêm nhân sự vận hành</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Operations chỉ lưu workforce projection. Tài khoản và role vẫn do Identity sở hữu.
            </p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} disabled={saving}>
            <XIcon className="size-4" />
          </Button>
        </header>

        <div className="space-y-5 p-4 sm:p-5">
          <label className="grid gap-2 text-xs font-bold">
            Loại nhân sự
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as WorkforceMemberKind)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {workforceKinds.map((item) => (
                <option key={item} value={item}>
                  {workforceKindLabel(item)}
                </option>
              ))}
            </select>
            <span className="text-[0.68rem] font-medium text-muted-foreground">
              {identityRoleHint(kind)} Backend sẽ xác thực lại trước khi tạo.
            </span>
          </label>

          {canSearchIdentity ? (
            <div className="space-y-2">
              <p className="text-xs font-bold">Tìm tài khoản Identity</p>
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void runSearch();
                    }
                  }}
                  placeholder="Email, tên hoặc mã người dùng..."
                />
                <Button type="button" variant="outline" onClick={() => void runSearch()} disabled={searching || !search.trim()}>
                  {searching ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}
                  Tìm
                </Button>
              </div>

              {results.length > 0 ? (
                <div className="max-h-56 overflow-auto rounded-lg border">
                  {results.map((user) => {
                    const selected = userId === user.userId;
                    return (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => setUserId(user.userId)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/40",
                          selected && "bg-brand/5",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {workforceIdentityName(user)}
                          </p>
                          <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">{user.email}</p>
                          <p className="mt-1 font-mono text-[0.58rem] text-muted-foreground">{user.userId}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[0.62rem] font-bold">{user.status}</p>
                          <p className="mt-1 text-[0.58rem] text-muted-foreground">{user.roles.join(", ") || "Không role"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
              Tài khoản hiện tại không có <code>identity.users.read</code>, vì vậy Management không thể tìm user. Bạn vẫn có thể nhập UUID trực tiếp; Operations sẽ xác minh với Identity.
            </div>
          )}

          <label className="grid gap-2 text-xs font-bold">
            Identity user ID
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-xs"
            />
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t p-4 sm:p-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || !userId.trim()}>
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
            Tạo workforce
          </Button>
        </footer>
      </section>
    </div>
  );
}

export function OperationsWorkforce() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAccess();
  const canManageGlobal = hasPermission("operations.workforce.manage");

  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as WorkforceMemberStatus | "";
  const kind = (searchParams.get("kind") ?? "") as WorkforceMemberKind | "";
  const hubId = searchParams.get("hubId") ?? "";

  const [data, setData] = useState<WorkforcePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => setSearchDraft(search), [search]);

  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) value.set("search", search.trim());
    if (status) value.set("status", status);
    if (kind) value.set("kind", kind);
    if (hubId.trim()) value.set("hubId", hubId.trim());
    return value;
  }, [hubId, kind, page, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getWorkforce(query));
    } catch (requestError) {
      setError(apiMessage(requestError, "Không thể tải danh sách workforce."));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateQuery = (changes: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  const submitSearch = () => updateQuery({ search: searchDraft.trim(), page: 1 });
  const hasFilters = Boolean(search || status || kind || hubId);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
              <UsersRoundIcon className="size-5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Operations / Workforce</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Nhân sự vận hành</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Quản lý workforce projection, tải công việc, trạng thái và phạm vi hub. Identity và Network vẫn là source of truth cho user/role và hub.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Làm mới
            </Button>
            {canManageGlobal ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-4" />
                Thêm nhân sự
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_180px_210px_minmax(220px,1fr)_auto] sm:p-5">
          <div className="flex gap-2">
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="Tên, email, employee code..."
            />
            <Button type="button" size="icon" variant="outline" onClick={submitSearch} aria-label="Tìm workforce">
              <SearchIcon className="size-4" />
            </Button>
          </div>

          <select
            value={status}
            onChange={(event) => updateQuery({ status: event.target.value, page: 1 })}
            className="h-10 rounded-md border bg-background px-3 text-xs font-bold"
          >
            <option value="">Mọi trạng thái</option>
            {workforceStatuses.map((item) => <option key={item} value={item}>{workforceStatusLabel(item)}</option>)}
          </select>

          <select
            value={kind}
            onChange={(event) => updateQuery({ kind: event.target.value, page: 1 })}
            className="h-10 rounded-md border bg-background px-3 text-xs font-bold"
          >
            <option value="">Mọi loại nhân sự</option>
            {workforceKinds.map((item) => <option key={item} value={item}>{workforceKindLabel(item)}</option>)}
          </select>

          <Input
            value={hubId}
            onChange={(event) => updateQuery({ hubId: event.target.value, page: 1 })}
            placeholder="Lọc theo Hub UUID"
            className="font-mono text-xs"
          />

          {hasFilters ? (
            <Button type="button" variant="ghost" onClick={() => {
              setSearchDraft("");
              router.replace(pathname);
            }}>
              <XIcon className="size-4" /> Xóa lọc
            </Button>
          ) : null}
        </div>
      </section>

      {!canManageGlobal ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-800 dark:text-amber-200">
          Bạn đang ở chế độ <strong>hub-scoped</strong>. Backend chỉ trả workforce thuộc các hub được Operations xác thực cho tài khoản hiện tại; tạo member, đổi trạng thái/capacity và đặt primary hub yêu cầu <code>operations.workforce.manage</code>.
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex items-start gap-3 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <div><p className="font-black">Không tải được workforce</p><p className="mt-1 text-xs">{error}</p></div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><LoaderCircleIcon className="size-4 animate-spin" /> Đang tải workforce...</div>
            </div>
          ) : data?.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="border-b bg-muted/25 text-[0.62rem] uppercase tracking-[0.1em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-black">Nhân sự</th>
                    <th className="px-4 py-3 font-black">Loại</th>
                    <th className="px-4 py-3 font-black">Trạng thái</th>
                    <th className="px-4 py-3 font-black">Availability / tải</th>
                    <th className="px-4 py-3 font-black">Hub</th>
                    <th className="px-4 py-3 font-black">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((member) => {
                    const activeHubs = member.hubMemberships.filter((item) => item.isActive);
                    const primary = activeHubs.find((item) => item.isPrimary);
                    return (
                      <tr key={member.id} className="border-b last:border-b-0 hover:bg-muted/20">
                        <td className="px-4 py-3.5">
                          <Link href={`/operations/workforce/${member.id}`} className="group block">
                            <p className="text-xs font-black group-hover:text-brand">{workforceIdentityName(member.identity ?? {})}</p>
                            <p className="mt-1 text-[0.68rem] text-muted-foreground">{member.identity?.email ?? member.userId}</p>
                            <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground">{member.employeeCode}</p>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-bold">{workforceKindLabel(member.kind)}</td>
                        <td className="px-4 py-3.5">
                          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[0.64rem] font-black", statusClass(member.status))}>
                            {workforceStatusLabel(member.status)}
                          </span>
                          {!member.identityAccessValid ? <p className="mt-1 text-[0.6rem] font-bold text-destructive">Identity/role không còn hợp lệ</p> : null}
                        </td>
                        <td className="px-4 py-3.5">
                          {member.availability ? (
                            <>
                              <p className="text-xs font-black">{availabilityLabel(member.availability.status)}</p>
                              <p className="mt-1 text-[0.68rem] text-muted-foreground">{member.availability.activeAssignments}/{member.availability.maxConcurrentAssignments} assignment · còn {member.availability.remainingCapacity}</p>
                            </>
                          ) : <span className="text-xs text-muted-foreground">Chưa cấu hình</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-black">{primary?.hubCode ?? activeHubs[0]?.hubCode ?? "—"}</p>
                          <p className="mt-1 max-w-48 truncate text-[0.68rem] text-muted-foreground">{primary?.hubName ?? activeHubs[0]?.hubName ?? `${activeHubs.length} hub đang hoạt động`}</p>
                          {activeHubs.length > 1 ? <p className="mt-1 text-[0.6rem] font-bold text-brand">+{activeHubs.length - 1} hub khác</p> : null}
                        </td>
                        <td className="px-4 py-3.5 text-[0.68rem] text-muted-foreground">{formatDateTime(member.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center p-6 text-center">
              <div>
                <UserRoundSearchIcon className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-black">Chưa có workforce phù hợp</p>
                <p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc hoặc tạo workforce member mới.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {data ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{data.totalCount.toLocaleString("vi-VN")} nhân sự · trang {data.page}/{Math.max(1, data.totalPages)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => updateQuery({ page: page - 1 })}>
              <ChevronLeftIcon className="size-4" /> Trước
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= data.totalPages || data.totalPages === 0 || loading} onClick={() => updateQuery({ page: page + 1 })}>
              Sau <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <CreateWorkforceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}
