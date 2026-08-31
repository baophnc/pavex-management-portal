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
import { useAccess } from "@/features/auth/access-context";
import { getRoles } from "@/features/identity/api";
import type { PermissionItem, RoleItem } from "@/features/identity/contracts";
import {
  groupPermissions,
  permissionLabel,
  rolePresentation,
} from "@/features/identity/presentation";
import { cn } from "@/lib/utils";

export function IdentityRoles() {
  const { hasRole } = useAccess();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleCode, setSelectedRoleCode] = useState("");
  const [query, setQuery] = useState("");
  const [showTechnical, setShowTechnical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canSeeTechnical = hasRole("ADMIN");

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
      return `${permissionLabel(permission.code)} ${permission.name} ${permission.code}`
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
                  Phân quyền tài khoản
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Vai trò và quyền hạn
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Chọn một vai trò để xem tài khoản ở vai trò đó được phép làm những
              công việc gì. Danh mục quyền được hệ thống quản lý tập trung để
              tránh thay đổi tùy ý làm sai phân quyền.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canSeeTechnical ? (
              <Button
                type="button"
                variant={showTechnical ? "default" : "outline"}
                size="icon"
                onClick={() => setShowTechnical((current) => !current)}
                aria-label={
                  showTechnical
                    ? "Ẩn dữ liệu kỹ thuật"
                    : "Hiện dữ liệu kỹ thuật"
                }
                aria-pressed={showTechnical}
                title={
                  showTechnical
                    ? "Ẩn dữ liệu kỹ thuật"
                    : "Hiện dữ liệu kỹ thuật"
                }
              >
                <span className="font-mono text-[0.68rem] font-black" aria-hidden>
                  {"</>"}
                </span>
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Tải lại
            </Button>
          </div>
        </div>
      </section>

      <Card className="border-brand/15 bg-brand/[0.035]">
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <PolicyFact
            title="Nhân sự nội bộ"
            body="Quản trị viên có quyền phân vai có thể cấp trực tiếp các vai trò quản trị, vận hành, bưu cục, kho và giao nhận."
          />
          <PolicyFact
            title="Đối tác gửi hàng"
            body="Vai trò đối tác được đồng bộ tự động theo trạng thái hồ sơ đã duyệt; không gán hoặc gỡ thủ công tại màn tài khoản."
          />
          <PolicyFact
            title="Danh mục hệ thống"
            body="Màn này dùng để xem và phân vai. Việc tạo, đổi tên hoặc xóa mã quyền không được thực hiện từ giao diện quản trị."
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
              {roles.length} vai trò đang được hệ thống sử dụng
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
                        {role.permissions.length} quyền
                      </span>
                    </div>
                    <p className="mt-2 text-[0.62rem] font-bold text-muted-foreground">
                      {content.ownershipLabel}
                    </p>
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

      {canSeeTechnical && showTechnical ? (
        <TechnicalCatalog roles={roles} selectedRoleCode={selectedRoleCode} />
      ) : null}
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
            <div className="min-w-0 flex-1">
              <p className="text-[0.62rem] font-black tracking-[0.14em] text-brand uppercase">
                Vai trò tài khoản
              </p>
              <h2 className="mt-1 text-xl font-black">{content.name}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                {content.description}
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
                    Loại vai trò
                  </p>
                  <p className="mt-1 text-xs font-bold">
                    {role.isSystem ? "Vai trò hệ thống" : "Vai trò tùy chỉnh"}
                  </p>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    {content.assignableFromIdentity
                      ? "Có thể chọn khi quản trị viên phân vai cho tài khoản."
                      : "Không xuất hiện trong thao tác gán vai trò thủ công."}
                  </p>
                </div>
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
              placeholder="Tìm theo chức năng được phép thực hiện..."
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
      <p className="min-w-0 text-xs font-bold leading-5">
        {permissionLabel(permission.code)}
      </p>
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
          Chỉ quản trị viên thấy phần này. Các mã và định danh bên dưới phục vụ
          kiểm tra phân quyền, không phải nội dung nghiệp vụ cho người dùng thông
          thường.
        </p>
      </div>
      <div className="grid gap-3 p-4">
        {roles.map((role) => {
          const content = rolePresentation(role.code, role);
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
                <p className="text-xs font-black">{content.name}</p>
                {selected ? (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.58rem] font-black text-brand">
                    Đang xem
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <TechnicalValue label="ID vai trò" value={role.id} />
                <TechnicalValue label="Mã vai trò" value={role.code} />
                <TechnicalValue
                  label="Vai trò hệ thống"
                  value={role.isSystem ? "Có" : "Không"}
                />
                <TechnicalValue
                  label="Số quyền"
                  value={String(role.permissions.length)}
                />
              </div>
              {role.permissions.length ? (
                <div className="mt-3 overflow-hidden rounded-md border bg-background">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] border-b bg-muted/30 px-3 py-2 text-[0.6rem] font-black text-muted-foreground uppercase">
                    <span>ID quyền</span>
                    <span>Mã quyền</span>
                  </div>
                  {role.permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 border-b px-3 py-2 text-[0.62rem] last:border-b-0"
                    >
                      <span className="break-all font-mono text-muted-foreground">
                        {permission.id}
                      </span>
                      <span className="break-all font-mono">{permission.code}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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
