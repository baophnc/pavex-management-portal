"use client";

import {
  GaugeIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getCapacityReservation, getLaneCapacity, getLanes } from "@/features/network/api";
import type {
  CapacityReservation,
  HubLane,
  LaneCapacity,
} from "@/features/network/contracts";
import { routeSourceLabel, transportModeLabel } from "@/features/network/contracts";
import {
  EmptyState,
  FormField,
  NetworkPageHeader,
  selectClassName,
} from "@/features/network/ui";
import { formatDateTime } from "@/lib/utils";

function ratio(allocated: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (allocated / total) * 100));
}

export function NetworkCapacity() {
  const [lanes, setLanes] = useState<HubLane[]>([]);
  const [laneId, setLaneId] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [capacity, setCapacity] = useState<LaneCapacity | null>(null);
  const [reservation, setReservation] = useState<CapacityReservation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getLanes(new URLSearchParams({ page: "1", pageSize: "100" }))
        .then((result) => setLanes(result.items))
        .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Không thể tải Lane."));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  async function loadCapacity(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!laneId || !serviceDate) {
      toast.error("Chọn Lane và service date.");
      return;
    }
    setLoading(true);
    try {
      setCapacity(await getLaneCapacity(laneId, serviceDate));
    } catch (reason) {
      setCapacity(null);
      toast.error(reason instanceof Error ? reason.message : "Không thể tải capacity.");
    } finally {
      setLoading(false);
    }
  }

  async function lookupReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const shipmentId = String(form.get("shipmentId") ?? "").trim();
    const routeRevision = Number(form.get("routeRevision"));
    if (!shipmentId || !Number.isInteger(routeRevision) || routeRevision < 1) {
      toast.error("Nhập shipment UUID và route revision hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      setReservation(await getCapacityReservation(shipmentId, routeRevision));
    } catch (reason) {
      setReservation(null);
      toast.error(reason instanceof Error ? reason.message : "Không tìm thấy reservation.");
    } finally {
      setLoading(false);
    }
  }

  const selectedLane = lanes.find((lane) => lane.id === laneId) ?? null;

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Departure capacity"
        title="Capacity Control"
        description="Theo dõi tải theo từng schedule departure. Capacity được tính theo (scheduleId, serviceDate), không còn là một con số chung cho cả Lane. Reservation lookup dùng để kiểm tra dữ liệu khi Shipment bắt đầu tích hợp Network."
        actions={
          <Button variant="outline" disabled={!laneId || !serviceDate || loading} onClick={() => void loadCapacity()}>
            <RefreshCwIcon className="size-4" /> Tải lại
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader><p className="text-sm font-black">Capacity theo ngày</p></CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]" onSubmit={loadCapacity}>
                <FormField label="Lane">
                  <select className={selectClassName} value={laneId} onChange={(event) => { setLaneId(event.target.value); setCapacity(null); }}>
                    <option value="">Chọn Lane</option>
                    {lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.code} · {lane.fromHubCode} → {lane.toHubCode}</option>)}
                  </select>
                </FormField>
                <FormField label="Service date"><Input type="date" value={serviceDate} onChange={(event) => { setServiceDate(event.target.value); setCapacity(null); }} /></FormField>
                <div className="flex items-end"><Button type="submit" disabled={loading}>{loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <GaugeIcon className="size-4" />}Xem capacity</Button></div>
              </form>
            </CardContent>
          </Card>

          {!capacity ? (
            <Card><EmptyState title="Chưa chọn departure date" description="Chọn Lane và ngày để xem từng chuyến còn bao nhiêu tải." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-mono text-sm font-black text-brand">{capacity.laneCode}</p><p className="mt-1 text-xs text-muted-foreground">{selectedLane ? `${transportModeLabel(selectedLane.transportMode)} · ${selectedLane.fromHubCode} → ${selectedLane.toHubCode}` : capacity.serviceDate}</p></div>
                  <div className="text-right"><p className="text-xl font-black">{Number(capacity.remainingCapacityKg).toLocaleString("vi-VN")} kg</p><p className="text-xs text-muted-foreground">còn lại / {Number(capacity.totalCapacityKg).toLocaleString("vi-VN")} kg</p></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {capacity.departures.length ? capacity.departures.map((departure) => {
                  const used = ratio(Number(departure.allocatedCapacityKg), Number(departure.capacityKg));
                  return <div key={departure.scheduleId} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-lg font-black">{departure.departureTime.slice(0, 5)}</p><p className="text-xs text-muted-foreground">{departure.serviceDate}</p></div><div className="text-right text-xs"><p className="font-black">{Number(departure.allocatedCapacityKg).toLocaleString("vi-VN")} / {Number(departure.capacityKg).toLocaleString("vi-VN")} kg</p><p className="mt-1 text-muted-foreground">Còn {Number(departure.remainingCapacityKg).toLocaleString("vi-VN")} kg</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-current text-brand" style={{ width: `${used}%` }} /></div><div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground"><span>{used.toFixed(1)}% đã cấp</span><span>{departure.remainingCapacityKg <= 0 ? "FULL" : "AVAILABLE"}</span></div></div>;
                }) : <EmptyState title="Không có departure" description="Lane không có schedule hoạt động vào ngày đã chọn." />}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader><p className="text-sm font-black">Reservation lookup</p><p className="mt-1 text-xs text-muted-foreground">Dùng khi test Shipment ↔ Network; hiện chưa phải workflow chính của Management.</p></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3" onSubmit={lookupReservation}>
              <FormField label="Shipment ID"><Input name="shipmentId" placeholder="UUID" /></FormField>
              <FormField label="Route revision"><Input name="routeRevision" type="number" min="1" defaultValue="1" /></FormField>
              <Button type="submit" variant="outline" disabled={loading}><SearchIcon className="size-4" />Tra reservation</Button>
            </form>

            {reservation ? <div className="space-y-3 border-t pt-4"><div className="rounded-lg border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-black">{reservation.status}</p><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">{routeSourceLabel(reservation.source)}</span></div><p className="mt-2 text-xs text-muted-foreground">ETA {formatDateTime(reservation.estimatedDeliveryAt)}</p><p className="mt-1 text-xs text-muted-foreground">{Number(reservation.shipmentWeightKg).toLocaleString("vi-VN")} kg · revision {reservation.routeRevision}</p></div>{reservation.legs.map((leg) => <div key={leg.reservationId} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><p className="font-mono text-xs font-black">#{leg.sequence} {leg.laneCode}</p><span className="text-[0.65rem] font-black">{leg.status}</span></div><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(leg.departureAt)} → {formatDateTime(leg.arrivalAt)}</p><p className="mt-1 text-xs text-muted-foreground">Reserve {Number(leg.reservedWeightKg).toLocaleString("vi-VN")} kg / {Number(leg.departureCapacityKg).toLocaleString("vi-VN")} kg</p></div>)}</div> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
