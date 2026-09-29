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
import { useAccess } from "@/features/auth/access-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import {
  getWorkforce,
  onboardWorkforceMember,
} from "@/features/operations/api";
import {
  workforceKinds,
  workforceStatuses,
  type WorkforceMember,
  type WorkforceMemberKind,
  type WorkforceMemberStatus,
  type WorkforceOnboardingGender,
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

function onboardingRoleLabel(kind: WorkforceMemberKind) {
  switch (kind) {
    case "HUB_MANAGER":
      return "Điều phối lấy/giao hàng, quản lý nhân viên, vận đơn và tiền thu hộ của bưu cục.";
    case "WAREHOUSE_OPERATOR":
      return "Quét nhập/xuất kho và nhận tiền bưu tá nộp tại bưu cục.";
    case "COURIER":
      return "Lấy hàng, giao hàng, thu tiền người nhận và nộp tiền về bưu cục.";
    case "LINE_HAUL_DRIVER":
      return "Chạy các chuyến chở hàng giữa bưu cục và kho.";
  }
}

function defaultCapacity(kind: WorkforceMemberKind) {
  switch (kind) {
    case "COURIER": return 8;
    case "WAREHOUSE_OPERATOR": return 30;
    case "HUB_MANAGER": return 10;
    case "LINE_HAUL_DRIVER": return 2;
  }
}

function CreateWorkforceDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (member: WorkforceMember) => void;
}) {
  const [kind, setKind] = useState<WorkforceMemberKind>("COURIER");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<WorkforceOnboardingGender | "">("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [hubId, setHubId] = useState("");
  const [capacity, setCapacity] = useState(String(defaultCapacity("COURIER")));
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loadingHubs, setLoadingHubs] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getScopedHubs()
        .then((items) => setHubs(items.filter((hub) => hub.status === "ACTIVE")))
        .catch((error) => toast.error(apiMessage(error, "Không thể tải danh sách bưu cục.")))
        .finally(() => setLoadingHubs(false));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  const changeKind = (next: WorkforceMemberKind) => {
    setKind(next);
    setCapacity(String(defaultCapacity(next)));
  };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const capacityValue = Number(capacity);
    if (!normalizedEmail || !normalizedEmail.includes("@")) return toast.error("Nhập email nhân sự hợp lệ.");
    if (!firstName.trim() || !lastName.trim()) return toast.error("Họ và tên là bắt buộc.");
    if (!gender) return toast.error("Chọn giới tính để hoàn tất hồ sơ nhân sự.");
    if (!dateOfBirth) return toast.error("Ngày sinh là bắt buộc để hoàn tất hồ sơ.");
    if (!hubId) return toast.error("Chọn bưu cục làm việc của nhân viên.");
    if (!Number.isInteger(capacityValue) || capacityValue < 1 || capacityValue > 100) {
      return toast.error("Sức chứa công việc phải là số nguyên từ 1 đến 100.");
    }

    setSaving(true);
    try {
      const member = await onboardWorkforceMember({
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim() || null,
        gender,
        dateOfBirth,
        avatarUrl: null,
        kind,
        hubId,
        maxConcurrentAssignments: capacityValue,
      });
      toast.success("Đã tạo tài khoản và hồ sơ nhân viên. Nhân viên dùng Quên mật khẩu tại trang đăng nhập để tự đặt mật khẩu bằng email vừa cấp.");
      onCreated(member);
      onClose();
    } catch (error) {
      toast.error(apiMessage(error, "Không thể tạo nhân sự vận hành."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="max-h-[94vh] w-full max-w-3xl overflow-auto rounded-xl border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Nhân sự bưu cục</p>
            <h2 className="mt-1 text-lg font-black">Thêm nhân viên</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
              Tạo tài khoản đăng nhập, hồ sơ và chức danh cùng lúc. Nhân viên chỉ thấy dữ liệu của bưu cục được chọn.
            </p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} disabled={saving}><XIcon className="size-4" /></Button>
        </header>

        <div className="space-y-5 p-4 sm:p-5">
          <section className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold">
              Chức danh
              <select value={kind} onChange={(event) => changeKind(event.target.value as WorkforceMemberKind)} className="h-10 rounded-md border bg-background px-3 text-sm">
                {workforceKinds.map((item) => <option key={item} value={item}>{workforceKindLabel(item)}</option>)}
              </select>
            </label>
            <div className="rounded-lg border bg-muted/15 p-3 text-xs leading-5">
              <p className="font-black">Công việc</p><p className="mt-1 text-muted-foreground">{onboardingRoleLabel(kind)}</p>
            </div>
          </section>
          <p className="-mt-2 text-[0.68rem] text-muted-foreground">
            Nhân viên trụ sở (quản lý vận hành, kinh doanh, kế toán) được cấp vai trò ở mục Tài khoản, không thêm tại đây.
          </p>

          <section>
            <p className="text-sm font-black">Hồ sơ nhân sự</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold">Họ<Input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" placeholder="Nguyễn" /></label>
              <label className="grid gap-2 text-xs font-bold">Tên<Input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" placeholder="Minh Anh" /></label>
              <label className="grid gap-2 text-xs font-bold md:col-span-2">Tên hiển thị <span className="font-medium text-muted-foreground">(không bắt buộc)</span><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Anh Nguyễn" /></label>
              <label className="grid gap-2 text-xs font-bold">Email công việc<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nhansu@pavex.com" /></label>
              <label className="grid gap-2 text-xs font-bold">Ngày sinh<Input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} /></label>
              <label className="grid gap-2 text-xs font-bold">Giới tính<select value={gender} onChange={(event) => setGender(event.target.value as WorkforceOnboardingGender | "")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Chọn giới tính</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
              <div className="rounded-lg border bg-muted/15 p-3 text-xs leading-5 text-muted-foreground">Ảnh đại diện có thể bổ sung sau trong hồ sơ tài khoản.</div>
            </div>
          </section>

          <section>
            <p className="text-sm font-black">Nơi làm việc</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-xs font-bold">
                Bưu cục
                <select value={hubId} onChange={(event) => setHubId(event.target.value)} disabled={loadingHubs} className="h-10 rounded-md border bg-background px-3 text-sm">
                  <option value="">{loadingHubs ? "Đang tải bưu cục..." : "Chọn bưu cục"}</option>
                  {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name} · {hub.code}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-bold">Số việc nhận cùng lúc tối đa<Input type="number" min={1} max={100} step={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
            </div>
          </section>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-[0.68rem] text-muted-foreground">Nhân viên dùng “Quên mật khẩu” ở trang đăng nhập với email vừa cấp để tự đặt mật khẩu.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="button" onClick={() => void submit()} disabled={saving || loadingHubs || hubs.length === 0}>
              {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />} Thêm nhân viên
            </Button>
          </div>
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
  const [filterHubs, setFilterHubs] = useState<Hub[]>([]);
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    const task = window.setTimeout(() => setSearchDraft(search), 0);
    return () => window.clearTimeout(task);
  }, [search]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getScopedHubs()
        .then((items) => setFilterHubs(items.filter((hub) => hub.status === "ACTIVE")))
        .catch(() => setFilterHubs([]));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

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
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
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
                Tạo và quản lý nhân sự vận hành, hồ sơ, vai trò, tải công việc và phạm vi bưu cục. Quyền staff chỉ được cấp qua luồng quản trị nội bộ.
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

          <select
            value={hubId}
            onChange={(event) => updateQuery({ hubId: event.target.value, page: 1 })}
            className="h-10 rounded-md border bg-background px-3 text-xs font-bold"
          >
            <option value="">Mọi bưu cục trong phạm vi</option>
            {filterHubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}
          </select>

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
          Bạn đang xem nhân viên của bưu cục mình. Việc thêm nhân viên, đổi trạng thái hoặc chuyển bưu cục do quản lý vận hành ở trụ sở thực hiện.
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

      {createOpen ? (
        <CreateWorkforceDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => void load()}
        />
      ) : null}
    </div>
  );
}
