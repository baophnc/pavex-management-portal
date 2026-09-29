"use client";

import { useMemo } from "react";

import { code128Widths } from "@/lib/barcode/code128";
import { cn } from "@/lib/utils";

const QUIET_ZONE = 10;
const BAR_HEIGHT = 50;

/** SVG path of the bars, one unit per module, and the total width including both quiet zones. */
function barsPath(widths: number[]) {
  let x = QUIET_ZONE;
  const bars: string[] = [];
  widths.forEach((width, index) => {
    if (index % 2 === 0) bars.push(`M${x} 0h${width}v${BAR_HEIGHT}h-${width}z`);
    x += width;
  });
  return { path: bars.join(""), total: x + QUIET_ZONE };
}

/**
 * Code 128 barcode drawn as SVG, at 2px per module until the container is narrower. Staff can
 * scan it straight off the screen with the field app when a parcel label is missing or damaged.
 */
export function Barcode({ value, label, className }: { value: string; label: string; className?: string }) {
  const bars = useMemo(() => {
    try {
      return barsPath(code128Widths(value));
    } catch {
      return null;
    }
  }, [value]);

  if (!bars) {
    return <p className="text-xs text-muted-foreground">Không tạo được mã vạch cho {value}.</p>;
  }

  const { path, total } = bars;

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${total} ${BAR_HEIGHT}`}
      width={total * 2}
      className={cn("h-auto max-w-full bg-white", className)}
      shapeRendering="crispEdges"
    >
      <rect width={total} height={BAR_HEIGHT} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
