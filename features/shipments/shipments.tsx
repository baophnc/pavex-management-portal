"use client";

import { DownloadIcon, RotateCcwIcon, ScanSearchIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

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
import { getAdminShipments } from "@/features/shipments/api";
import type { AdminShipmentSummary, ShipmentLifecycleStatus, ShipmentStatus } from "@/features/shipments/contracts";
import { SHIPMENT_LIFECYCLE_STATUSES, SHIPMENT_STATUSES } from "@/features/shipments/contracts";
import {
  lifecycleLabel,
  money,
  serviceLevelLabel,
  shipmentErrorMessage,
  shipmentStatusLabel,
} from "@/features/shipments/presentation";
import { downloadCsv } from "@/lib/csv";
import { cn, formatDateTime } from "@/lib/utils";

type Filters = { query: string; status: ShipmentStatus | ""; lifecycleStatus: ShipmentLifecycleStatus | "" };

/** Pages further than this from the last one loaded are not walked to one by one. */
const MAX_PAGE_HOPS = 50;

export function ShipmentStatusTag({ status }: { status: ShipmentStatus }) {
  const tone =
    status === "DELIVERY_FAILED" || status === "CANCELLED"
      ? "border-brand/25 bg-brand/5 text-brand"
      : status === "DELIVERED" || status === "RETURNED"
        ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
        : "border-sky-500/25 bg-sky-500/5 text-sky-700 dark:text-sky-300";
  return <span className={cn("inline-flex rounded-sm border px-1.5 py-0.5 text-[0.68rem]", tone)}>{shipmentStatusLabel(status)}</span>;
}

function params(filters: Filters, size: number, cursor: string | null | undefined) {
  const result = new URLSearchParams({ limit: String(size) });
  if (filters.query.trim()) result.set("q", filters.query.trim());
  if (filters.status) result.set("status", filters.status);
  if (filters.lifecycleStatus) result.set("lifecycleStatus", filters.lifecycleStatus);
  if (cursor) result.set("cursor", cursor);
  return result;
}

const columns: Column<AdminShipmentSummary>[] = [
  {
    key: "trackingCode",
    header: "Mã vận đơn",
    width: 190,
    sortValue: (row) => row.trackingCode,
    cell: (row) => (
      <Link href={`/shipments/${encodeURIComponent(row.trackingCode)}`} className="font-mono font-semibold text-brand hover:underline">
        {row.trackingCode}
      </Link>
    ),
  },
  { key: "reference", header: "Mã tham chiếu", width: 130, sortValue: (row) => row.merchantReference, cell: (row) => row.merchantReference ?? "—" },
  { key: "status", header: "Trạng thái", width: 130, sortValue: (row) => shipmentStatusLabel(row.status), cell: (row) => <ShipmentStatusTag status={row.status} /> },
  { key: "lifecycle", header: "Vòng đời", width: 100, sortValue: (row) => lifecycleLabel(row.lifecycleStatus), cell: (row) => lifecycleLabel(row.lifecycleStatus) },
  { key: "service", header: "Dịch vụ", width: 90, sortValue: (row) => row.serviceLevel, cell: (row) => serviceLevelLabel(row.serviceLevel) },
  { key: "parcels", header: "Số kiện", width: 70, align: "right", sortValue: (row) => row.parcelCount, cell: (row) => row.parcelCount },
  { key: "origin", header: "Bưu cục gửi", width: 170, sortValue: (row) => row.originHubName, cell: (row) => <span title={row.originHubCode}>{row.originHubName}</span> },
  { key: "destination", header: "Bưu cục phát", width: 170, sortValue: (row) => row.destinationHubName, cell: (row) => <span title={row.destinationHubCode}>{row.destinationHubName}</span> },
  { key: "province", header: "Tỉnh/thành nhận", width: 130, sortValue: (row) => row.destinationProvinceName, cell: (row) => row.destinationProvinceName },
  { key: "ward", header: "Phường/xã nhận", width: 150, sortValue: (row) => row.destinationWardName, cell: (row) => row.destinationWardName },
  { key: "fee", header: "Cước", width: 100, align: "right", sortValue: (row) => row.shippingFee, cell: (row) => money(row.shippingFee) },
  { key: "cod", header: "COD", width: 100, align: "right", sortValue: (row) => row.codAmount, cell: (row) => money(row.codAmount) },
  { key: "collect", header: "Thu người nhận", width: 120, align: "right", sortValue: (row) => row.amountToCollect, cell: (row) => money(row.amountToCollect) },
  { key: "createdAt", header: "Thời gian tạo", width: 130, sortValue: (row) => row.createdAt, cell: (row) => formatDateTime(row.createdAt) },
  { key: "updatedAt", header: "Cập nhật", width: 130, sortValue: (row) => row.updatedAt, cell: (row) => formatDateTime(row.updatedAt) },
];

export function AdminShipments({
  initialQuery = "",
  initialStatus = "",
  initialLifecycleStatus = "",
}: {
  initialQuery?: string;
  initialStatus?: ShipmentStatus | "";
  initialLifecycleStatus?: ShipmentLifecycleStatus | "";
}) {
  const initial: Filters = { query: initialQuery, status: initialStatus, lifecycleStatus: initialLifecycleStatus };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [rows, setRows] = useState<AdminShipmentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // cursors[n] loads page n + 1; the list API pages by cursor, so pages are walked in order.
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async (target: number, size: number, filters: Filters, known: Array<string | null>) => {
    setLoading(true);
    setError(null);
    try {
      const next = [...known];
      // Start from the nearest page whose cursor is known and walk forward to the one asked for.
      let current = Math.min(target, next.length);
      const goal = Math.min(target, current + MAX_PAGE_HOPS);
      let result = await getAdminShipments(params(filters, size, next[current - 1]));
      next[current] = result.nextCursor;
      while (current < goal && result.nextCursor) {
        current += 1;
        result = await getAdminShipments(params(filters, size, result.nextCursor));
        next[current] = result.nextCursor;
      }
      setRows(result.items);
      setTotal(result.totalCount);
      setPage(current);
      setCursors(next);
    } catch (reason) {
      setRows([]);
      setError(shipmentErrorMessage(reason, "Không thể tải danh sách vận đơn."));
    } finally {
      setLoading(false);
    }
  }, []);

  // The filters from the address bar load once; later loads come from the toolbar.
  const initialFilters = useRef(initial);
  useEffect(() => {
    const task = window.setTimeout(() => void load(1, 20, initialFilters.current, [null]), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setApplied(draft);
    void load(1, pageSize, draft, [null]);
  }

  function reset() {
    const empty: Filters = { query: "", status: "", lifecycleStatus: "" };
    setDraft(empty);
    setApplied(empty);
    void load(1, pageSize, empty, [null]);
  }

  function exportPage() {
    downloadCsv(
      `van-don-trang-${page}.csv`,
      ["Mã vận đơn", "Mã tham chiếu", "Trạng thái", "Vòng đời", "Dịch vụ", "Số kiện", "Bưu cục gửi", "Bưu cục phát", "Tỉnh/thành nhận", "Phường/xã nhận", "Cước", "COD", "Thu người nhận", "Thời gian tạo"],
      rows.map((row) => [
        row.trackingCode,
        row.merchantReference,
        shipmentStatusLabel(row.status),
        lifecycleLabel(row.lifecycleStatus),
        serviceLevelLabel(row.serviceLevel),
        row.parcelCount,
        row.originHubName,
        row.destinationHubName,
        row.destinationProvinceName,
        row.destinationWardName,
        row.shippingFee,
        row.codAmount,
        row.amountToCollect,
        formatDateTime(row.createdAt),
      ]),
    );
  }

  return (
    <div className="space-y-2.5 rounded-md border bg-card p-3">
      <form onSubmit={search} className="space-y-2.5">
        <WorkspaceToolbar trailing={<CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />}>
          <ToolbarButton type="submit" tone="primary" icon={<SearchIcon />} disabled={loading}>
            Tìm kiếm
          </ToolbarButton>
          <ToolbarButton icon={<RotateCcwIcon />} onClick={reset} disabled={loading}>
            Làm mới
          </ToolbarButton>
          <ToolbarButton icon={<DownloadIcon />} onClick={exportPage} disabled={loading || rows.length === 0}>
            Xuất dữ liệu
          </ToolbarButton>
          <Link
            href="/shipments/tracking"
            className="inline-flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium text-foreground/85 transition hover:border-brand/40 hover:text-brand [&_svg]:size-3.5"
          >
            <ScanSearchIcon /> Tra hành trình
          </Link>
        </WorkspaceToolbar>

        <FilterGrid collapsed={collapsed}>
          <FilterField label="Mã vận đơn / tham chiếu">
            <FilterInput
              value={draft.query}
              onChange={(event) => setDraft((current) => ({ ...current, query: event.target.value }))}
              placeholder="Nhập mã để tra cứu"
              maxLength={120}
            />
          </FilterField>
          <FilterField label="Trạng thái">
            <FilterSelect
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ShipmentStatus | "" }))}
            >
              <option value="">Tất cả</option>
              {SHIPMENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {shipmentStatusLabel(value)}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
          <FilterField label="Vòng đời">
            <FilterSelect
              value={draft.lifecycleStatus}
              onChange={(event) =>
                setDraft((current) => ({ ...current, lifecycleStatus: event.target.value as ShipmentLifecycleStatus | "" }))
              }
            >
              <option value="">Tất cả</option>
              {SHIPMENT_LIFECYCLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {lifecycleLabel(value)}
                </option>
              ))}
            </FilterSelect>
          </FilterField>
        </FilterGrid>
      </form>

      {error ? (
        <p role="alert" className="rounded border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand">
          {error}
        </p>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        startIndex={(page - 1) * pageSize}
        emptyText={applied.query || applied.status || applied.lifecycleStatus ? "Không có vận đơn phù hợp bộ lọc" : "Chưa có vận đơn"}
        actionsWidth={130}
        actions={(row) => (
          <>
            <Link href={`/shipments/${encodeURIComponent(row.trackingCode)}`} className="text-xs text-brand hover:underline">
              Chi tiết
            </Link>
            <Link href={`/shipments/tracking?codes=${encodeURIComponent(row.trackingCode)}`} className="text-xs text-brand hover:underline">
              Hành trình
            </Link>
          </>
        )}
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        disabled={loading}
        onPageChange={(target) => void load(target, pageSize, applied, cursors)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          void load(1, size, applied, [null]);
        }}
      />
    </div>
  );
}
