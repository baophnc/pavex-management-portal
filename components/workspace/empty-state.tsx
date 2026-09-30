import { cn } from "@/lib/utils";

/** An empty parcel drawn in the brand tint, shown wherever a list or record has nothing yet. */
export function EmptyState({ text = "Chưa có dữ liệu", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("grid place-items-center gap-2 py-10 text-center", className)}>
      <svg viewBox="0 0 120 96" className="h-20 w-24 text-brand" aria-hidden="true">
        <ellipse cx="60" cy="86" rx="40" ry="6" className="fill-current opacity-10" />
        <path d="M24 38 60 26l36 12v36L60 86 24 74Z" className="fill-current opacity-15" />
        <path d="M24 38 60 50l36-12M60 50v36" className="stroke-current opacity-50" fill="none" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 38 60 26l36 12v36L60 86 24 74Z" className="stroke-current opacity-60" fill="none" strokeWidth="2" strokeLinejoin="round" />
        <path d="M24 38 12 26l36-12 12 12M96 38l12-12-36-12-12 12" className="stroke-current opacity-45" fill="none" strokeWidth="2" strokeLinejoin="round" strokeDasharray="4 4" />
        <circle cx="94" cy="12" r="3" className="fill-current opacity-40" />
        <circle cx="20" cy="60" r="2" className="fill-current opacity-30" />
      </svg>
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
