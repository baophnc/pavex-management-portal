"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/workspace/empty-state";
import { controlClass } from "@/components/workspace/filters";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Minimum width in pixels; the table scrolls sideways instead of squeezing columns. */
  width?: number;
  align?: "left" | "right" | "center";
  /** Makes the header clickable; sorts the rows on this page. */
  sortValue?: (row: T) => string | number | null;
};

type Sort = { key: string; direction: "asc" | "desc" } | null;

function compare(left: string | number | null, right: string | number | null) {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "vi");
}

/**
 * A dense list: row number on the left, actions pinned on the right, sortable headers, and a
 * horizontal scroll when there are more columns than room.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  startIndex = 0,
  actions,
  actionsWidth = 96,
  emptyText,
  maxHeight = "calc(100dvh - 21rem)",
  fill = true,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Number of rows on earlier pages, so the row number continues across pages. */
  startIndex?: number;
  actions?: (row: T) => ReactNode;
  actionsWidth?: number;
  emptyText?: string;
  maxHeight?: string;
  /** Keeps the list at full height so the pager stays at the bottom of the page, even with few rows. */
  fill?: boolean;
  className?: string;
}) {
  const [sort, setSort] = useState<Sort>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.sortValue) return rows;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => compare(column.sortValue!(left), column.sortValue!(right)) * direction);
  }, [columns, rows, sort]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  const headClass = "sticky top-0 z-10 h-9 border-b bg-muted px-3 text-left text-xs font-semibold whitespace-nowrap text-foreground/85";
  const cellClass = "h-9 border-b px-3 text-xs whitespace-nowrap";

  return (
    <div className={cn("relative rounded border bg-card", className)}>
      <div
        className="scrollbar-thin overflow-auto"
        style={fill ? { height: maxHeight, minHeight: "16rem" } : { maxHeight, minHeight: rows.length ? undefined : "12rem" }}
      >
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={cn(headClass, "sticky left-0 z-20 w-14 text-center")}>STT</th>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={cn(headClass, column.align === "right" && "text-right", column.align === "center" && "text-center")}
                    style={{ minWidth: column.width }}
                    aria-sort={active ? (sort!.direction === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn("inline-flex items-center gap-1 hover:text-brand", active && "text-brand")}
                      >
                        {column.header}
                        {active ? (
                          sort!.direction === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />
                        ) : (
                          <ChevronsUpDownIcon className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {actions ? (
                <th
                  className={cn(headClass, "sticky right-0 z-20 text-center shadow-[-1px_0_0_var(--border)]")}
                  style={{ minWidth: actionsWidth }}
                >
                  Thao tác
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => (
              <tr key={rowKey(row)} className="group">
                <td className={cn(cellClass, "sticky left-0 z-[1] bg-card text-center text-muted-foreground group-hover:bg-muted/70")}>
                  {startIndex + index + 1}
                </td>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      cellClass,
                      "group-hover:bg-muted/70",
                      column.align === "right" && "text-right tabular-nums",
                      column.align === "center" && "text-center",
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
                {actions ? (
                  <td className={cn(cellClass, "sticky right-0 z-[1] bg-card text-center shadow-[-1px_0_0_var(--border)] group-hover:bg-muted/70")}>
                    <div className="flex items-center justify-center gap-2">{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <EmptyState text={emptyText} /> : null}
      </div>
      {loading ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-card/60" role="status">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin text-brand" /> Đang tải dữ liệu...
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** A link-styled button for the actions column. */
export function RowAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-brand hover:underline">
      {children}
    </button>
  );
}

function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1]! > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

/** Total, rows per page, page buttons and "Nhảy tới", at the bottom right of a list. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
  disabled = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizes?: number[];
  disabled?: boolean;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const [jump, setJump] = useState("");
  const buttonClass =
    "grid h-7 min-w-7 place-items-center rounded border bg-background px-1.5 text-xs transition hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-40";

  function go(target: number) {
    const next = Math.min(pageCount, Math.max(1, target));
    if (next !== page) onPageChange(next);
  }

  return (
    <nav className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs" aria-label="Phân trang">
      <span className="text-muted-foreground">Tổng {total.toLocaleString("vi-VN")}</span>
      <select
        value={pageSize}
        onChange={(event) => onPageSizeChange(Number(event.target.value))}
        disabled={disabled}
        aria-label="Số dòng mỗi trang"
        className={cn(controlClass, "h-7 w-24")}
      >
        {pageSizes.map((size) => (
          <option key={size} value={size}>
            {size}/trang
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1">
        <button type="button" className={buttonClass} disabled={disabled || page <= 1} onClick={() => go(page - 1)} aria-label="Trang trước">
          <ChevronLeftIcon className="size-3.5" />
        </button>
        {pageWindow(page, pageCount).map((value, index) =>
          value === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => go(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(buttonClass, value === page && "border-brand bg-brand text-white hover:text-white")}
            >
              {value}
            </button>
          ),
        )}
        <button type="button" className={buttonClass} disabled={disabled || page >= pageCount} onClick={() => go(page + 1)} aria-label="Trang sau">
          <ChevronRightIcon className="size-3.5" />
        </button>
      </div>
      <form
        className="flex items-center gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          const target = Number.parseInt(jump, 10);
          if (Number.isFinite(target)) go(target);
          setJump("");
        }}
      >
        <span className="text-muted-foreground">Nhảy tới</span>
        <input
          value={jump}
          onChange={(event) => setJump(event.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          aria-label="Trang cần tới"
          placeholder={String(page)}
          disabled={disabled}
          className={cn(controlClass, "h-7 w-12 text-center")}
        />
      </form>
    </nav>
  );
}
