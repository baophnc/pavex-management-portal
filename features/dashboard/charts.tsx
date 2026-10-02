"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/*
 * Small SVG charts for the overview. Marks follow one spec: columns at most 24px wide with a 4px
 * rounded top, 2px lines with ringed end dots, hairline gridlines. Every chart has a hover/focus
 * tooltip and a table view, so no value depends on colour or on hovering.
 */

const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round ticks (0, 2k, 4k…) covering [0, max], about four of them. */
export function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((value) => value >= raw) ?? raw;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** 1.250.000 → "1,3 tr"; 12.000 → "12 N". */
export function compact(value: number) {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} N`;
  return value.toLocaleString("vi-VN");
}

type Tip = { x: number; y: number; title: string; rows: { label: string; value: string; color?: string }[] };

function Tooltip({ tip }: { tip: Tip | null }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-md border bg-card px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="text-[0.65rem] text-muted-foreground">{tip.title}</p>
      {tip.rows.map((row) => (
        <p key={row.label} className="mt-0.5 flex items-center gap-1.5">
          {row.color ? <span className="h-0.5 w-3 rounded" style={{ background: row.color }} /> : null}
          <b className="tabular-nums">{row.value}</b>
          <span className="text-muted-foreground">{row.label}</span>
        </p>
      ))}
    </div>
  );
}

function Gridlines({ ticks, y, width, format }: { ticks: number[]; y: (value: number) => number; width: number; format: (value: number) => string }) {
  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"} strokeWidth={1} />
          <text x={PAD.left - 6} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
            {format(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Which x labels to print so they never touch: every nth, always the last. */
function labelEvery(count: number, width: number) {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor((width - PAD.left - PAD.right) / 56))));
}

export type ColumnDatum = { key: string; label: string; value: number };

/** One series of columns, e.g. fees per day. */
export function ColumnChart({
  data,
  format,
  name,
  height = 200,
}: {
  data: ColumnDatum[];
  format: (value: number) => string;
  /** What a column measures, for the tooltip and screen readers. */
  name: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const ticks = niceTicks(Math.max(0, ...data.map((item) => item.value)));
  const top = ticks[ticks.length - 1] || 1;
  const plotHeight = height - PAD.top - PAD.bottom;
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  const band = data.length ? (width - PAD.left - PAD.right) / data.length : 0;
  const barWidth = Math.max(2, Math.min(24, band - 2));
  const every = labelEvery(data.length, width);

  return (
    <div ref={ref} className="relative" onPointerLeave={() => { setTip(null); setActive(null); }}>
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={name}>
          <Gridlines ticks={ticks} y={y} width={width} format={(value) => compact(value)} />
          {data.map((item, index) => {
            const x = PAD.left + band * index + (band - barWidth) / 2;
            const barTop = y(item.value);
            const h = PAD.top + plotHeight - barTop;
            const r = Math.min(4, h, barWidth / 2);
            const show = (event?: { currentTarget: Element }) => {
              setActive(item.key);
              setTip({ x: x + barWidth / 2, y: barTop, title: item.label, rows: [{ label: name, value: format(item.value) }] });
              void event;
            };
            return (
              <g key={item.key}>
                {h > 0 ? (
                  <path
                    d={`M${x},${barTop + h} V${barTop + r} Q${x},${barTop} ${x + r},${barTop} H${x + barWidth - r} Q${x + barWidth},${barTop} ${x + barWidth},${barTop + r} V${barTop + h} Z`}
                    fill="var(--viz-1)"
                    opacity={active && active !== item.key ? 0.55 : 1}
                  />
                ) : null}
                <rect
                  x={PAD.left + band * index}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${item.label}: ${format(item.value)}`}
                  onPointerMove={() => show()}
                  onFocus={() => show()}
                  onBlur={() => { setTip(null); setActive(null); }}
                />
                {index % every === 0 || index === data.length - 1 ? (
                  <text x={PAD.left + band * index + band / 2} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                    {item.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

export type LineSeries = { name: string; color: string; values: number[] };

/** A few series over the same days, e.g. delivered and failed shipments. */
export function LineChart({
  labels,
  series,
  format,
  height = 200,
}: {
  labels: string[];
  series: LineSeries[];
  format: (value: number) => string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [index, setIndex] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(0, ...series.flatMap((item) => item.values)));
  const top = ticks[ticks.length - 1] || 1;
  const plotHeight = height - PAD.top - PAD.bottom;
  const right = PAD.right + 72; // room for end labels
  const plotWidth = width - PAD.left - right;
  const x = (i: number) => PAD.left + (labels.length <= 1 ? plotWidth / 2 : (i / (labels.length - 1)) * plotWidth);
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;
  const every = labelEvery(labels.length, width - 72);
  const last = labels.length - 1;
  // End labels only when they sit apart; otherwise the legend and tooltip carry identity.
  const endsApart = series.length < 2 || series.every((item, i) => series.every((other, j) => i === j || Math.abs(y(item.values[last] ?? 0) - y(other.values[last] ?? 0)) >= 14));

  function pick(clientX: number, element: Element) {
    const box = element.getBoundingClientRect();
    const relative = clientX - box.left - PAD.left;
    const i = labels.length <= 1 ? 0 : Math.round((relative / plotWidth) * (labels.length - 1));
    setIndex(Math.max(0, Math.min(last, i)));
  }

  const tip: Tip | null = index === null ? null : {
    x: x(index),
    y: Math.min(...series.map((item) => y(item.values[index] ?? 0))),
    title: labels[index],
    rows: series.map((item) => ({ label: item.name, value: format(item.values[index] ?? 0), color: item.color })),
  };

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={series.map((item) => item.name).join(", ")}
          tabIndex={0}
          onPointerMove={(event) => pick(event.clientX, event.currentTarget)}
          onPointerLeave={() => setIndex(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") setIndex((value) => Math.min(last, (value ?? -1) + 1));
            if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, (value ?? last + 1) - 1));
          }}
          onBlur={() => setIndex(null)}
          className="outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        >
          <Gridlines ticks={ticks} y={y} width={width - 72} format={(value) => compact(value)} />
          {labels.map((label, i) => (i % every === 0 || i === last ? (
            <text key={label + i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">{label}</text>
          ) : null))}
          {index !== null ? <line x1={x(index)} x2={x(index)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--viz-axis)" strokeWidth={1} /> : null}
          {series.map((item) => (
            <g key={item.name}>
              <polyline
                points={item.values.map((value, i) => `${x(i)},${y(value)}`).join(" ")}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx={x(last)} cy={y(item.values[last] ?? 0)} r={4} fill={item.color} stroke="var(--card)" strokeWidth={2} />
              {index !== null ? <circle cx={x(index)} cy={y(item.values[index] ?? 0)} r={4} fill={item.color} stroke="var(--card)" strokeWidth={2} /> : null}
              {endsApart ? (
                <text x={x(last) + 8} y={y(item.values[last] ?? 0)} dy="0.32em" className="fill-foreground text-[10px] font-semibold">
                  {item.name} {format(item.values[last] ?? 0)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

/** Legend for two or more series: a line key per series, matching the marks. */
export function Legend({ items, kind = "line" }: { items: { name: string; color: string }[]; kind?: "line" | "box" }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.name} className="inline-flex items-center gap-1.5">
          <span className={kind === "line" ? "h-0.5 w-3.5 rounded" : "size-2.5 rounded-sm"} style={{ background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  );
}

/** Horizontal bars with the value at the tip, e.g. fees per hub. */
export function BarList({ rows, format }: { rows: { key: string; label: string; value: number; note?: string }[]; format: (value: number) => string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[minmax(6rem,10rem)_1fr] items-center gap-3 text-xs" title={`${row.label}: ${format(row.value)}`}>
          <span className="truncate font-semibold">{row.label}</span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-3 rounded-r-[4px] bg-[var(--viz-1)]" style={{ width: `${Math.max(1, (row.value / max) * 75)}%` }} />
            <b className="shrink-0 tabular-nums">{format(row.value)}</b>
            {row.note ? <span className="shrink-0 text-muted-foreground">{row.note}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/** The same numbers as a table, for anyone who prefers rows or cannot see the marks. */
export function ChartTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer font-bold text-muted-foreground">Xem dạng bảng</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded border">
        <table className="w-full text-left tabular-nums">
          <thead className="sticky top-0 bg-muted text-[0.65rem] uppercase text-muted-foreground">
            <tr>{headers.map((header) => <th key={header} className="px-2 py-1.5">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={cn("border-t", i % 2 && "bg-muted/30")}>
                {row.map((cell, j) => <td key={j} className="px-2 py-1">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
