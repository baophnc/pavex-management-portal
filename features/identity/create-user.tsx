"use client";

import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  genders,
  type Gender,
  type RoleItem,
} from "@/features/identity/contracts";
import { createUser, getRoles } from "@/features/identity/api";
import {
  genderLabels,
  isIdentityAssignableRole,
  rolePresentation,
} from "@/features/identity/presentation";

function optionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export function CreateIdentityUser() {
  const router = useRouter();
  const { hasPermission } = useAccess();
  const canCreate =
    hasPermission("identity.users.create") &&
    hasPermission("identity.roles.assign");
  const canReadRoles = hasPermission("identity.roles.read");

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [rolesLoading, setRolesLoading] = useState(canReadRoles);
  const [roleCode, setRoleCode] = useState("");
  const [gender, setGender] = useState<Gender>("UNSPECIFIED");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    if (!canReadRoles) return;
    setRolesLoading(true);
    try {
      const value = await getRoles();
      setRoles(value);
      if (value.length === 1) setRoleCode(value[0].code);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách vai trò.",
      );
    } finally {
      setRolesLoading(false);
    }
  }, [canReadRoles]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadRoles(), 0);
    return () => window.clearTimeout(task);
  }, [loadRoles]);

  const selectedRole = useMemo(
    () => roles.find((item) => item.code === roleCode) ?? null,
    [roleCode, roles],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || saving) return;

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const normalizedRole = roleCode.trim().toUpperCase();

    if (!email) {
      setError("Email là bắt buộc.");
      return;
    }
    if (!normalizedRole) {
      setError("Hãy chọn vai trò ban đầu.");
      return;
    }
    if (!isIdentityAssignableRole(normalizedRole)) {
      setError(
        "Vai trò Đối tác gửi hàng được đồng bộ sau khi hồ sơ đối tác được duyệt; không gán thủ công tại màn tài khoản.",
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createUser({
        email,
        roleCode: normalizedRole,
        firstName: optionalText(form.get("firstName")),
        lastName: optionalText(form.get("lastName")),
        displayName: optionalText(form.get("displayName")),
        gender,
        dateOfBirth: optionalText(form.get("dateOfBirth")),
        avatarUrl: optionalText(form.get("avatarUrl")),
      });

      toast.success("Đã tạo tài khoản và chuẩn bị lời mời kích hoạt.");
      router.push(`/identity/users/${created.userId}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo tài khoản.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canCreate) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="grid min-h-72 place-items-center p-8 text-center">
          <div className="max-w-md">
            <ShieldCheckIcon className="mx-auto size-10 text-muted-foreground" />
            <h1 className="mt-4 text-lg font-black">Không đủ quyền tạo tài khoản</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Bạn cần đồng thời quyền tạo tài khoản và quyền phân vai để thực hiện thao tác này.
            </p>
            <Link
              href="/identity/users"
              className="mt-5 inline-flex h-9 items-center rounded-md border px-3.5 text-xs font-bold hover:bg-muted"
            >
              Quay lại danh sách
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-start gap-3 bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5">
          <Link
            href="/identity/users"
            aria-label="Quay lại danh sách tài khoản"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border bg-background transition hover:bg-muted"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
            <UserPlusIcon className="size-5" />
          </span>
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
              Tài khoản / Tạo mới
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Tạo tài khoản mới</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Hệ thống tạo tài khoản, gán vai trò ban đầu và chuẩn bị lời mời kích hoạt. Quản trị viên không đặt mật khẩu thay người dùng.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader><p className="text-sm font-black">Thông tin tài khoản</p></CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-2 text-xs font-bold">
                Email <span className="text-destructive">*</span>
                <Input name="email" type="email" required maxLength={255} placeholder="nguoidung@pavex.vn" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold">
                  Tên
                  <Input name="firstName" maxLength={100} />
                </label>
                <label className="grid gap-2 text-xs font-bold">
                  Họ
                  <Input name="lastName" maxLength={100} />
                </label>
              </div>
              <label className="grid gap-2 text-xs font-bold">
                Tên hiển thị
                <Input name="displayName" maxLength={200} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-bold">
                  Giới tính
                  <select
                    value={gender}
                    onChange={(event) => setGender(event.target.value as Gender)}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {genders.map((item) => <option key={item} value={item}>{genderLabels[item]}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold">
                  Ngày sinh
                  <Input name="dateOfBirth" type="date" />
                </label>
              </div>
              <label className="grid gap-2 text-xs font-bold">
                Avatar URL
                <Input name="avatarUrl" type="url" maxLength={2048} placeholder="https://..." />
              </label>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><p className="text-sm font-black">Vai trò ban đầu</p></CardHeader>
            <CardContent className="space-y-4">
              {canReadRoles ? (
                <select
                  value={roleCode}
                  onChange={(event) => setRoleCode(event.target.value)}
                  disabled={rolesLoading}
                  className="h-10 w-full rounded-md border bg-background px-3 text-xs font-bold disabled:opacity-60"
                >
                  <option value="">{rolesLoading ? "Đang tải vai trò..." : "Chọn vai trò"}</option>
                  {roles.map((role) => {
                    const presentation = rolePresentation(role.code, role);
                    return (
                      <option
                        key={role.id}
                        value={role.code}
                        disabled={!presentation.assignableFromIdentity}
                      >
                        {presentation.name}
                        {!presentation.assignableFromIdentity ? " · đồng bộ tự động" : ""}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                  Tài khoản hiện tại chưa có quyền xem danh mục vai trò nên
                  không thể chọn vai trò ban đầu. Hãy bổ sung quyền xem vai trò
                  trước khi tạo tài khoản.
                </div>
              )}

              {selectedRole ? (
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs font-black">{rolePresentation(selectedRole.code, selectedRole).name}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {rolePresentation(selectedRole.code, selectedRole).description}
                  </p>
                  <p className="mt-2 text-[0.65rem] font-bold text-muted-foreground">
                    {selectedRole.permissions.length} quyền · {rolePresentation(selectedRole.code, selectedRole).ownershipLabel}
                  </p>
                </div>
              ) : null}

              <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                Sau khi tạo, hệ thống chuẩn bị thông tin kích hoạt tài khoản. Nếu cần gửi lại thư mời, dùng nút ở trang chi tiết tài khoản.
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                Không dùng màn tài khoản để cấp vai trò Đối tác gửi hàng. Người dùng cần hoàn tất hồ sơ đối tác và được duyệt tại mục Đối tác; hệ thống sẽ đồng bộ vai trò này tự động.
              </div>
            </CardContent>
          </Card>

          {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{error}</p> : null}

          <Button type="submit" size="lg" className="w-full" disabled={saving || !roleCode}>
            {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <CheckCircle2Icon className="size-4" />}
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </div>
  );
}
