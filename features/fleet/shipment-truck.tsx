"use client";

import { TruckIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/card";
import { UserName } from "@/features/directory/names";
import { fleetApi } from "@/features/fleet/api";
import type { FleetHubRef, FleetTrip } from "@/features/fleet/contracts";
import { type LatLng, TripMap } from "@/features/fleet/trip-map";
import { dateTime } from "@/features/pricing/ui";

const REFRESH_MS = 30_000;

function hubPoint(hub: FleetHubRef): LatLng | null {
  return hub.lat !== null && hub.lng !== null ? { lat: hub.lat, lng: hub.lng } : null;
}

/**
 * Where the truck carrying this shipment is, while its parcels ride between hubs. Refreshes every
 * 30 seconds; nothing is shown before the truck leaves.
 */
export function ShipmentTruck({ routeLegId }: { routeLegId: string }) {
  const [trip, setTrip] = useState<FleetTrip | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      fleetApi.byRouteLeg(routeLegId)
        .then((value) => { if (active) setTrip(value); })
        .catch(() => { if (active) setTrip(null); })
        .finally(() => { if (active) setLoaded(true); });
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [routeLegId]);

  if (!loaded) return null;

  if (!trip) {
    return (
      <Card className="flex items-center gap-3 p-4 text-sm">
        <TruckIcon className="size-5 text-muted-foreground" />
        <p className="text-muted-foreground">Kiện đã lên xe nhưng chưa có thông tin chuyến xe. Vị trí sẽ hiện khi tài xế bắt đầu chuyến.</p>
      </Card>
    );
  }

  const from = hubPoint(trip.fromHub);
  const to = hubPoint(trip.toHub);
  const truck = trip.position ? { lat: trip.position.lat, lng: trip.position.lng } : null;
  const total = trip.distanceKm ?? null;
  const percent = total ? Math.min(100, Math.round((trip.travelledKm / total) * 100)) : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/25 p-4">
        <div className="flex items-center gap-2">
          <TruckIcon className="size-4 text-brand" />
          <p className="text-sm font-black">Xe đang chở · {trip.fromHub.code} → {trip.toHub.code}</p>
        </div>
        <Link href="/fleet" className="text-xs font-black text-brand hover:underline">Xem tất cả xe →</Link>
      </div>
      {from && to ? (
        <TripMap
          className="h-64 rounded-none border-0"
          markers={truck ? [{ id: trip.id, ...truck, headingDeg: trip.position?.headingDeg, label: trip.vehiclePlate ?? "Xe trung chuyển", tone: trip.late ? "warning" : "brand" }] : []}
          lanes={[{ id: "lane", from, to, tone: "brand", dashed: true }]}
          places={[{ id: trip.fromHub.id, code: trip.fromHub.code, name: trip.fromHub.name, ...from }, { id: trip.toHub.id, code: trip.toHub.code, name: trip.toHub.name, ...to }]}
          focus={[from, to]}
          focusKey={trip.id}
          selectedId={trip.id}
        />
      ) : null}
      <div className="grid gap-3 p-4 text-xs sm:grid-cols-3">
        <div>
          <p className="font-bold text-muted-foreground">Tài xế</p>
          <p className="mt-0.5 font-black">{trip.driverEmail ?? <UserName id={trip.driverUserId} fallback="Tài xế" />}{trip.vehiclePlate ? ` · ${trip.vehiclePlate}` : ""}</p>
        </div>
        <div>
          <p className="font-bold text-muted-foreground">Đã chạy</p>
          <p className="mt-0.5 font-black">
            {trip.travelledKm.toLocaleString("vi-VN")} km{total ? ` / ${Number(total).toLocaleString("vi-VN")} km` : ""}{percent !== null ? ` (${percent}%)` : ""}
          </p>
        </div>
        <div>
          <p className="font-bold text-muted-foreground">{trip.status === "ARRIVED" ? "Đã tới lúc" : "Dự kiến tới"}</p>
          <p className="mt-0.5 font-black">
            {dateTime(trip.status === "ARRIVED" ? trip.arrivedAt : trip.plannedArrivalAt)}
            {trip.late && trip.minutesLate ? <span className="ml-1 text-amber-700 dark:text-amber-300">· trễ {trip.minutesLate} phút</span> : null}
          </p>
        </div>
      </div>
      {trip.position?.mocked ? <p className="px-4 pb-3 text-[0.65rem] text-muted-foreground">Vị trí đang được giả lập để thử nghiệm.</p> : null}
    </Card>
  );
}
