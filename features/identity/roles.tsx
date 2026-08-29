"use client";

import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PermissionItem, RoleItem } from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const roleLabels: Record<string, { name: string; description: string }> = {
  ADMIN: {
    name: "Quản trị hệ thống",
    description: "Toàn quyền quản trị cấu hình, người dùng và vận hành.",
  },
  OPERATIONS_MANAGER: {
    name: "Quản lý vận hành",
    description: "Điều phối nhân sự, công việc và tình huống vận hành.",
  },
  HUB_MANAGER: {
    name: "Quản lý bưu cục",
    description: "Quản lý nhân sự và hoạt động tại các bưu cục được giao.",
  },
  WAREHOUSE_STAFF: {
    name: "Nhân viên kho",
    description: "Tiếp nhận, quét và xử lý kiện hàng tại bưu cục.",
  },
  DRIVER: {
    name: "Nhân viên giao nhận",
    description: "Nhận và thực hiện công việc lấy, vận chuyển, giao hàng.",
  },
  MERCHANT: {
    name: "Đối tác gửi hàng",
    description: "Quản lý hồ sơ merchant và nghiệp vụ gửi hàng của mình.",
  },
  CUSTOMER: {
    name: "Khách hàng",
    description: "Theo dõi đơn và sử dụng các chức năng dành cho khách hàng.",
  },
};

const permissionLabels: Record<string, string> = {
  "tracking.read-own": "Theo dõi vận đơn của mình",
  "support.create": "Tạo yêu cầu hỗ trợ",
  "shipments.read": "Xem vận đơn",
  "shipments.create": "Tạo vận đơn",
  "shipments.update-own": "Sửa vận đơn của mình trước khi lấy hàng",
  "shipments.cancel-own": "Hủy vận đơn của mình",
  "shipments.exceptions.manage": "Xử lý ngoại lệ vận đơn",
  "shipments.weight.adjust": "Điều chỉnh trọng lượng kiện",
  "shipments.cases.manage": "Quản lý hồ sơ sự cố kiện hàng",
  "shipments.control-tower.read": "Theo dõi cảnh báo vận đơn",
  "assignments.read-own": "Xem công việc được giao",
  "assignments.accept-own": "Nhận công việc được giao",
  "assignments.execute-own": "Thực hiện công việc được giao",
  "deliveries.complete-own": "Hoàn tất giao hàng",
  "locations.update-own": "Cập nhật vị trí của mình",
  "quotes.create": "Tạo báo giá vận chuyển",
  "billing.invoices.read-own": "Xem hóa đơn của mình",
  "billing.invoices.pay-own": "Thanh toán hóa đơn của mình",
  "billing.manage": "Quản lý hóa đơn và thanh toán",
  "billing.cash.collect": "Thu tiền mặt",
  "billing.cash.submit-own": "Nộp tiền thu hộ của mình",
  "billing.cash.read-hub": "Theo dõi tiền mặt tại bưu cục",
  "billing.cash.approve": "Duyệt hoặc từ chối bàn giao tiền",
  "call-monitoring.read": "Xem lịch sử cuộc gọi",
  "call-monitoring.manage": "Quản lý và đánh giá cuộc gọi",
  "call-monitoring.reports.read": "Xem báo cáo cuộc gọi",
  "network.read": "Xem cấu hình mạng lưới",
  "network.manage": "Quản lý mạng lưới bưu cục và tuyến",
  "operations.workforce.manage": "Quản lý nhân sự vận hành",
  "operations.assignments.manage": "Điều phối công việc",
  "operations.hub.manage": "Quản lý vận hành tại bưu cục được giao",
  "scans.create": "Quét kiện hàng",
  "identity.users.read": "Xem danh sách tài khoản",
  "identity.users.manage-profile": "Chỉnh sửa hồ sơ tài khoản",
  "identity.roles.read": "Xem vai trò và quyền",
  "identity.users.create": "Tạo tài khoản",
  "identity.users.invite": "Mời người dùng",
  "identity.roles.assign": "Gán vai trò cho tài khoản",
  "identity.users.manage-status": "Khóa hoặc kích hoạt tài khoản",
  "partners.merchants.manage-own": "Quản lý hồ sơ doanh nghiệp của mình",
  "partners.merchants.read": "Xem danh sách đối tác",
  "partners.merchants.manage-status": "Duyệt và quản lý trạng thái đối tác",
};

const permissionGroups = [
  { id: "identity", label: "Tài khoản & phân quyền", prefixes: ["identity."] },
  { id: "partners", label: "Đối tác", prefixes: ["partners."] },
  {
    id: "shipments",
    label: "Vận đơn & báo giá",
    prefixes: ["shipments.", "tracking.", "quotes."],
  },
  {
    id: "operations",
    label: "Vận hành",
    prefixes: [
      "operations.",
      "assignments.",
      "deliveries.",
      "locations.",
      "scans.",
    ],
  },
  { id: "network", label: "Mạng lưới", prefixes: ["network."] },
  { id: "billing", label: "Tài chính", prefixes: ["billing."] },
  {
    id: "support",
    label: "Chăm sóc khách hàng",
    prefixes: ["call-monitoring.", "support."],
  },
] as const;

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
      const payload = await apiRequest("roles");
      if (!Array.isArray(payload)) {
        throw new Error("Dữ liệu vai trò không đúng định dạng.");
      }

      const result = payload as RoleItem[];
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
    const matchesSearch = (permission: PermissionItem) =>
      !needle ||
      `${permissionLabels[permission.code] ?? permission.name} ${permission.name} ${permission.code} ${permission.description ?? ""}`
        .toLowerCase()
        .includes(needle);

    const knownCodes = new Set<string>();
    const groups = permissionGroups
      .map((group) => {
        const permissions = selectedRole.permissions.filter((permission) => {
          const belongs = group.prefixes.some((prefix) =>
            permission.code.startsWith(prefix),
          );
          if (belongs) knownCodes.add(permission.code);
          return belongs && matchesSearch(permission);
        });
        return { ...group, permissions };
      })
      .filter((group) => group.permissions.length > 0);

    const otherPermissions = selectedRole.permissions.filter(
      (permission) => !knownCodes.has(permission.code) && matchesSearch(permission),
    );

    return otherPermissions.length
      ? [
          ...groups,
          {
            id: "other",
            label: "Quyền khác",
            prefixes: [] as string[],
            permissions: otherPermissions,
          },
        ]
      : groups;
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
                  Kiểm soát truy cập
                </p>
                <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                  Vai trò và quyền hạn
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              Xem role catalog mà Identity service đang cấp thật cho hệ thống,
              cùng toàn bộ permission của từng vai trò theo nhóm nghiệp vụ.
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

      {error ? (
        <Card className="border-destructive/30 p-4 text-sm font-bold text-destructive">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-black">Danh sách vai trò</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {roles.length} vai trò trong hệ thống
            </p>
          </div>
          <div className="grid gap-1 p-2">
            {loading ? (
              <div className="grid min-h-40 place-items-center">
                <LoaderCircleIcon className="animate-spin text-brand" />
              </div>
            ) : roles.length ? (
              roles.map((role) => {
                const content = roleLabels[role.code] ?? {
                  name: role.name,
                  description: role.description ?? "Vai trò tùy chỉnh",
                };
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{content.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-bold text-muted-foreground">
                        {role.permissions.length} quyền
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {content.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.58rem] text-muted-foreground">
                        {role.code}
                      </span>
                      {role.isSystem ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[0.58rem] font-black text-muted-foreground uppercase">
                          Hệ thống
                        </span>
                      ) : null}
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
            <>
              <Card>
                <CardContent>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black text-brand uppercase">
                        {selectedRole.code}
                      </p>
                      <h2 className="mt-1 text-xl font-black">
                        {roleLabels[selectedRole.code]?.name ?? selectedRole.name}
                      </h2>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {roleLabels[selectedRole.code]?.description ??
                          selectedRole.description ??
                          "Không có mô tả."}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-center">
                      <p className="text-2xl font-black text-brand">
                        {selectedRole.permissions.length}
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
                      onChange={(event) => setQuery(event.target.value)}
                      className="pl-9"
                      placeholder="Tìm quyền theo chức năng hoặc mã permission..."
                    />
                  </label>
                </CardContent>
              </Card>

              {groupedPermissions.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {groupedPermissions.map((group) => (
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
                            <PermissionRow
                              key={permission.id}
                              permission={permission}
                            />
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
