"use client";

import { AlertTriangleIcon, DownloadIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { DataTable, Pagination, type Column } from "@/components/workspace/data-table";
import {
  CollapseToggle,
  FilterField,
  FilterGrid,
  FilterInput,
  FilterSelect,
  ToolbarButton,
  WorkspaceToolbar,
} from "@/components/workspace/filters";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import { useAccess } from "@/features/auth/access-context";
import { getOperationalAssignments, getWorkforce } from "@/features/operations/api";
import {
  operationalAssignmentStatuses,
  workforceKinds,
  type OperationalAssignment,
  type OperationalAssignmentStatus,
  type OperationalAssignmentType,
  type WorkforceMemberKind,
} from "@/features/operations/contracts";
import {
  operationalAssignmentStatusLabel,
  operationalAssignmentTypeLabel,
  workforceIdentityName,
  workforceKindLabel,
} from "@/features/operations/presentation";
import { getAdminShipment, getAdminShipments } from "@/features/shipments/api";
import { ApiError } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import { cn, formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function statusClass(status: OperationalAssignmentStatus) {
  switch (status) {
    case "BLOCKED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "READY":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "PENDING":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "ASSIGNED":
      return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "ACCEPTED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "REJECTED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "IN_PROGRESS":
      return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "COMPLETED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}

const ALL_TYPES: OperationalAssignmentType[] = [
  "PICKUP",
  "ORIGIN_HUB_HANDLING",
  "LINE_HAUL",
  "TRANSIT_HUB_HANDLING",
  "DESTINATION_HUB_HANDLING",
  "LAST_MILE_DELIVERY",
];

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function OperationsAssignments() {
  const { hasAnyPermission } = useAccess();
  const canReadGlobalShipments = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentCode = searchParams.get("assignmentCode") ?? "";
  const trackingCode = searchParams.get("trackingCode") ?? "";
  const hubCode = searchParams.get("hubCode") ?? "";
  const status = (searchParams.get("status") ?? "") as OperationalAssignmentStatus | "";

  const [items, setItems] = useState<OperationalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState(assignmentCode);
  const [shipmentDraft, setShipmentDraft] = useState(trackingCode);
  const [hubDraft, setHubDraft] = useState(hubCode);
  const [statusDraft, setStatusDraft] = useState<OperationalAssignmentStatus | "">(status);
  const [typeDraft, setTypeDraft] = useState<OperationalAssignmentType | "">("");
  const [kindDraft, setKindDraft] = useState<WorkforceMemberKind | "">("");
  const [typeFilter, setTypeFilter] = useState<OperationalAssignmentType | "">("");
  const [kindFilter, setKindFilter] = useState<WorkforceMemberKind | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [collapsed, setCollapsed] = useState(false);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shipmentLabels, setShipmentLabels] = useState<Record<string, string>>({});
  const [hubLabels, setHubLabels] = useState<Record<string, string>>({});
  const [workerLabels, setWorkerLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const task = window.setTimeout(() => setAssignmentDraft(assignmentCode), 0);
    return () => window.clearTimeout(task);
  }, [assignmentCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setShipmentDraft(trackingCode), 0);
    return () => window.clearTimeout(task);
  }, [trackingCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setHubDraft(hubCode), 0);
    return () => window.clearTimeout(task);
  }, [hubCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setStatusDraft(status), 0);
    return () => window.clearTimeout(task);
  }, [status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [networkHubs, workforcePage, shipmentPage] = await Promise.all([
        getScopedHubs().catch(() => []),
        getWorkforce(new URLSearchParams({ page: "1", pageSize: "100" })).catch(() => null),
        canReadGlobalShipments
          ? getAdminShipments(new URLSearchParams({ limit: "100" })).catch(() => null)
          : Promise.resolve(null),
      ]);
      const fallbackHubs = new Map<string, Hub>();
      workforcePage?.items.forEach((member) => member.hubMemberships.forEach((membership) => {
        if (!membership.isActive) return;
        fallbackHubs.set(membership.hubId, {
          id: membership.hubId,
          code: membership.hubCode || membership.hubId.slice(0, 8),
          name: membership.hubName || "Bưu cục được phân quyền",
          type: (membership.hubType as Hub["type"]) || "LOCAL",
          status: (membership.hubStatus as Hub["status"]) || "ACTIVE",
          addressLine: membership.addressLine || "",
          provinceCode: membership.provinceCode || "",
          wardCode: membership.wardCode || "",
          parentHubId: membership.parentHubId,
          publicVisible: false,
          publicName: null,
          createdAt: membership.assignedAt,
          updatedAt: membership.updatedAt,
        });
      }));
      const visibleHubs = networkHubs.length ? networkHubs : [...fallbackHubs.values()];
      setHubs(visibleHubs.filter((hub) => hub.status === "ACTIVE"));
      setHubLabels(Object.fromEntries(visibleHubs.map((hub) => [hub.id, `${hub.code} · ${hub.name}`])));
      setWorkerLabels(Object.fromEntries((workforcePage?.items ?? []).map((member) => [
        member.id,
        `${workforceIdentityName(member.identity ?? {})} · ${member.employeeCode}`,
      ])));

      const params = new URLSearchParams();
      const nextShipmentLabels = Object.fromEntries(
        (shipmentPage?.items ?? []).map((shipment) => [shipment.id, shipment.trackingCode]),
      );
      if (trackingCode && canReadGlobalShipments) {
        const normalizedTrackingCode = trackingCode.trim().toUpperCase();
        const knownShipment = shipmentPage?.items.find(
          (shipment) => shipment.trackingCode === normalizedTrackingCode,
        );
        const shipment = knownShipment ?? await getAdminShipment(normalizedTrackingCode);
        params.set("shipmentId", shipment.id);
        nextShipmentLabels[shipment.id] = "shipment" in shipment
          ? shipment.shipment.trackingCode
          : shipment.trackingCode;
      }
      if (hubCode) {
        const hub = visibleHubs.find((item) => item.code === hubCode);
        if (!hub) throw new Error("Bưu cục không còn nằm trong phạm vi truy cập.");
        params.set("hubId", hub.id);
      }
      if (status) params.set("status", status);
      const response = await getOperationalAssignments(params);
      setShipmentLabels(nextShipmentLabels);
      const visibleAssignments = assignmentCode
        ? response.filter((item) => item.code === assignmentCode.trim().toUpperCase())
        : response;
      setItems(
        [...visibleAssignments].sort(
          (left, right) =>
            right.priority - left.priority ||
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      );
    } catch (cause) {
      const message = apiMessage(cause, "Không thể tải assignment vận hành.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [assignmentCode, canReadGlobalShipments, hubCode, status, trackingCode]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const updateFilters = (next: Record<string, string>) => {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    });
    const serialized = query.toString();
    router.push(serialized ? `${pathname}?${serialized}` : pathname);
  };

  const counts = useMemo(() => {
    const pending = items.filter((item) => ["BLOCKED", "READY", "PENDING", "REJECTED"].includes(item.status)).length;
    const active = items.filter((item) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(item.status)).length;
    const completed = items.filter((item) => item.status === "COMPLETED").length;
    return { pending, active, completed };
  }, [items]);

  const typeOptions = useMemo(() => [...new Set(items.map((item) => item.type))], [items]);
  const visible = useMemo(
    () =>
      items.filter(
        (item) => (!typeFilter || item.type === typeFilter) && (!kindFilter || item.requiredKind === kindFilter),
      ),
    [items, kindFilter, typeFilter],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: Column<OperationalAssignment>[] = [
    {
      key: "code",
      header: "Mã việc",
      width: 180,
      sortValue: (row) => row.code,
      cell: (row) => (
        <Link href={`/operations/assignments/${row.id}`} className="font-mono font-semibold text-brand hover:underline">
          {row.code}
        </Link>
      ),
    },
    { key: "type", header: "Loại việc", width: 170, sortValue: (row) => operationalAssignmentTypeLabel(row.type), cell: (row) => operationalAssignmentTypeLabel(row.type) },
    {
      key: "shipment",
      header: "Vận đơn",
      width: 190,
      sortValue: (row) => shipmentLabels[row.shipmentId] ?? row.shipmentId,
      cell: (row) =>
        shipmentLabels[row.shipmentId] ? (
          <Link
            href={`/shipments/tracking?codes=${encodeURIComponent(shipmentLabels[row.shipmentId]!)}`}
            className="font-mono hover:text-brand hover:underline"
          >
            {shipmentLabels[row.shipmentId]}
          </Link>
        ) : (
          <span className="text-muted-foreground">{shortId(row.shipmentId)}</span>
        ),
    },
    { key: "hub", header: "Bưu cục", width: 220, sortValue: (row) => hubLabels[row.hubId] ?? "", cell: (row) => hubLabels[row.hubId] || "Bưu cục trong phạm vi" },
    { key: "kind", header: "Loại nhân sự", width: 130, sortValue: (row) => workforceKindLabel(row.requiredKind), cell: (row) => workforceKindLabel(row.requiredKind) },
    {
      key: "assignee",
      header: "Người nhận",
      width: 200,
      sortValue: (row) => (row.assigneeWorkforceMemberId ? workerLabels[row.assigneeWorkforceMemberId] ?? "" : ""),
      cell: (row) =>
        row.assigneeWorkforceMemberId ? (
          workerLabels[row.assigneeWorkforceMemberId] || "Nhân sự đã phân công"
        ) : (
          <span className="text-muted-foreground">Chưa phân công</span>
        ),
    },
    {
      key: "status",
      header: "Trạng thái",
      width: 120,
      sortValue: (row) => operationalAssignmentStatusLabel(row.status),
      cell: (row) => (
        <span className={cn("inline-flex rounded-sm border px-1.5 py-0.5 text-[0.68rem]", statusClass(row.status))}>
          {operationalAssignmentStatusLabel(row.status)}
        </span>
      ),
    },
    { key: "priority", header: "Ưu tiên", width: 70, align: "right", sortValue: (row) => row.priority, cell: (row) => row.priority },
    { key: "createdAt", header: "Tạo lúc", width: 130, sortValue: (row) => row.createdAt, cell: (row) => formatDateTime(row.createdAt) },
    { key: "updatedAt", header: "Cập nhật", width: 130, sortValue: (row) => row.updatedAt, cell: (row) => formatDateTime(row.updatedAt) },
  ];

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTypeFilter(typeDraft);
    setKindFilter(kindDraft);
    setPage(1);
    updateFilters({
      assignmentCode: assignmentDraft.toUpperCase(),
      trackingCode: canReadGlobalShipments ? shipmentDraft.toUpperCase() : "",
      hubCode: hubDraft,
      status: statusDraft,
    });
  }

  function reset() {
    setAssignmentDraft("");
    setShipmentDraft("");
    setHubDraft("");
    setStatusDraft("");
    setTypeDraft("");
    setKindDraft("");
    setTypeFilter("");
    setKindFilter("");
    setPage(1);
    if (assignmentCode || trackingCode || hubCode || status) router.push(pathname);
    else void load();
  }

  function exportRows() {
    downloadCsv(
      "phan-cong.csv",
      ["Mã việc", "Loại việc", "Vận đơn", "Bưu cục", "Loại nhân sự", "Người nhận", "Trạng thái", "Ưu tiên", "Tạo lúc", "Cập nhật"],
      visible.map((row) => [
        row.code,
        operationalAssignmentTypeLabel(row.type),
        shipmentLabels[row.shipmentId] ?? row.shipmentId,
        hubLabels[row.hubId] ?? row.hubId,
        workforceKindLabel(row.requiredKind),
        row.assigneeWorkforceMemberId ? workerLabels[row.assigneeWorkforceMemberId] ?? row.assigneeWorkforceMemberId : "",
        operationalAssignmentStatusLabel(row.status),
        row.priority,
        formatDateTime(row.createdAt),
        formatDateTime(row.updatedAt),
      ]),
    );
  }

  return (
    <div className="space-y-2.5 rounded-md border bg-card p-3">
      <form onSubmit={search} className="space-y-2.5">
        <WorkspaceToolbar
          trailing={
            <>
              <span className="hidden text-xs text-muted-foreground md:inline">
                Chờ điều phối <b className="text-brand">{counts.pending}</b> · Đang làm <b className="text-foreground">{counts.active}</b> ·
                Hoàn tất <b className="text-foreground">{counts.completed}</b>
              </span>
              <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
            </>
          }
        >
          <ToolbarButton type="submit" tone="primary" icon={<SearchIcon />} disabled={loading}>
            Tìm kiếm
          </ToolbarButton>
          <ToolbarButton icon={<RotateCcwIcon />} onClick={reset} disabled={loading}>
            Làm mới
          </ToolbarButton>
          <ToolbarButton icon={<DownloadIcon />} onClick={exportRows} disabled={loading || visible.length === 0}>
            Xuất dữ liệu
          </ToolbarButton>
        </WorkspaceToolbar>

        <FilterGrid collapsed={collapsed}>
          <FilterField label="Mã việc">
            <FilterInput
              value={assignmentDraft}
              onChange={(event) => setAssignmentDraft(event.target.value)}
              placeholder="PAVEX-ASG-…"
              className="font-mono uppercase placeholder:font-sans"
            />
          </FilterField>
          {canReadGlobalShipments ? (
            <FilterField label="Mã vận đơn">
              <FilterInput
                value={shipmentDraft}
                onChange={(event) => setShipmentDraft(event.target.value)}
                placeholder="PAVEX…"
                className="font-mono uppercase placeholder:font-sans"
              />
            </FilterField>
          ) : null}
          <FilterField label="Bưu cục">
            <FilterSelect value={hubDraft} onChange={(event) => setHubDraft(event.target.value)}>
              <option value="">Tất cả trong phạm vi</option>
              {hubs.map((hub) => (
                <option key={hub.id} value={hub.code}>
                  {hub.code} · {hub.name}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Trạng thái">
            <FilterSelect value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as OperationalAssignmentStatus | "")}>
              <option value="">Tất cả</option>
              {operationalAssignmentStatuses.map((item) => (
                <option key={item} value={item}>
                  {operationalAssignmentStatusLabel(item)}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Loại việc">
            <FilterSelect value={typeDraft} onChange={(event) => setTypeDraft(event.target.value as OperationalAssignmentType | "")}>
              <option value="">Tất cả</option>
              {(typeOptions.length ? typeOptions : ALL_TYPES).map((item) => (
                <option key={item} value={item}>
                  {operationalAssignmentTypeLabel(item)}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Loại nhân sự">
            <FilterSelect value={kindDraft} onChange={(event) => setKindDraft(event.target.value as WorkforceMemberKind | "")}>
              <option value="">Tất cả</option>
              {workforceKinds.map((item) => (
                <option key={item} value={item}>
                  {workforceKindLabel(item)}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterGrid>
      </form>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.id}
        loading={loading}
        startIndex={(currentPage - 1) * pageSize}
        emptyText="Không có việc phù hợp phạm vi và bộ lọc"
        actionsWidth={90}
        actions={(row) => (
          <Link href={`/operations/assignments/${row.id}`} className="text-xs text-brand hover:underline">
            Chi tiết
          </Link>
        )}
      />

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        total={visible.length}
        disabled={loading}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
