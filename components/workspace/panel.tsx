"use client";

import { ChevronDownIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A white block with a red-marked title, optionally folding away like the sections of a long form. */
export function Panel({
  title,
  actions,
  collapsible = false,
  defaultOpen = true,
  className,
  bodyClassName,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("rounded-md border bg-card", className)}>
      {title ? (
        <header className="flex min-h-10 items-center gap-2 border-b px-3">
          <span className="h-3.5 w-[3px] shrink-0 rounded-full bg-brand" aria-hidden="true" />
          <h2 className="min-w-0 flex-1 truncate text-[0.8rem] font-bold">{title}</h2>
          {actions}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Thu gọn" : "Mở rộng"}
              className="grid size-7 place-items-center rounded text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <ChevronDownIcon className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
            </button>
          ) : null}
        </header>
      ) : null}
      {open ? <div className={cn("p-3", bodyClassName)}>{children}</div> : null}
    </section>
  );
}

/** Label : value rows, the way a record is read at a glance. */
export function InfoList({
  items,
  labelWidth = "8.5rem",
  className,
}: {
  items: Array<[string, ReactNode]>;
  labelWidth?: string;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-x-2 gap-y-1.5 text-xs", className)} style={{ gridTemplateColumns: `${labelWidth} minmax(0, 1fr)` }}>
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">
            <span className="mr-1.5 text-muted-foreground">:</span>
            {value === null || value === undefined || value === "" ? "—" : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A card of related fields inside a panel, titled in red like the blocks of a record page. */
export function InfoCard({ title, className, children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-md border bg-card p-3", className)}>
      <p className="mb-2.5 text-xs font-bold text-brand">{title}</p>
      {children}
    </div>
  );
}

export type StatRow = { label: string; value: ReactNode };

/** One indicator: its name, the figure, and a few supporting rows underneath. */
export function StatTile({
  label,
  hint,
  value,
  rows,
  href,
  tone = "default",
}: {
  label: string;
  hint?: string;
  value: ReactNode;
  rows?: StatRow[];
  href?: string;
  tone?: "default" | "warning";
}) {
  const body = (
    <>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="truncate">{label}</span>
        {hint ? (
          <span title={hint} className="shrink-0">
            <InfoIcon className="size-3" aria-label={hint} />
          </span>
        ) : null}
      </p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "warning" ? "text-brand" : "")}>{value}</p>
      {rows?.length ? (
        <dl className="mt-2 space-y-0.5 text-[0.68rem] text-muted-foreground">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-3">
              <dt className="w-20 shrink-0">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
  const className = "block min-w-0 bg-card px-4 py-3";
  return href ? (
    <Link href={href} className={cn(className, "transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Tiles in a row separated by thin rules, as indicator strips are laid out. */
export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    // Each tile draws its right and bottom rule; the outer edge clips the ones on the last column and row.
    <div className={cn("grid overflow-hidden rounded border bg-card sm:grid-cols-2 lg:grid-cols-4 [&>*]:-mr-px [&>*]:-mb-px [&>*]:border-r [&>*]:border-b", className)}>
      {children}
    </div>
  );
}
