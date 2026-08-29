"use client";

import {
  Building2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleGaugeIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const selectClassName =
  "h-10 w-full rounded-md border bg-background px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50";

export const textareaClassName =
  "min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2.5 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50";



export type ConfirmActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loading?: boolean;
  destructive?: boolean;
  reason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
};

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  loading = false,
  destructive = false,
  reason = false,
  reasonLabel = "Lý do (không bắt buộc)",
  reasonPlaceholder = "Ghi chú để lưu vào nhật ký thay đổi...",
  onCancel,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [reasonText, setReasonText] = useState("");

  if (!open) return null;

  function cancel() {
    setReasonText("");
    onCancel();
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4"
      role="presentation"
      onClick={() => {
        if (!loading) cancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full",
              destructive ? "bg-destructive/10 text-destructive" : "bg-brand/10 text-brand",
            )}
          >
            <TriangleAlertIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-black">{title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>

        {reason ? (
          <label className="mt-4 grid gap-1.5 text-xs font-bold">
            <span>{reasonLabel}</span>
            <textarea
              value={reasonText}
              maxLength={500}
              disabled={loading}
              className={textareaClassName}
              placeholder={reasonPlaceholder}
              onChange={(event) => setReasonText(event.target.value)}
            />
            <span className="text-right text-[0.62rem] font-normal text-muted-foreground">
              {reasonText.length}/500
            </span>
          </label>
        ) : null}

        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={loading} onClick={cancel}>
            Hủy
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onClick={() => {
              const value = reasonText.trim();
              setReasonText("");
              void onConfirm(value);
            }}
          >
            {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ActionPolicyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2.5 text-[0.68rem] leading-5 text-muted-foreground">
      {children}
    </div>
  );
}

export function NetworkPageHeader({
  eyebrow,
  title,
  description,
  actions,
  help,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  help?: {
    title?: string;
    description: string;
    bullets?: string[];
  };
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <section className="relative rounded-xl border bg-card">
      <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
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
        <div className="flex shrink-0 flex-wrap gap-2">
          {help ? (
            <Button type="button" variant="outline" onClick={() => setHelpOpen(true)}>
              <span className="grid size-4 place-items-center rounded-full border text-[0.65rem] font-black">?</span>
              Trang này làm gì?
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
      {helpOpen && help ? (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={help.title ?? `Giới thiệu trang ${title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-brand">Hướng dẫn nhanh</p>
                <h2 className="mt-1 text-lg font-black">{help.title ?? title}</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setHelpOpen(false)}>
                Đóng
              </Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{help.description}</p>
            {help.bullets?.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {help.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 rounded-lg bg-muted/35 px-3 py-2">
                    <span className="font-black text-brand">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
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
      {active ? "Đang hoạt động" : "Ngừng hoạt động"}
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

export function LoadingCard({ label = "Đang tải mạng lưới..." }: { label?: string }) {
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
