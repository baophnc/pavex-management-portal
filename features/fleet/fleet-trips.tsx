"use client";

import { BatteryMediumIcon, ClockIcon, GaugeIcon, RefreshCwIcon, RouteIcon, SignalZeroIcon, TruckIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { UserName } from "@/features/directory/names";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fleetApi, fleetErrorMessage } from "@/features/fleet/api";
import {
  type FleetHubRef,
  type FleetTrack,
  type FleetTrip,
  type FleetTripStatus,
  fleetEndSourceLabels,
  fleetStartSourceLabels,
} from "@/features/fleet/contracts";
import { type LatLng, type MapLane, type MapMarker, type MapPlace, TripMap } from "@/features/fleet/trip-map";
import { StatusPill } from "@/features/finance/ui";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import { dateTime, PricingError, PricingLoading, PricingPageHeader, selectClassName } from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

const REFRESH_MS = 10_000;

function sinceText(value: string | null) {
  if (!value) return "chưa có";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút trước`;
}

function speedText(mps: number | null | undefined) {
  return mps == null ? "—" : `${Math.round(mps * 3.6)} km/h`;
}

function tripTone(trip: FleetTrip): MapMarker["tone"] {
  if (trip.status === "ARRIVED") return "muted";
  if (trip.signalLost) return "danger";
  if (trip.late) return "warning";
  return "brand";
}

function TripBadges({ trip }: { trip: FleetTrip }) {
  if (trip.status === "ARRIVED") return <StatusPill tone="success">Đã tới</StatusPill>;
  return (
    <div className="flex flex-wrap gap-1">
      <StatusPill tone="brand">Đang chạy</StatusPill>
      {trip.late ? <StatusPill tone="warning">Trễ {trip.minutesLate} phút</StatusPill> : null}
      {trip.signalLost ? <StatusPill tone="danger">Mất tín hiệu</StatusPill> : null}
      {trip.position?.mocked ? <StatusPill tone="warning">Vị trí giả lập</StatusPill> : null}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof ClockIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

function TripDetail({ trip, track }: { trip: FleetTrip; track: FleetTrack | null }) {
  const position = trip.position;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-muted-foreground">{trip.laneCode}</p>
          <p className="text-base font-black">{trip.fromHub.name} → {trip.toHub.name}</p>
          <p className="text-xs text-muted-foreground">
            {trip.driverEmail ?? <UserName id={trip.driverUserId} fallback="Tài xế" />}
            {trip.vehiclePlate ? ` · Xe ${trip.vehiclePlate}` : ""}
          </p>
        </div>
        <TripBadges trip={trip} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Fact icon={ClockIcon} label="Kế hoạch" value={`${dateTime(trip.plannedDepartureAt)} → ${dateTime(trip.plannedArrivalAt)}`} />
        <Fact
          icon={ClockIcon}
          label="Thực tế"
          value={`${dateTime(trip.startedAt)} → ${trip.arrivedAt ? dateTime(trip.arrivedAt) : "đang chạy"}`}
        />
        <Fact
          icon={RouteIcon}
          label="Đã đi"
          value={`${trip.travelledKm.toLocaleString("vi-VN")} km${trip.distanceKm ? ` / ${Number(trip.distanceKm).toLocaleString("vi-VN")} km tuyến` : ""}`}
        />
        <Fact icon={GaugeIcon} label="Tốc độ" value={speedText(position?.speedMps)} />
        <Fact icon={SignalZeroIcon} label="Vị trí cập nhật" value={sinceText(position?.receivedAt ?? null)} />
        <Fact icon={BatteryMediumIcon} label="Pin điện thoại" value={position?.batteryPct == null ? "—" : `${position.batteryPct}%`} />
      </div>
      <p className="mt-4 text-[0.68rem] leading-5 text-muted-foreground">
        {fleetStartSourceLabels[trip.startSource]}
        {trip.endSource ? ` · ${fleetEndSourceLabels[trip.endSource]}` : ""}
        {track ? ` · ${track.points.length.toLocaleString("vi-VN")} điểm GPS${track.thinned ? " (đã lược bớt để hiển thị)" : ""}` : ""}
      </p>
    </Card>
  );
}

/**
 * Line-haul trucks on the map for hub managers (their own hubs) and head office (every hub).
 * In-progress trips refresh every ten seconds.
 */
function hubPoint(hub: FleetHubRef): LatLng | null {
  return hub.lat !== null && hub.lng !== null ? { lat: hub.lat, lng: hub.lng } : null;
}

export function FleetTrips() {
  const [status, setStatus] = useState<FleetTripStatus>("IN_PROGRESS");
  const [hubId, setHubId] = useState("");
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [trips, setTrips] = useState<FleetTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [track, setTrack] = useState<FleetTrack | null>(null);

  useEffect(() => {
    let active = true;
    getScopedHubs().then((items) => { if (active) setHubs(items); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fleetApi.list(status, hubId)
      .then((items) => {
        if (!active) return;
        setTrips(items);
        setError(null);
      })
      .catch((reason) => { if (active) setError(fleetErrorMessage(reason, "Không thể tải danh sách chuyến xe.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status, hubId, refreshKey]);

  useEffect(() => {
    if (status !== "IN_PROGRESS") return;
    const timer = window.setInterval(() => setRefreshKey((value) => value + 1), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [status]);

  const selected = trips.find((trip) => trip.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    fleetApi.track(selectedId)
      .then((value) => { if (active) setTrack(value); })
      .catch(() => { if (active) setTrack(null); });
    return () => { active = false; };
  }, [selectedId, refreshKey]);

  const changeFilter = (next: { status?: FleetTripStatus; hubId?: string }) => {
    setLoading(true);
    setSelectedId(null);
    setTrack(null);
    if (next.status) setStatus(next.status);
    if (next.hubId !== undefined) setHubId(next.hubId);
  };
  const select = (id: string) => {
    setTrack(null);
    setSelectedId((current) => (current === id ? null : id));
  };

  const markers: MapMarker[] = trips.flatMap((trip) => trip.position ? [{
    id: trip.id,
    lat: trip.position.lat,
    lng: trip.position.lng,
    headingDeg: trip.position.headingDeg,
    label: `${trip.fromHub.code} → ${trip.toHub.code}${trip.vehiclePlate ? ` · ${trip.vehiclePlate}` : ""}`,
    tone: tripTone(trip),
  }] : []);
  const path = selected && track?.tripId === selected.id ? track.points : [];
  // Each trip's lane from hub to hub: the selected one in brand colour, the others faint.
  const lanes: MapLane[] = trips.flatMap((trip) => {
    const from = hubPoint(trip.fromHub);
    const to = hubPoint(trip.toHub);
    if (!from || !to) return [];
    const chosen = trip.id === selectedId;
    return [{ id: trip.id, from, to, tone: chosen ? "brand" : "muted", dashed: !chosen, width: chosen ? 4 : 2 }];
  });
  const places: MapPlace[] = [...new Map(trips.flatMap((trip) => [trip.fromHub, trip.toHub]).map((hub) => [hub.id, hub])).values()]
    .flatMap((hub) => {
      const point = hubPoint(hub);
      return point ? [{ id: hub.id, code: hub.code, name: hub.name, ...point }] : [];
    });
  const selectedLane = lanes.find((lane) => lane.id === selectedId);
  const focus = selected
    ? [...(path.length ? path : markers.filter((marker) => marker.id === selected.id)), ...(selectedLane ? [selectedLane.from, selectedLane.to] : [])]
    : [...markers, ...places];

  const counts = {
    running: trips.filter((trip) => trip.status === "IN_PROGRESS").length,
    late: trips.filter((trip) => trip.late).length,
    lost: trips.filter((trip) => trip.signalLost).length,
  };

  return (
    <div className="grid gap-5">
      <PricingPageHeader
        eyebrow="Vận hành"
        title="Xe trung chuyển"
        description="Vị trí các xe chạy giữa bưu cục, kho tỉnh và trung tâm miền. Trưởng bưu cục chỉ thấy xe đi hoặc đến bưu cục mình."
        actions={(
          <Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }}>
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Tải lại
          </Button>
        )}
        help={{
          description: "Vị trí do app của tài xế gửi lên trong lúc chuyến đang chạy. Hết chuyến thì app ngừng gửi.",
          bullets: [
            "Trễ: đã quá giờ tới dự kiến mà xe chưa tới.",
            "Mất tín hiệu: quá 5 phút không nhận được vị trí.",
            "Chuyến tự kết thúc khi bưu cục đến nhập đủ kiện, hoặc khi tài xế bấm Đã tới.",
          ],
        }}
      />

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex overflow-hidden rounded-md border">
          {(["IN_PROGRESS", "ARRIVED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => changeFilter({ status: value })}
              className={cn("h-9 px-4 text-xs font-bold", status === value ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {value === "IN_PROGRESS" ? "Đang chạy" : "Đã tới (24 giờ)"}
            </button>
          ))}
        </div>
        <label className="grid min-w-64 gap-1 text-xs font-bold">
          Bưu cục
          <select className={selectClassName} value={hubId} onChange={(event) => changeFilter({ hubId: event.target.value })}>
            <option value="">Tất cả bưu cục tôi được xem</option>
            {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}
          </select>
        </label>
        {status === "IN_PROGRESS" ? (
          <div className="ml-auto flex flex-wrap gap-2 text-xs font-bold">
            <StatusPill tone="brand">{counts.running} xe đang chạy</StatusPill>
            <StatusPill tone="warning">{counts.late} trễ</StatusPill>
            <StatusPill tone="danger">{counts.lost} mất tín hiệu</StatusPill>
          </div>
        ) : null}
      </Card>

      {error ? <PricingError message={error} onRetry={() => { setLoading(true); setRefreshKey((value) => value + 1); }} /> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-4">
          <TripMap
            className="h-[28rem] lg:h-[34rem]"
            markers={markers}
            path={path}
            lanes={lanes}
            places={places}
            focus={focus}
            focusKey={`${status}|${hubId}|${selectedId ?? "all"}|${path.length > 0}`}
            selectedId={selectedId}
            onSelect={select}
          />
          {selected ? <TripDetail trip={selected} track={track} /> : null}
        </div>

        <div className="grid content-start gap-2">
          {loading && trips.length === 0 ? <PricingLoading label="Đang tải chuyến xe..." /> : null}
          {!loading && trips.length === 0 && !error ? (
            <Card className="grid place-items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <TruckIcon className="size-6" />
              {status === "IN_PROGRESS" ? "Không có xe nào đang chạy trên các tuyến bạn được xem." : "Chưa có chuyến nào tới nơi trong 24 giờ qua."}
            </Card>
          ) : null}
          {trips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              onClick={() => select(trip.id)}
              className={cn(
                "rounded-xl border bg-card p-3 text-left transition hover:border-brand/40",
                trip.id === selectedId && "border-brand ring-2 ring-brand/15",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black">{trip.fromHub.code} → {trip.toHub.code}</p>
                <TripBadges trip={trip} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{trip.driverEmail ?? <UserName id={trip.driverUserId} fallback="Tài xế" />}{trip.vehiclePlate ? ` · ${trip.vehiclePlate}` : ""}</p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {trip.status === "IN_PROGRESS"
                  ? `Dự kiến tới ${dateTime(trip.plannedArrivalAt)} · vị trí ${sinceText(trip.position?.receivedAt ?? null)}`
                  : `Tới lúc ${dateTime(trip.arrivedAt)}`}
              </p>
              {!trip.position && trip.status === "IN_PROGRESS" ? (
                <p className="mt-1 text-[0.68rem] font-bold text-amber-700 dark:text-amber-300">Chưa nhận được vị trí nào.</p>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
