"use client";

import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleGaugeIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const selectClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClassName =
  "min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2.5 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50";

export function NetworkPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
              <CircleGaugeIcon className="size-4" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
                {eyebrow}
              </p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">
                {title}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
            {description}
          </p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black",
        active
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      )}
    >
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}

export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: string;
}) {
  return (
    <div className="p-3.5 sm:p-4">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-black tabular-nums sm:text-2xl">
        {value}
      </p>
      {note ? <p className="mt-1 text-[0.65rem] text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-[0.65rem] font-normal leading-5 text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function NetworkError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-destructive/25 p-5">
      <div className="flex items-start gap-3">
        <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-destructive">{message}</p>
          {onRetry ? (
            <Button variant="outline" className="mt-3" onClick={onRetry}>
              <RefreshCwIcon className="size-4" />
              Thử lại
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export function LoadingCard({ label = "Đang tải Network..." }: { label?: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-xl border bg-card">
      <div className="text-center">
        <LoaderCircleIcon className="mx-auto size-6 animate-spin text-brand" />
        <p className="mt-3 text-xs font-bold text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center p-6 text-center">
      <div>
        <Building2Icon className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-3 text-sm font-black">{title}</p>
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function Pager({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="font-bold text-muted-foreground">
        {totalItems.toLocaleString("vi-VN")} bản ghi · Trang {Math.min(page, pages)}/{pages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeftIcon className="size-3.5" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Sau
          <ChevronRightIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-card p-4 transition hover:border-brand/30 hover:bg-brand/[0.025]"
    >
      <p className="text-sm font-black">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </Link>
  );
}
