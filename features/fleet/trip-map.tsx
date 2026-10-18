"use client";

import { MinusIcon, NavigationIcon, PlusIcon } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { useMapTiles } from "@/features/fleet/map-tiles";
import { VectorBaseMap } from "@/features/fleet/vector-base-map";
import { rasterTileUrl } from "@/lib/map-tiles";
import { cn } from "@/lib/utils";

export type LatLng = { lat: number; lng: number };

export type MapMarker = LatLng & {
  id: string;
  label: string;
  tone: "brand" | "warning" | "danger" | "muted";
  headingDeg?: number | null;
};

/** A lane between two hubs, drawn as a straight line: dashed when nothing runs on it. */
export type MapLane = {
  id: string;
  from: LatLng;
  to: LatLng;
  tone?: "brand" | "muted" | "warning" | "danger" | "success";
  dashed?: boolean;
  /** Line width in pixels; thicker lanes carry more. */
  width?: number;
  label?: string;
  /** Pixels to the right of the direction of travel, so A→B and B→A sit side by side. */
  offset?: number;
};

/** A hub: a small square with its code, always labelled. */
export type MapPlace = LatLng & { id: string; code: string; name: string };

type View = { center: LatLng; zoom: number };

const TILE = 256;
const MIN_ZOOM = 4;
const MAX_ZOOM = 18;
const VIETNAM: View = { center: { lat: 16.2, lng: 106.3 }, zoom: 5 };

function project({ lat, lng }: LatLng, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number): LatLng {
  const scale = TILE * 2 ** zoom;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (x / scale) * 360 - 180 };
}

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** The closest view that shows every point with some margin. */
function fitView(points: LatLng[], width: number, height: number): View {
  if (points.length === 0 || width === 0 || height === 0) return VIETNAM;
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);
  const center = { lat: (south + north) / 2, lng: (west + east) / 2 };
  if (points.length === 1) return { center, zoom: 13 };
  for (let zoom = 16; zoom > MIN_ZOOM; zoom -= 1) {
    const topLeft = project({ lat: north, lng: west }, zoom);
    const bottomRight = project({ lat: south, lng: east }, zoom);
    if (bottomRight.x - topLeft.x <= width - 96 && bottomRight.y - topLeft.y <= height - 96) return { center, zoom };
  }
  return { center, zoom: MIN_ZOOM };
}

const laneColor: Record<NonNullable<MapLane["tone"]>, string> = {
  brand: "var(--brand)",
  muted: "#64748b",
  warning: "#f59e0b",
  danger: "#dc2626",
  success: "#16a34a",
};

const toneClass: Record<MapMarker["tone"], string> = {
  brand: "bg-brand text-white",
  warning: "bg-amber-500 text-white",
  danger: "bg-destructive text-white",
  muted: "bg-slate-500 text-white",
};

/**
 * A small slippy map: truck markers, one track line, drag to pan, buttons or double-click to zoom. It re-centres
 * on [focus] whenever [focusKey] changes. The base map is the server's MAP_TILE_PROVIDER (lib/map-tiles.ts):
 * raster tiles drawn here, or a vector style drawn by MapLibre underneath the same overlays.
 */
export function TripMap({
  markers = [],
  path = [],
  lanes = [],
  places = [],
  focus,
  focusKey,
  selectedId = null,
  onSelect,
  className,
}: {
  markers?: MapMarker[];
  path?: LatLng[];
  lanes?: MapLane[];
  places?: MapPlace[];
  focus: LatLng[];
  focusKey: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const baseMap = useMapTiles();
  const drag = useRef<{ pointerX: number; pointerY: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  // The user's own pan/zoom, kept until the map is asked to focus on something else.
  const [override, setOverride] = useState<(View & { key: string }) | null>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const view = override?.key === focusKey ? override : fitView(focus, size.width, size.height);
  const center = project(view.center, view.zoom);
  const left = center.x - size.width / 2;
  const top = center.y - size.height / 2;
  const tileCount = 2 ** view.zoom;

  const tiles: { key: string; x: number; y: number; url: string }[] = [];
  if (size.width > 0 && baseMap?.kind === "raster") {
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.width) / TILE); tx += 1) {
      for (let ty = Math.max(0, Math.floor(top / TILE)); ty <= Math.min(tileCount - 1, Math.floor((top + size.height) / TILE)); ty += 1) {
        const wrapped = ((tx % tileCount) + tileCount) % tileCount;
        tiles.push({ key: `${view.zoom}/${tx}/${ty}`, x: tx * TILE - left, y: ty * TILE - top, url: rasterTileUrl(baseMap.tileUrl, view.zoom, wrapped, ty) });
      }
    }
  }

  const toScreen = (point: LatLng) => {
    const projected = project(point, view.zoom);
    return { x: projected.x - left, y: projected.y - top };
  };
  const line = path.map((point) => {
    const { x, y } = toScreen(point);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const setView = (next: View) => setOverride({ key: focusKey, center: next.center, zoom: clampZoom(next.zoom) });
  const zoomBy = (delta: number) => setView({ center: view.center, zoom: view.zoom + delta });

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, centerX: center.x, centerY: center.y };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    setView({
      center: unproject(start.centerX - (event.clientX - start.pointerX), start.centerY - (event.clientY - start.pointerY), view.zoom),
      zoom: view.zoom,
    });
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div
      ref={container}
      className={cn("relative touch-none select-none overflow-hidden rounded-xl border bg-muted/40", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => zoomBy(1)}
    >
      {baseMap?.kind === "vector" && size.width > 0 ? (
        <VectorBaseMap styleUrl={baseMap.styleUrl} attribution={baseMap.attribution} center={view.center} zoom={view.zoom} />
      ) : null}
      {tiles.map((tile) => (
        <div
          key={tile.key}
          aria-hidden
          className="absolute size-64 bg-cover"
          style={{ left: tile.x, top: tile.y, backgroundImage: `url(${tile.url})` }}
        />
      ))}

      {lanes.length ? (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          {lanes.map((lane) => {
            const start = toScreen(lane.from);
            const end = toScreen(lane.to);
            const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
            const shiftX = lane.offset ? (-(end.y - start.y) / length) * lane.offset : 0;
            const shiftY = lane.offset ? ((end.x - start.x) / length) * lane.offset : 0;
            const a = { x: start.x + shiftX, y: start.y + shiftY };
            const b = { x: end.x + shiftX, y: end.y + shiftY };
            const width = lane.width ?? 3;
            return (
              <g key={lane.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="white" strokeWidth={width + 3} strokeLinecap="round" opacity={0.85} />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={laneColor[lane.tone ?? "muted"]}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeDasharray={lane.dashed ? "8 7" : undefined}
                />
                {lane.label ? (
                  // A third of the way along, so the labels of A→B and B→A do not meet in the middle.
                  <text
                    x={a.x + (b.x - a.x) / 3 + shiftX * 3}
                    y={a.y + (b.y - a.y) / 3 + shiftY * 3}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#0f172a"
                    className="text-[11px] font-bold"
                    paintOrder="stroke"
                    stroke="white"
                    strokeWidth={4}
                  >
                    {lane.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}

      {places.map((place) => {
        const { x, y } = toScreen(place);
        if (x < -60 || y < -40 || x > size.width + 60 || y > size.height + 40) return null;
        return (
          <div key={place.id} title={place.name} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
            <span className="block size-3 rotate-45 border-2 border-white bg-slate-900 shadow" />
            <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-background/90 px-1.5 text-[0.62rem] font-black shadow-sm">
              {place.code}
            </span>
          </div>
        );
      })}

      {line ? (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <polyline points={line} fill="none" stroke="white" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />
          <polyline points={line} fill="none" stroke="var(--brand)" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : null}

      {markers.map((marker) => {
        const { x, y } = toScreen(marker);
        if (x < -40 || y < -40 || x > size.width + 40 || y > size.height + 40) return null;
        const selected = marker.id === selectedId;
        return (
          <button
            key={marker.id}
            type="button"
            title={marker.label}
            aria-label={marker.label}
            aria-pressed={selected}
            onClick={() => onSelect?.(marker.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
            style={{ left: x, top: y }}
          >
            <span className={cn(
              "grid size-8 place-items-center rounded-full border-2 border-white shadow-md",
              toneClass[marker.tone],
              selected && "size-10 ring-4 ring-brand/30",
            )}>
              <NavigationIcon className="size-4" style={{ transform: `rotate(${marker.headingDeg ?? 0}deg)` }} />
            </span>
            {selected ? (
              <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-background/95 px-2 py-0.5 text-[0.65rem] font-black shadow">
                {marker.label}
              </span>
            ) : null}
          </button>
        );
      })}

      <div className="absolute right-3 top-3 grid overflow-hidden rounded-md border bg-background shadow-sm">
        <button type="button" aria-label="Phóng to" className="grid size-8 place-items-center hover:bg-muted" onClick={() => zoomBy(1)}>
          <PlusIcon className="size-4" />
        </button>
        <button type="button" aria-label="Thu nhỏ" className="grid size-8 place-items-center border-t hover:bg-muted" onClick={() => zoomBy(-1)}>
          <MinusIcon className="size-4" />
        </button>
      </div>
      {baseMap?.kind === "raster" ? (
        <p className="absolute bottom-0 right-0 bg-background/85 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">
          <a href={baseMap.attribution.href} target="_blank" rel="noreferrer" className="underline">{baseMap.attribution.label}</a>
        </p>
      ) : null}
      {baseMap?.kind === "none" ? (
        <p className="absolute bottom-0 right-0 bg-background/85 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground">
          Chưa cấu hình bản đồ nền
        </p>
      ) : null}
    </div>
  );
}
