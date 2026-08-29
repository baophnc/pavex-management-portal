"use client";

import { CircleDollarSignIcon, LoaderCircleIcon, RefreshCwIcon, ShieldAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RatePlanStatus } from "@/features/pricing/contracts";
import { cn } from "@/lib/utils";

export const selectClassName =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";
export const textareaClassName =
  "min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/15";

export function PricingPageHeader({
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
  help?: { title?: string; description: string; bullets?: string[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="relative rounded-xl border bg-card">
      <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
              <CircleDollarSignIcon className="size-4" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">{eyebrow}</p>
              <h1 className="mt-0.5 text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {help ? (
            <Button type="button" variant="outline" onClick={() => setOpen(true)}>
              <span className="grid size-4 place-items-center rounded-full border text-[0.65rem] font-black">?</span>
              Trang này làm gì?
            </Button>
          ) : null}
          {actions}
        </div>
      </div>
      {open && help ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" role="presentation" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-brand">Hướng dẫn nhanh</p>
                <h2 className="mt-1 text-lg font-black">{help.title ?? title}</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Đóng</Button>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{help.description}</p>
            {help.bullets?.length ? (
              <ul className="mt-4 grid gap-2 text-sm">
                {help.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2 rounded-lg bg-muted/35 px-3 py-2">
                    <span className="font-black text-brand">•</span><span>{bullet}</span>
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

export function PricingStatusBadge({ status }: { status: RatePlanStatus }) {
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] font-black",
      status === "ACTIVE" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      status === "DRAFT" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      status === "RETIRED" && "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    )}>
      {status === "ACTIVE" ? "Đang áp dụng" : status === "DRAFT" ? "Bản nháp" : "Đã ngừng áp dụng"}
    </span>
  );
}

export function PricingError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-destructive/25 p-5">
      <div className="flex items-start gap-3">
        <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-destructive">{message}</p>
          {onRetry ? <Button variant="outline" className="mt-3" onClick={onRetry}><RefreshCwIcon className="size-4" />Thử lại</Button> : null}
        </div>
      </div>
    </Card>
  );
}

export function PricingLoading({ label = "Đang tải dữ liệu Pricing..." }: { label?: string }) {
  return <div className="grid min-h-52 place-items-center rounded-xl border bg-card"><div className="flex items-center gap-2 text-sm font-bold text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" />{label}</div></div>;
}

export function PricingMetric({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return <div className="p-4"><p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1.5 text-xl font-black tabular-nums sm:text-2xl">{value}</p>{note ? <p className="mt-1 text-[0.65rem] text-muted-foreground">{note}</p> : null}</div>;
}

export function PricingField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-bold"><span>{label}</span>{children}{hint ? <span className="text-[0.65rem] font-normal leading-5 text-muted-foreground">{hint}</span> : null}</label>;
}

export function PricingConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  reason = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  reason?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4" role="presentation" onClick={() => { setText(""); onCancel(); }}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-base font-black">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
        {reason ? <PricingField label="Lý do (không bắt buộc)"><textarea value={text} maxLength={500} disabled={loading} className={textareaClassName} onChange={(event) => setText(event.target.value)} placeholder="Ghi chú để người khác hiểu lý do thay đổi..." /></PricingField> : null}
        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={loading} onClick={() => { setText(""); onCancel(); }}>Hủy</Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} disabled={loading} onClick={() => { const reasonText = text.trim(); setText(""); void onConfirm(reasonText); }}>{loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

export function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

export function percent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value * 100)}%`;
}

export function dateTime(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
