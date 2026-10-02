"use client";

import { useHubDirectory } from "@/features/directory/names";
import { type LatLng, type MapLane, type MapPlace, TripMap } from "@/features/fleet/trip-map";
import type { HubLane } from "@/features/network/contracts";

export type LaneStyle = Pick<MapLane, "tone" | "dashed" | "width" | "label">;

/**
 * The network's lanes on a map, between the hubs that have coordinates. [styleOf] decides how a
 * lane looks (default: faint and dashed); lanes whose hubs have no coordinates are listed below.
 */
export function LaneMap({
  lanes,
  styleOf,
  focusLaneIds,
  focusKey,
  className,
}: {
  lanes: HubLane[];
  styleOf?: (lane: HubLane) => LaneStyle | null;
  /** Lanes to zoom to; all lanes when empty. */
  focusLaneIds?: string[];
  focusKey: string;
  className?: string;
}) {
  const hubs = useHubDirectory();
  const point = (hubId: string): LatLng | null => {
    const hub = hubs.get(hubId);
    return hub && hub.latitude !== null && hub.longitude !== null ? { lat: hub.latitude, lng: hub.longitude } : null;
  };
  const pairs = new Set(lanes.map((lane) => `${lane.fromHubId}>${lane.toHubId}`));

  const drawn: MapLane[] = [];
  const missing: HubLane[] = [];
  for (const lane of lanes) {
    const from = point(lane.fromHubId);
    const to = point(lane.toHubId);
    if (!from || !to) {
      missing.push(lane);
      continue;
    }
    const style = styleOf?.(lane) ?? { tone: "muted", dashed: true, width: 2 };
    const twoWay = pairs.has(`${lane.toHubId}>${lane.fromHubId}`);
    drawn.push({ id: lane.id, from, to, offset: twoWay ? 4 : 0, ...style });
  }

  const placeIds = new Set(lanes.flatMap((lane) => [lane.fromHubId, lane.toHubId]));
  const places: MapPlace[] = [...placeIds].flatMap((id) => {
    const hub = hubs.get(id);
    const at = point(id);
    return hub && at ? [{ id, code: hub.code, name: hub.name, ...at }] : [];
  });

  const focusIds = new Set(focusLaneIds ?? []);
  const focus = (focusIds.size ? drawn.filter((lane) => focusIds.has(lane.id)) : drawn).flatMap((lane) => [lane.from, lane.to]);

  return (
    <div className="grid gap-2">
      <TripMap className={className ?? "h-80"} lanes={drawn} places={places} focus={focus.length ? focus : places} focusKey={`${focusKey}|${hubs.size}`} />
      {missing.length ? (
        <p className="text-[0.68rem] text-muted-foreground">
          {missing.length} tuyến chưa hiện trên bản đồ vì bưu cục chưa có toạ độ ({missing.slice(0, 3).map((lane) => `${lane.fromHubCode} → ${lane.toHubCode}`).join(", ")}
          {missing.length > 3 ? "…" : ""}). Nhập toạ độ ở trang Điểm trung chuyển.
        </p>
      ) : null}
    </div>
  );
}
