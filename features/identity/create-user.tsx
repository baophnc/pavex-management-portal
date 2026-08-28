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
  type CreateUserResponse,
  type Gender,
  type RoleItem,
} from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";

const genderLabels: Record<Gender, string> = {
  UNSPECIFIED: "Chưa xác định",
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

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
      const value = (await apiRequest("roles")) as RoleItem[];
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

    setSaving(true);
    setError(null);
    try {
      const created = (await apiRequest("users", {
        method: "POST",
        body: JSON.stringify({
          email,
          roleCode: normalizedRole,
          firstName: optionalText(form.get("firstName")),
          lastName: optionalText(form.get("lastName")),
          displayName: optionalText(form.get("displayName")),
          gender,
          dateOfBirth: optionalText(form.get("dateOfBirth")),
          avatarUrl: optionalText(form.get("avatarUrl")),
        }),
      })) as CreateUserResponse;

      toast.success("Đã tạo tài khoản và gửi invitation khởi tạo.");
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
              Backend yêu cầu đồng thời identity.users.create và identity.roles.assign.
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
            aria-label="Quay lại danh sách user"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border bg-background transition hover:bg-muted"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
            <UserPlusIcon className="size-5" />
          </span>
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
              Identity / Create
            </p>
            <h1 className="mt-1 text-xl font-black sm:text-2xl">Tạo tài khoản mới</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Backend tạo account, gán role ban đầu và provision invitation. Management không đặt mật khẩu thay người dùng.
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
                <Input name="email" type="email" required maxLength={255} placeholder="user@pavex.vn" />
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
                  <Input name="dateOfBirth" type="date" max={new Date().toISOString().slice(0, 10)} />
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
                  {roles.map((role) => <option key={role.id} value={role.code}>{role.name} ({role.code})</option>)}
                </select>
              ) : (
                <label className="grid gap-2 text-xs font-bold">
                  Role code
                  <Input value={roleCode} onChange={(event) => setRoleCode(event.target.value.toUpperCase())} placeholder="ADMIN" />
                </label>
              )}

              {selectedRole ? (
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p className="text-xs font-black">{selectedRole.name}</p>
                  <p className="mt-1 font-mono text-[0.65rem] text-brand">{selectedRole.code}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedRole.description ?? `${selectedRole.permissions.length} quyền`}</p>
                </div>
              ) : null}

              <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                Sau khi tạo, backend tự provision invitation credential. Nếu cần gửi lại email invitation, dùng nút ở trang chi tiết user.
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
