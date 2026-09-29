"use client";

import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  WorkflowIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  createRole,
  deleteRole,
  getPermissions,
  getRoles,
  replaceRolePermissions,
  updateRole,
} from "@/features/identity/api";
import type { PermissionItem, RoleItem } from "@/features/identity/contracts";
import {
  groupPermissions,
  permissionLabel,
  rolePresentation,
} from "@/features/identity/presentation";
import { cn } from "@/lib/utils";

function normalizeRoleCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

function sameCodes(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length) return false;
  const target = new Set(right);
  return left.every((code) => target.has(code));
}

function reasonMessage(reason: unknown, fallback: string) {
  return reason instanceof Error ? reason.message : fallback;
}

export function IdentityRoles() {
  const { hasPermission, hasRole } = useAccess();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState("");
  const [query, setQuery] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManage = hasPermission("identity.roles.manage");
  const canSeeTechnical = hasRole("ADMIN");

  const load = useCallback(async (preferredRoleCode?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [roleResult, permissionResult] = await Promise.all([
        getRoles(),
        getPermissions(),
      ]);
      if (!Array.isArray(roleResult) || !Array.isArray(permissionResult)) {
        throw new Error("Dữ liệu vai trò hoặc permission không đúng định dạng.");
      }
      setRoles(roleResult);
      setPermissions(permissionResult);
      setSelectedRoleCode((current) => {
        const preferred = preferredRoleCode ?? current;
        return preferred && roleResult.some((role) => role.code === preferred)
          ? preferred
          : (roleResult[0]?.code ?? "");
      });
    } catch (reason) {
      setError(reasonMessage(reason, "Không thể tải danh sách vai trò."));
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
      return `${permissionLabel(permission.code)} ${permission.name} ${permission.code}`
        .toLowerCase()
        .includes(needle);
    });
    return groupPermissions(filtered);
  }, [query, selectedRole]);

  function replaceLocalRole(updated: RoleItem) {
    setRoles((current) =>
      current.map((role) => (role.id === updated.id ? updated : role)),
    );
    setSelectedRoleCode(updated.code);
  }

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
                  Phân quyền tài khoản
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Vai trò & quyền hạn
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              Permission là capability do backend định nghĩa và chỉ đọc. Management
              chỉ cho phép tạo, chỉnh sửa và gán permission cho vai trò tùy chỉnh;
              vai trò hệ thống luôn được khóa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                onClick={() => setShowCreate((current) => !current)}
                variant={showCreate ? "outline" : "default"}
              >
                {showCreate ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
                {showCreate ? "Đóng form" : "Tạo vai trò"}
              </Button>
            ) : null}
            {canSeeTechnical ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTechnical((current) => !current)}
              >
                <KeyRoundIcon className="size-4" />
                {showTechnical ? "Ẩn kỹ thuật" : "Dữ liệu kỹ thuật"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />
              Tải lại
            </Button>
          </div>
        </div>

        <div className="grid gap-0 border-b md:grid-cols-3">
          <PolicyFact
            title="Permission là read-only"
            body="Frontend lấy catalog từ Identity; không có thao tác tạo, sửa hoặc xóa permission tùy ý."
          />
          <PolicyFact
            title="System role được khóa"
            body="Các vai trò nền tảng không thể đổi metadata, permission matrix hoặc xóa khỏi Management."
          />
          <PolicyFact
            title="Custom role quản trị được"
            body="Người có identity.roles.manage có thể tạo role, chỉnh metadata, thay permission và xóa khi chưa được sử dụng."
          />
        </div>
      </section>

      {showCreate && canManage ? (
        <CreateRoleCard
          permissions={permissions}
          onCancel={() => setShowCreate(false)}
          onCreated={async (created) => {
            setShowCreate(false);
            toast.success(`Đã tạo vai trò ${created.name}.`);
            await load(created.code);
          }}
        />
      ) : null}

      {error ? (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-destructive">{error}</p>
            <Button variant="outline" onClick={() => void load()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="overflow-hidden xl:sticky xl:top-24 xl:self-start">
          <div className="border-b bg-muted/30 px-4 py-3">
            <p className="text-sm font-black">Danh sách vai trò</p>
            <p className="mt-1 text-[0.68rem] text-muted-foreground">
              {loading && !roles.length ? "Đang tải…" : `${roles.length} vai trò đang được sử dụng`}
            </p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {roles.length ? (
              roles.map((role) => {
                const content = rolePresentation(role.code, role);
                const active = role.code === selectedRoleCode;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleCode(role.code)}
                    className={cn(
                      "mb-1 w-full rounded-lg border p-3 text-left transition last:mb-0",
                      active
                        ? "border-brand/30 bg-brand/[0.06]"
                        : "border-transparent hover:border-border hover:bg-muted/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">{content.name}</p>
                        <p className="mt-1 line-clamp-2 text-[0.68rem] leading-5 text-muted-foreground">
                          {role.description || content.description}
                        </p>
                      </div>
                      {role.isSystem ? (
                        <LockKeyholeIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[0.62rem] font-bold text-muted-foreground">
                      <span>{role.isSystem ? "Hệ thống" : "Tùy chỉnh"}</span>
                      <span>{role.permissions.length} quyền</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="p-6 text-center text-xs text-muted-foreground">
                {loading ? "Đang tải vai trò…" : "Chưa có vai trò."}
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {selectedRole ? (
            <RoleDetail
              key={selectedRole.id}
              role={selectedRole}
              query={query}
              onQueryChange={setQuery}
              groups={groupedPermissions}
              permissionCatalog={permissions}
              canManage={canManage}
              onUpdated={replaceLocalRole}
              onDeleted={async () => {
                await load();
              }}
            />
          ) : (
            <Card className="grid min-h-64 place-items-center p-8 text-center text-sm text-muted-foreground">
              {loading ? "Đang tải vai trò…" : "Chọn một vai trò để xem quyền hạn."}
            </Card>
          )}
        </div>
      </div>

      {canSeeTechnical && showTechnical ? (
        <TechnicalCatalog roles={roles} selectedRoleCode={selectedRoleCode} />
      ) : null}
    </div>
  );
}

function CreateRoleCard({
  permissions,
  onCancel,
  onCreated,
}: {
  permissions: PermissionItem[];
  onCancel: () => void;
  onCreated: (role: RoleItem) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [permissionQuery, setPermissionQuery] = useState("");

  const visibleGroups = useMemo(() => {
    const needle = permissionQuery.trim().toLowerCase();
    const filtered = needle
      ? permissions.filter((permission) =>
          `${permissionLabel(permission.code)} ${permission.name} ${permission.code}`
            .toLowerCase()
            .includes(needle),
        )
      : permissions;
    return groupPermissions(filtered);
  }, [permissionQuery, permissions]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(code)) {
      toast.error("Mã vai trò phải gồm A-Z, 0-9, dấu gạch dưới và dài ít nhất 3 ký tự.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Tên vai trò phải có ít nhất 2 ký tự.");
      return;
    }

    setSaving(true);
    try {
      const created = await createRole({
        code,
        name: name.trim(),
        description: description.trim() || null,
        permissionCodes: [...selected].sort(),
      });
      await onCreated(created);
    } catch (reason) {
      toast.error(reasonMessage(reason, "Không thể tạo vai trò."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="overflow-hidden border-brand/25">
      <div className="border-b bg-brand/[0.04] px-4 py-3">
        <p className="text-sm font-black">Tạo vai trò tùy chỉnh</p>
        <p className="mt-1 text-[0.68rem] text-muted-foreground">
          Mã vai trò không đổi sau khi tạo. Permission được chọn từ catalog backend.
        </p>
      </div>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Mã vai trò">
              <Input
                value={code}
                onChange={(event) => setCode(normalizeRoleCode(event.target.value))}
                placeholder="CUSTOM_OPERATIONS"
                maxLength={64}
                required
              />
            </Field>
            <Field label="Tên hiển thị">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Điều phối viên khu vực"
                maxLength={128}
                required
              />
            </Field>
          </div>
          <Field label="Mô tả">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
              maxLength={512}
              placeholder="Mô tả phạm vi trách nhiệm của vai trò…"
            />
          </Field>

          <PermissionMatrix
            permissions={permissions}
            groups={visibleGroups}
            selected={selected}
            query={permissionQuery}
            onQueryChange={setPermissionQuery}
            onToggle={(permissionCode) =>
              setSelected((current) => {
                const next = new Set(current);
                if (next.has(permissionCode)) next.delete(permissionCode);
                else next.add(permissionCode);
                return next;
              })
            }
          />

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
              Tạo vai trò
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

function RoleDetail({
  role,
  query,
  onQueryChange,
  groups,
  permissionCatalog,
  canManage,
  onUpdated,
  onDeleted,
}: {
  role: RoleItem;
  query: string;
  onQueryChange: (value: string) => void;
  groups: ReturnType<typeof groupPermissions>;
  permissionCatalog: PermissionItem[];
  canManage: boolean;
  onUpdated: (role: RoleItem) => void;
  onDeleted: () => Promise<void>;
}) {
  const content = rolePresentation(role.code, role);
  const mutable = canManage && !role.isSystem;
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set(role.permissions.map((permission) => permission.code)),
  );
  const [permissionQuery, setPermissionQuery] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      setName(role.name);
      setDescription(role.description ?? "");
      setSelectedPermissions(new Set(role.permissions.map((permission) => permission.code)));
    }, 0);
    return () => window.clearTimeout(task);
  }, [role]);

  const permissionEditorGroups = useMemo(() => {
    const needle = permissionQuery.trim().toLowerCase();
    const filtered = needle
      ? permissionCatalog.filter((permission) =>
          `${permissionLabel(permission.code)} ${permission.name} ${permission.code}`
            .toLowerCase()
            .includes(needle),
        )
      : permissionCatalog;
    return groupPermissions(filtered);
  }, [permissionCatalog, permissionQuery]);

  const currentCodes = role.permissions.map((permission) => permission.code);
  const selectedCodes = [...selectedPermissions];
  const permissionsDirty = !sameCodes(currentCodes, selectedCodes);
  const metadataDirty =
    name.trim() !== role.name || (description.trim() || null) !== role.description;

  async function saveMetadata() {
    if (!mutable || !metadataDirty) return;
    if (name.trim().length < 2) {
      toast.error("Tên vai trò phải có ít nhất 2 ký tự.");
      return;
    }
    setSavingMeta(true);
    try {
      const updated = await updateRole(role.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onUpdated(updated);
      toast.success("Đã cập nhật thông tin vai trò.");
    } catch (reason) {
      toast.error(reasonMessage(reason, "Không thể cập nhật vai trò."));
    } finally {
      setSavingMeta(false);
    }
  }

  async function savePermissions() {
    if (!mutable || !permissionsDirty) return;
    setSavingPermissions(true);
    try {
      const updated = await replaceRolePermissions(role.id, selectedCodes.sort());
      onUpdated(updated);
      toast.success("Đã cập nhật permission matrix. User đang giữ role sẽ cần token mới để nhận quyền mới.");
    } catch (reason) {
      toast.error(reasonMessage(reason, "Không thể cập nhật permission."));
    } finally {
      setSavingPermissions(false);
    }
  }

  async function removeRole() {
    if (!mutable || deleting) return;
    if (!window.confirm(`Xóa vai trò tùy chỉnh “${role.name}”? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    setDeleting(true);
    try {
      await deleteRole(role.id);
      toast.success(`Đã xóa vai trò ${role.name}.`);
      await onDeleted();
    } catch (reason) {
      toast.error(reasonMessage(reason, "Không thể xóa vai trò. Vai trò có thể vẫn đang được gán cho user."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[0.62rem] font-black tracking-[0.14em] text-brand uppercase">
                  Vai trò tài khoản
                </p>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[0.58rem] font-black",
                  role.isSystem ? "bg-muted text-muted-foreground" : "bg-brand/10 text-brand",
                )}>
                  {role.isSystem ? "SYSTEM" : "CUSTOM"}
                </span>
              </div>
              <h2 className="mt-1 text-xl font-black">{role.name || content.name}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {role.description || content.description}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/15 p-3">
                  <p className="text-[0.62rem] font-black tracking-[0.12em] text-muted-foreground uppercase">
                    Cách cấp vai trò
                  </p>
                  <p className="mt-1 text-xs font-bold">{content.ownershipLabel}</p>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    {content.assignmentSummary}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/15 p-3">
                  <p className="text-[0.62rem] font-black tracking-[0.12em] text-muted-foreground uppercase">
                    Chính sách chỉnh sửa
                  </p>
                  <p className="mt-1 text-xs font-bold">
                    {role.isSystem ? "Khóa bởi backend" : canManage ? "Có thể quản trị" : "Chỉ đọc"}
                  </p>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    {role.isSystem
                      ? "System role không thể đổi metadata, permission hoặc xóa."
                      : canManage
                        ? "Bạn có identity.roles.manage để quản trị vai trò này."
                        : "Tài khoản hiện tại thiếu identity.roles.manage."}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
              <p className="text-2xl font-black text-brand">{role.permissions.length}</p>
              <p className="text-[0.65rem] font-bold text-muted-foreground">quyền được cấp</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {mutable ? (
        <Card>
          <div className="border-b bg-muted/30 px-4 py-3">
            <p className="text-sm font-black">Thông tin vai trò</p>
            <p className="mt-1 text-[0.68rem] text-muted-foreground">
              Mã kỹ thuật <span className="font-mono">{role.code}</span> là bất biến; chỉ tên và mô tả được chỉnh sửa.
            </p>
          </div>
          <CardContent className="space-y-3">
            <Field label="Tên hiển thị">
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={128} />
            </Field>
            <Field label="Mô tả">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-20 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                maxLength={512}
              />
            </Field>
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="destructive" onClick={() => void removeRole()} disabled={deleting}>
                {deleting ? <LoaderCircleIcon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                Xóa vai trò
              </Button>
              <Button type="button" onClick={() => void saveMetadata()} disabled={!metadataDirty || savingMeta}>
                {savingMeta ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
                Lưu thông tin
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mutable ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-black">Permission matrix</p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {selectedPermissions.size}/{permissionCatalog.length} permission được chọn.
              </p>
            </div>
            <Button type="button" onClick={() => void savePermissions()} disabled={!permissionsDirty || savingPermissions}>
              {savingPermissions ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Lưu permission
            </Button>
          </div>
          <CardContent>
            <PermissionMatrix
              permissions={permissionCatalog}
              groups={permissionEditorGroups}
              selected={selectedPermissions}
              query={permissionQuery}
              onQueryChange={setPermissionQuery}
              onToggle={(permissionCode) =>
                setSelectedPermissions((current) => {
                  const next = new Set(current);
                  if (next.has(permissionCode)) next.delete(permissionCode);
                  else next.add(permissionCode);
                  return next;
                })
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent>
              <label className="relative block">
                <span className="sr-only">Tìm quyền</span>
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  className="pl-9"
                  placeholder="Tìm theo chức năng được phép thực hiện…"
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
      )}
    </>
  );
}

function PermissionMatrix({
  permissions,
  groups,
  selected,
  query,
  onQueryChange,
  onToggle,
}: {
  permissions: PermissionItem[];
  groups: ReturnType<typeof groupPermissions>;
  selected: ReadonlySet<string>;
  query: string;
  onQueryChange: (value: string) => void;
  onToggle: (permissionCode: string) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Tìm permission</span>
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="pl-9"
          placeholder={`Tìm trong ${permissions.length} permission…`}
        />
      </label>

      <div className="grid gap-3 xl:grid-cols-2">
        {groups.map((group) => (
          <section key={group.id} className="overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
              <KeyRoundIcon className="size-3.5 text-brand" />
              <p className="text-xs font-black">{group.label}</p>
              <span className="ml-auto text-[0.62rem] font-bold text-muted-foreground">
                {group.permissions.filter((permission) => selected.has(permission.code)).length}/{group.permissions.length}
              </span>
            </div>
            <div className="divide-y">
              {group.permissions.map((permission) => (
                <label
                  key={permission.id}
                  className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition hover:bg-muted/20"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(permission.code)}
                    onChange={() => onToggle(permission.code)}
                    className="mt-0.5 size-4 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold">
                      {permissionLabel(permission.code)}
                    </span>
                    <span className="mt-0.5 block break-all font-mono text-[0.58rem] text-muted-foreground">
                      {permission.code}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      {!groups.length ? (
        <p className="rounded-lg border p-5 text-center text-xs text-muted-foreground">
          Không có permission phù hợp với từ khóa.
        </p>
      ) : null}
    </div>
  );
}

function PermissionRow({ permission }: { permission: PermissionItem }) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/10 p-2.5">
      <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <div className="min-w-0">
        <p className="text-xs font-bold leading-5">{permissionLabel(permission.code)}</p>
        <p className="break-all font-mono text-[0.58rem] text-muted-foreground">
          {permission.code}
        </p>
      </div>
    </div>
  );
}

function TechnicalCatalog({
  roles,
  selectedRoleCode,
}: {
  roles: RoleItem[];
  selectedRoleCode: string;
}) {
  return (
    <Card className="overflow-hidden border-dashed">
      <div className="border-b bg-muted/30 px-4 py-3">
        <p className="text-sm font-black">Dữ liệu kỹ thuật</p>
        <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
          ID và code phục vụ kiểm tra RBAC. Permission catalog vẫn do backend sở hữu.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        {roles.map((role) => {
          const selected = role.code === selectedRoleCode;
          return (
            <section
              key={role.id}
              className={cn(
                "rounded-lg border p-3",
                selected ? "border-brand/30 bg-brand/[0.04]" : "bg-muted/10",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black">{role.name}</p>
                {selected ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.58rem] font-black text-brand">
                    Đang xem
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <TechnicalValue label="ID vai trò" value={role.id} />
                <TechnicalValue label="Mã vai trò" value={role.code} />
                <TechnicalValue label="Vai trò hệ thống" value={role.isSystem ? "Có" : "Không"} />
                <TechnicalValue label="Số quyền" value={String(role.permissions.length)} />
              </div>
            </section>
          );
        })}
      </div>
    </Card>
  );
}

function TechnicalValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-2.5">
      <p className="text-[0.58rem] font-black tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-[0.65rem]">{value}</p>
    </div>
  );
}

function PolicyFact({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-2 p-4">
      <WorkflowIcon className="mt-0.5 size-4 shrink-0 text-brand" />
      <div>
        <p className="text-xs font-black">{title}</p>
        <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.68rem] font-black text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
