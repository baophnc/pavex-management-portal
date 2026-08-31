"use client";

import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  WorkflowIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRoles } from "@/features/identity/api";
import type { PermissionItem, RoleItem } from "@/features/identity/contracts";
import {
  groupPermissions,
  permissionLabels,
  rolePresentation,
} from "@/features/identity/presentation";
import { cn } from "@/lib/utils";

export function IdentityRoles() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRoles();
      if (!Array.isArray(result)) {
        throw new Error("Dữ liệu vai trò không đúng định dạng.");
      }
      setRoles(result);
      setSelectedRoleCode((current) =>
        current && result.some((role) => role.code === current)
          ? current
          : (result[0]?.code ?? ""),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải danh sách vai trò.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.code === selectedRoleCode) ?? null,
    [roles, selectedRoleCode],
  );

  const groupedPermissions = useMemo(() => {
    if (!selectedRole) return [];
    const needle = query.trim().toLowerCase();
    const filtered = selectedRole.permissions.filter((permission) => {
      if (!needle) return true;
      return `${permissionLabels[permission.code] ?? permission.name} ${permission.name} ${permission.code} ${permission.description ?? ""}`
        .toLowerCase()
        .includes(needle);
    });
    return groupPermissions(filtered);
  }, [query, selectedRole]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
                <ShieldCheckIcon className="size-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-black tracking-[0.16em] text-brand uppercase">
                  Identity RBAC catalog
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Vai trò và quyền hạn
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Đây là catalog read-only từ Identity. Management chỉ gán role cho
              user; không tạo/sửa/xóa role hoặc permission vì backend hiện không
              expose CRUD catalog.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-4" />
            )}
            Tải lại
          </Button>
        </div>
      </section>

      <Card className="border-brand/15 bg-brand/[0.035]">
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PolicyFact
            title="Identity-managed"
            body="ADMIN, Operations, Hub, Warehouse và Driver có thể được admin gán trực tiếp theo permission identity.roles.assign."
          />
          <PolicyFact
            title="Partners-managed"
            body="MERCHANT phải đi qua xét duyệt Merchant. Partners outbox đồng bộ role này sang Identity; UI không gán/gỡ thủ công."
          />
          <PolicyFact
            title="Catalog read-only"
            body="Màn này phản ánh role/permission seed thật của backend, không giả lập CRUD chưa tồn tại."
          />
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 p-4 text-sm font-bold text-destructive">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-black">Danh sách vai trò</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {roles.length} vai trò trong Identity
            </p>
          </div>
          <div className="grid gap-1 p-2">
            {loading ? (
              <div className="grid min-h-40 place-items-center">
                <LoaderCircleIcon className="animate-spin text-brand" />
              </div>
            ) : roles.length ? (
              roles.map((role) => {
                const content = rolePresentation(role.code, role);
                const selected = role.code === selectedRoleCode;
                return (
                  <button
                    type="button"
                    key={role.id}
                    onClick={() => setSelectedRoleCode(role.code)}
                    className={cn(
                      "rounded-lg border p-3 text-left transition",
                      selected
                        ? "border-brand/30 bg-brand/10 shadow-sm"
                        : "border-transparent hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black">{content.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {content.description}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-bold text-muted-foreground">
                        {role.permissions.length}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.58rem] text-muted-foreground">
                        {role.code}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[0.58rem] font-black text-muted-foreground">
                        {content.ownershipLabel}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Chưa có vai trò.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {selectedRole ? (
            <RoleDetail
              role={selectedRole}
              query={query}
              onQueryChange={setQuery}
              groups={groupedPermissions}
            />
          ) : (
            <Card className="grid min-h-64 place-items-center p-8 text-center text-sm text-muted-foreground">
              {loading ? "Đang tải vai trò..." : "Chọn một vai trò để xem quyền hạn."}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleDetail({
  role,
  query,
  onQueryChange,
  groups,
}: {
  role: RoleItem;
  query: string;
  onQueryChange: (value: string) => void;
  groups: ReturnType<typeof groupPermissions>;
}) {
  const content = rolePresentation(role.code, role);

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs font-black text-brand uppercase">
                {role.code}
              </p>
              <h2 className="mt-1 text-xl font-black">{content.name}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {content.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] font-bold">
                <span className="rounded-full border bg-muted/25 px-2.5 py-1">
                  {content.ownershipLabel}
                </span>
                <span className="rounded-full border bg-muted/25 px-2.5 py-1">
                  {role.isSystem ? "System role" : "Custom role"}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1",
                    content.assignableFromIdentity
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  )}
                >
                  {content.assignableFromIdentity
                    ? "Có thể gán từ Identity UI"
                    : "Không gán thủ công"}
                </span>
              </div>
              {content.note ? (
                <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground">
                  {content.note}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
              <p className="text-2xl font-black text-brand">
                {role.permissions.length}
              </p>
              <p className="text-[0.65rem] font-bold text-muted-foreground">
                quyền được cấp
              </p>
            </div>
          </div>

          <label className="relative mt-4 block">
            <span className="sr-only">Tìm quyền</span>
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="pl-9"
              placeholder="Tìm quyền theo chức năng hoặc mã permission..."
            />
          </label>
        </CardContent>
      </Card>

      {groups.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent>
                <div className="flex items-center gap-2">
                  <KeyRoundIcon className="size-4 text-brand" />
                  <h3 className="text-sm font-black">{group.label}</h3>
                  <span className="ml-auto text-xs font-bold text-muted-foreground">
                    {group.permissions.length}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {group.permissions.map((permission) => (
                    <PermissionRow key={permission.id} permission={permission} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Không có quyền phù hợp với từ khóa.
        </Card>
      )}
    </>
  );
}

function PermissionRow({ permission }: { permission: PermissionItem }) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/10 p-2.5">
      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-xs font-bold">
          {permissionLabels[permission.code] ?? permission.name}
        </p>
        <p
          className="mt-0.5 break-all font-mono text-[0.6rem] text-brand"
          title={permission.code}
        >
          {permission.code}
        </p>
        {permission.description ? (
          <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
            {permission.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PolicyFact({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-2">
      <WorkflowIcon className="mt-0.5 size-4 shrink-0 text-brand" />
      <div>
        <p className="text-xs font-black">{title}</p>
        <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
