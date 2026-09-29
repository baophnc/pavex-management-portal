"use client";

import { LoaderCircleIcon } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { textareaClassName } from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

/** Confirmation dialog with an optional text input; a required input blocks confirming while empty. */
export function FinanceDialog({
  open,
  title,
  description,
  confirmLabel,
  input,
  destructive = false,
  loading = false,
  children,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean };
  destructive?: boolean;
  loading?: boolean;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  if (!open) return null;
  const close = () => { setValue(""); onCancel(); };
  const blocked = Boolean(input?.required && !value.trim());
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4" role="presentation" onClick={close}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-base font-black">{title}</h2>
        {description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p> : null}
        {children ? <div className="mt-4 grid gap-3">{children}</div> : null}
        {input ? (
          <label className="mt-4 grid gap-1.5 text-xs font-bold">
            <span>{input.label}{input.required ? "" : " (không bắt buộc)"}</span>
            {input.multiline ? (
              <textarea value={value} maxLength={500} disabled={loading} placeholder={input.placeholder} className={textareaClassName} onChange={(event) => setValue(event.target.value)} />
            ) : (
              <input value={value} maxLength={100} disabled={loading} placeholder={input.placeholder} className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" onChange={(event) => setValue(event.target.value)} />
            )}
          </label>
        ) : null}
        <div className="mt-5 flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={loading} onClick={close}>Hủy</Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={loading || blocked}
            onClick={() => { const text = value.trim(); setValue(""); void onConfirm(text); }}
          >
            {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ tone, children }: { tone: "brand" | "success" | "warning" | "muted" | "danger"; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[0.62rem] font-black",
      tone === "brand" && "border-brand/20 bg-brand/10 text-brand",
      tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      tone === "warning" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      tone === "muted" && "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300",
      tone === "danger" && "border-destructive/20 bg-destructive/10 text-destructive",
    )}>
      {children}
    </span>
  );
}
