"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export const controlClass =
  "h-8 w-full min-w-0 rounded border bg-background px-2.5 text-xs outline-none transition placeholder:text-muted-foreground/80 hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

/** The row of actions above a list: search first, then data actions, with extras on the right. */
export function WorkspaceToolbar({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {trailing ? <div className="flex items-center gap-3">{trailing}</div> : null}
    </div>
  );
}

export function ToolbarButton({
  icon,
  tone = "default",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode; tone?: "primary" | "default" | "solid" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded border px-3 text-xs font-medium whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
        tone === "primary" && "border-brand bg-background text-brand hover:bg-brand/5",
        tone === "solid" && "border-brand bg-brand text-white hover:opacity-90",
        tone === "default" && "bg-background text-foreground/85 hover:border-brand/40 hover:text-brand",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

/** "Thu gọn" / "Mở rộng" for the filter area. */
export function CollapseToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
    >
      {collapsed ? "Mở rộng" : "Thu gọn"}
      {collapsed ? <ChevronDownIcon className="size-3.5" /> : <ChevronUpIcon className="size-3.5" />}
    </button>
  );
}

/**
 * Filters six to a row on wide screens, labels above the boxes. Collapsed, only the first row stays,
 * so the list gets the room.
 */
export function FilterGrid({ collapsed = false, children, className }: { collapsed?: boolean; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
        // One row is a label (1.25rem) over a box (2rem); the rest is clipped until expanded.
        collapsed && "max-h-[3.25rem] overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FilterField({
  label,
  required = false,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1 block truncate text-xs text-foreground/85">
        {required ? <span className="mr-0.5 text-brand">*</span> : null}
        {label} :
      </span>
      {children}
    </label>
  );
}

export const FilterInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function FilterInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});

export function FilterSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, "pr-7", className)} {...props}>
      {children}
    </select>
  );
}
