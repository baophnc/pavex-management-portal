"use client";

import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  MailPlusIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShieldMinusIcon,
  ShieldPlusIcon,
  UserCogIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  accountStatuses,
  genders,
  type AccountStatus,
  type Gender,
  type RoleItem,
  type UserDetail,
} from "@/features/identity/contracts";
import {
  assignUserRole,
  getRoles,
  getUser,
  inviteUser,
  removeUserRole,
  updateUserProfile,
  updateUserStatus,
} from "@/features/identity/api";
import {
  accountLabels,
  displayUserName,
  genderLabels,
  groupPermissionCodes,
  initialsOf,
  isIdentityAssignableRole,
  permissionLabel,
  profileLabels,
  rolePresentation,
} from "@/features/identity/presentation";
import { cn, formatDateTime } from "@/lib/utils";

type DetailView = "overview" | "profile" | "access";

const views: Array<{ value: DetailView; label: string }> = [
  { value: "overview", label: "Tổng quan" },
  { value: "profile", label: "Hồ sơ" },
  { value: "access", label: "Quyền truy cập" },
];

function detailView(value: string | null): DetailView {
  return value === "profile" || value === "access" ? value : "overview";
}

function statusClass(status: AccountStatus) {
  if (status === "ACTIVE") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "SUSPENDED") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3.5">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1.5 break-words text-xs font-bold leading-5",
          mono && "font-mono text-[0.68rem]",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function IdentityUserDetail({ userId }: { userId: string }) {
  const { hasPermission } = useAccess();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = detailView(searchParams.get("view"));

  const canReadRoles = hasPermission("identity.roles.read");
  const canEditProfile = hasPermission("identity.users.manage-profile");
  const canManageStatus = hasPermission("identity.users.manage-status");
  const canAssignRole = hasPermission("identity.roles.assign");
  const canInvite = hasPermission("identity.users.invite");

  const [user, setUser] = useState<UserDetail | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [status, setStatus] = useState<AccountStatus>("ACTIVE");

  const groupedPermissions = useMemo(
    () => groupPermissionCodes(user?.permissions ?? []),
    [user?.permissions],
  );

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getUser(userId);
      setUser(detail);
      setStatus(detail.status);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải tài khoản.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadRoles = useCallback(async () => {
    if (!canReadRoles) {
      setRoles([]);
      return;
    }
    try {
      setRoles(await getRoles());
    } catch {
      setRoles([]);
    }
  }, [canReadRoles]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void loadUser();
      void loadRoles();
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadRoles, loadUser]);

  function setView(view: DetailView) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "overview") params.delete("view");
    else params.set("view", view);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !canEditProfile) return;

    const form = new FormData(event.currentTarget);
    setSaving("profile");
    try {
      await updateUserProfile(user.userId, {
        firstName: String(form.get("firstName") ?? "").trim() || null,
        lastName: String(form.get("lastName") ?? "").trim() || null,
        displayName: String(form.get("displayName") ?? "").trim() || null,
        gender: String(form.get("gender") ?? "UNSPECIFIED") as Gender,
        dateOfBirth: String(form.get("dateOfBirth") ?? "").trim() || null,
        avatarUrl: String(form.get("avatarUrl") ?? "").trim() || null,
      });
      toast.success("Đã cập nhật hồ sơ người dùng.");
      await loadUser();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function changeStatus() {
    if (!user || !canManageStatus || status === user.status) return;

    if (
      status !== "ACTIVE" &&
      !window.confirm(
        `Chuyển tài khoản sang ${accountLabels[status]}? Hệ thống sẽ thu hồi các phiên đăng nhập đang hoạt động.`,
      )
    ) {
      setStatus(user.status);
      return;
    }

    setSaving("status");
    try {
      await updateUserStatus(user.userId, status);
      toast.success(`Đã chuyển trạng thái sang ${accountLabels[status]}.`);
      await loadUser();
    } catch (reason) {
      setStatus(user.status);
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Không thể cập nhật trạng thái.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function assignRole() {
    if (!user || !selectedRole || !canAssignRole) return;
    setSaving("assign-role");
    try {
      if (!isIdentityAssignableRole(selectedRole)) {
        toast.error("Vai trò Đối tác gửi hàng được đồng bộ theo trạng thái hồ sơ đối tác, không gán thủ công.");
        return;
      }
      await assignUserRole(user.userId, selectedRole);
      toast.success(`Đã gán vai trò ${rolePresentation(selectedRole).name}.`);
      setSelectedRole("");
      await loadUser();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể gán vai trò.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function removeRole(roleCode: string) {
    if (!user || !canAssignRole) return;
    const roleName = rolePresentation(roleCode).name;
    if (!window.confirm(`Gỡ vai trò ${roleName} khỏi tài khoản này?`)) return;

    setSaving(`remove-role:${roleCode}`);
    try {
      if (!isIdentityAssignableRole(roleCode)) {
        toast.error("Vai trò Đối tác gửi hàng phải được thay đổi thông qua trạng thái hồ sơ đối tác.");
        return;
      }
      await removeUserRole(user.userId, roleCode);
      toast.success(`Đã gỡ vai trò ${roleName}.`);
      await loadUser();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể gỡ vai trò.",
      );
    } finally {
      setSaving(null);
    }
  }

  async function sendInvitation() {
    if (!user || !canInvite) return;
    setSaving("invite");
    try {
      await inviteUser(user.userId);
      toast.success("Đã yêu cầu gửi lời mời đến người dùng.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể gửi lời mời.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[55vh] place-items-center rounded-xl border bg-card">
        <div className="text-center">
          <LoaderCircleIcon className="mx-auto size-6 animate-spin text-brand" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            Đang tải hồ sơ tài khoản...
          </p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="grid min-h-[55vh] place-items-center rounded-xl border border-dashed p-8 text-center">
        <div>
          <p className="font-black">Không thể tải tài khoản</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "Tài khoản không tồn tại."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/identity/users"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-xs font-bold hover:bg-muted"
            >
              <ArrowLeftIcon className="size-4" /> Danh sách
            </Link>
            <Button variant="outline" onClick={() => void loadUser()}>
              <RefreshCwIcon className="size-4" /> Thử lại
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const availableRoles = roles.filter(
    (role) =>
      !user.roles.includes(role.code) && isIdentityAssignableRole(role.code),
  );

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href="/identity/users"
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border bg-background transition hover:bg-muted"
              aria-label="Quay lại danh sách tài khoản"
            >
              <ArrowLeftIcon className="size-4" />
            </Link>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-sm font-black text-brand sm:size-12">
              {initialsOf(user)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
                  Tài khoản / Người dùng
                </p>
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-black", statusClass(user.status))}>
                  {accountLabels[user.status]}
                </span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[0.58rem] font-black text-emerald-700 dark:text-emerald-300">
                    <BadgeCheckIcon className="size-3" /> Đã xác minh email
                  </span>
                ) : null}
              </div>
              <h1 className="mt-1 truncate text-xl font-black sm:text-2xl">{displayUserName(user)}</h1>
              <p className="mt-1 break-all text-xs text-muted-foreground sm:text-sm">{user.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.roles.map((role) => (
                  <span key={role} className="rounded-full bg-brand/10 px-2 py-1 text-[0.58rem] font-black text-brand">
                    {rolePresentation(role).name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadUser()}>
              <RefreshCwIcon className="size-4" /> Tải lại
            </Button>
            {canInvite ? (
              <Button variant="outline" onClick={() => void sendInvitation()} disabled={saving === "invite"}>
                {saving === "invite" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <MailPlusIcon className="size-4" />}
                Gửi lời mời
              </Button>
            ) : null}
          </div>
        </div>

        <div className="scrollbar-none flex overflow-x-auto border-t bg-muted/25 px-2 sm:px-4">
          {views.map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => setView(view.value)}
              className={cn(
                "relative h-11 shrink-0 px-3 text-xs font-bold transition sm:px-4",
                activeView === view.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {view.label}
              {activeView === view.value ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand sm:inset-x-4" /> : null}
            </button>
          ))}
        </div>
      </section>

      {activeView === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <Card>
            <CardHeader><p className="text-sm font-black">Thông tin tài khoản</p></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Fact label="Email" value={user.email} />
              <Fact label="Xác minh email" value={user.emailVerified ? "Đã xác minh" : "Chưa xác minh"} />
              <Fact label="Trạng thái tài khoản" value={accountLabels[user.status]} />
              <Fact label="Trạng thái hồ sơ" value={profileLabels[user.profileStatus]} />
              <Fact label="Giới tính" value={user.gender ? genderLabels[user.gender as Gender] ?? user.gender : "Chưa khai báo"} />
              <Fact label="Ngày sinh" value={user.dateOfBirth ?? "Chưa khai báo"} />
              <Fact label="Mã định danh người dùng" value={user.userId} mono />
              <Fact label="Phiên bản" value={String(user.version)} mono />
              <Fact label="Vai trò" value={user.roles.length ? user.roles.map((role) => rolePresentation(role).name).join(", ") : "Chưa có vai trò"} />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader><p className="text-sm font-black">Dấu thời gian</p></CardHeader>
            <CardContent className="space-y-3">
              <Fact label="Tạo tài khoản" value={formatDateTime(user.createdAt)} />
              <Fact label="Cập nhật tài khoản" value={formatDateTime(user.updatedAt)} />
              <Fact label="Tạo hồ sơ" value={user.profileCreatedAt ? formatDateTime(user.profileCreatedAt) : "Chưa tạo hồ sơ"} />
              <Fact label="Cập nhật hồ sơ" value={user.profileUpdatedAt ? formatDateTime(user.profileUpdatedAt) : "—"} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeView === "profile" ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCogIcon className="size-4 text-brand" />
                <div>
                  <p className="text-sm font-black">Hồ sơ người dùng</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">Cập nhật thông tin hồ sơ của tài khoản.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form key={user.updatedAt} onSubmit={saveProfile} className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold">Tên<Input name="firstName" maxLength={100} defaultValue={user.firstName ?? ""} disabled={!canEditProfile} /></label>
                  <label className="grid gap-2 text-xs font-bold">Họ<Input name="lastName" maxLength={100} defaultValue={user.lastName ?? ""} disabled={!canEditProfile} /></label>
                </div>
                <label className="grid gap-2 text-xs font-bold">Tên hiển thị<Input name="displayName" maxLength={200} defaultValue={user.displayName ?? ""} disabled={!canEditProfile} /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold">
                    Giới tính
                    <select name="gender" defaultValue={user.gender ?? "UNSPECIFIED"} disabled={!canEditProfile} className="h-9 rounded-md border bg-background px-3 text-sm disabled:opacity-60">
                      {genders.map((item) => <option key={item} value={item}>{genderLabels[item]}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-bold">Ngày sinh<Input name="dateOfBirth" type="date" defaultValue={user.dateOfBirth ?? ""} disabled={!canEditProfile} /></label>
                </div>
                <label className="grid gap-2 text-xs font-bold">Đường dẫn ảnh đại diện<Input name="avatarUrl" type="url" maxLength={2048} defaultValue={user.avatarUrl ?? ""} disabled={!canEditProfile} placeholder="https://..." /></label>
                {canEditProfile ? (
                  <div className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={saving === "profile"}>
                      {saving === "profile" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CheckCircle2Icon className="size-4" />}
                      Lưu hồ sơ
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">Bạn chỉ có quyền xem hồ sơ.</p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader><p className="text-sm font-black">Điều kiện hồ sơ hoàn chỉnh</p></CardHeader>
            <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
              <Fact label="Trạng thái hồ sơ" value={profileLabels[user.profileStatus]} />
              <p>Hồ sơ ở trạng thái Đã hoàn tất phải có đủ họ, tên, giới tính đã chọn và ngày sinh. Hệ thống sẽ từ chối thay đổi nếu làm thiếu các thông tin bắt buộc này.</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeView === "access" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><ShieldCheckIcon className="size-4 text-brand" /><p className="text-sm font-black">Trạng thái tài khoản</p></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <select value={status} onChange={(event) => setStatus(event.target.value as AccountStatus)} disabled={!canManageStatus} className="h-10 rounded-md border bg-background px-3 text-sm disabled:opacity-60">
                  {accountStatuses.map((item) => <option key={item} value={item}>{accountLabels[item]}</option>)}
                </select>
                {canManageStatus ? (
                  <Button onClick={() => void changeStatus()} disabled={saving === "status" || status === user.status}>
                    {saving === "status" ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                    Cập nhật
                  </Button>
                ) : null}
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                Tạm khóa hoặc Vô hiệu hóa sẽ làm hệ thống thu hồi phiên đăng nhập. Hệ thống cũng không cho khóa quản trị viên đang hoạt động cuối cùng.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldPlusIcon className="size-4 text-brand" />
                <div>
                  <p className="text-sm font-black">Vai trò</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    Hiển thị vai trò hiện có và cách mỗi vai trò được cấp cho tài khoản.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                {user.roles.length ? (
                  user.roles.map((roleCode) => {
                    const presentation = rolePresentation(roleCode);
                    const removable =
                      canAssignRole && isIdentityAssignableRole(roleCode);
                    return (
                      <div
                        key={roleCode}
                        className="flex items-start gap-3 rounded-lg border bg-muted/15 p-3"
                      >
                        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-brand" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black">
                              {presentation.name}
                            </p>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[0.58rem] font-black text-muted-foreground">
                              {presentation.ownershipLabel}
                            </span>
                          </div>
                          <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                            {presentation.description}
                          </p>
                          {presentation.note ? (
                            <p className="mt-1 text-[0.65rem] leading-5 text-muted-foreground">
                              {presentation.note}
                            </p>
                          ) : null}
                        </div>
                        {removable ? (
                          <button
                            type="button"
                            onClick={() => void removeRole(roleCode)}
                            disabled={saving === `remove-role:${roleCode}`}
                            className="grid size-8 shrink-0 place-items-center rounded-md border transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            aria-label={`Gỡ vai trò ${presentation.name}`}
                          >
                            {saving === `remove-role:${roleCode}` ? (
                              <LoaderCircleIcon className="size-3 animate-spin" />
                            ) : (
                              <ShieldMinusIcon className="size-3.5" />
                            )}
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-muted-foreground">Chưa có vai trò.</span>
                )}
              </div>

              {canAssignRole && canReadRoles ? (
                <div className="grid gap-2 border-t pt-4 sm:grid-cols-[1fr_auto]">
                  <select
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    className="h-10 min-w-0 rounded-md border bg-background px-3 text-xs"
                  >
                    <option value="">Chọn vai trò để gán</option>
                    {availableRoles.map((role) => (
                      <option key={role.code} value={role.code}>
                        {rolePresentation(role.code, role).name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => void assignRole()}
                    disabled={!selectedRole || saving === "assign-role"}
                  >
                    {saving === "assign-role" ? (
                      <LoaderCircleIcon className="size-4 animate-spin" />
                    ) : (
                      <ShieldPlusIcon className="size-4" />
                    )}
                    Gán vai trò
                  </Button>
                </div>
              ) : canAssignRole ? (
                <p className="text-xs text-muted-foreground">
                  Tài khoản hiện tại chưa có quyền xem danh mục vai trò để thực hiện phân vai.
                </p>
              ) : null}

              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[0.68rem] leading-5 text-muted-foreground">
                Vai trò Đối tác gửi hàng không xuất hiện trong danh sách gán hoặc gỡ thủ công. Vai trò này được đồng bộ theo trạng thái hồ sơ đối tác để tránh lệch quyền giữa các phần của hệ thống.
              </p>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">Quyền đang có</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    Hệ thống tổng hợp quyền từ tất cả vai trò hiện tại và nhóm theo nghiệp vụ để dễ kiểm tra.
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-black">
                  {user.permissions.length} quyền
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {groupedPermissions.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {groupedPermissions.map((group) => (
                    <section key={group.id} className="rounded-lg border bg-muted/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black">{group.label}</h3>
                        <span className="text-[0.62rem] font-bold text-muted-foreground">
                          {group.permissions.length}
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1.5">
                        {group.permissions.map((permission) => (
                          <div key={permission.code} className="rounded-md bg-background p-2">
                            <p className="text-[0.68rem] font-bold">
                              {permissionLabel(permission.code)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Tài khoản chưa có quyền nào.</span>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5 text-[0.65rem] text-muted-foreground">
        <span className="flex items-center gap-1.5"><CalendarDaysIcon className="size-3.5" /> Tạo {formatDateTime(user.createdAt)}</span>
        <span className="flex items-center gap-1.5"><RefreshCwIcon className="size-3.5" /> Cập nhật {formatDateTime(user.updatedAt)}</span>
      </footer>
    </div>
  );
}
