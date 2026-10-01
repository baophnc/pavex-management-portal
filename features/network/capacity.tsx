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
import { useAccess } from "@/features/auth/access-context";
import {
  consumeCapacityLeg,
  getCapacityReservation,
  getLaneCapacity,
  getLanes,
  releaseCapacityReservation,
} from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
import type {
  CapacityReservation,
  HubLane,
  LaneCapacity,
} from "@/features/network/contracts";
import {
  reservationStatusLabel,
  routeSourceLabel,
  transportModeLabel,
} from "@/features/network/contracts";
import {
  ActionPolicyNote,
  ConfirmActionDialog,
  EmptyState,
  FormField,
  NetworkPageHeader,
  selectClassName,
} from "@/features/network/ui";
import { getAdminShipment } from "@/features/shipments/api";
import { formatDateTime } from "@/lib/utils";

function ratio(allocated: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (allocated / total) * 100));
}

type PendingCapacityAction =
  | { kind: "release" }
  | { kind: "consume"; legSequence: number };

export function NetworkCapacity({ initialTrackingCode = "", initialRouteRevision = "" }: { initialTrackingCode?: string; initialRouteRevision?: string }) {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");
  const [lanes, setLanes] = useState<HubLane[]>([]);
  const [laneId, setLaneId] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [capacity, setCapacity] = useState<LaneCapacity | null>(null);
  const [reservation, setReservation] = useState<CapacityReservation | null>(null);
  const [reservationTrackingCode, setReservationTrackingCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingCapacityAction | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getLanes(new URLSearchParams({ page: "1", pageSize: "100" }))
        .then((result) => setLanes(result.items))
        .catch((reason) =>
          toast.error(networkErrorMessage(reason, "Không thể tải tuyến vận chuyển.")),
        );
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  async function refreshCapacity() {
    if (!laneId || !serviceDate) return;
    setCapacity(await getLaneCapacity(laneId, serviceDate));
  }

  async function loadCapacity(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!laneId || !serviceDate) {
      toast.error("Chọn tuyến vận chuyển và ngày chạy.");
      return;
    }
    setLoading(true);
    try {
      await refreshCapacity();
    } catch (reason) {
      setCapacity(null);
      toast.error(networkErrorMessage(reason, "Không thể tải sức chứa."));
    } finally {
      setLoading(false);
    }
  }

  async function lookupReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const trackingCode = String(form.get("trackingCode") ?? "").trim().toUpperCase();
    const routeRevision = Number(form.get("routeRevision"));
    if (!trackingCode || !Number.isInteger(routeRevision) || routeRevision < 1) {
      toast.error("Nhập mã vận đơn và phiên bản tuyến hợp lệ.");
      return;
    }
    setLoading(true);
    try {
      const shipment = await getAdminShipment(trackingCode);
      setReservation(await getCapacityReservation(shipment.id, routeRevision));
      setReservationTrackingCode(shipment.shipment.trackingCode);
    } catch (reason) {
      setReservation(null);
      setReservationTrackingCode("");
      toast.error(networkErrorMessage(reason, "Không tìm thấy dữ liệu giữ chỗ."));
    } finally {
      setLoading(false);
    }
  }

  async function runAction(reason: string) {
    if (!canManage || !reservation || !pendingAction) return;
    setLoading(true);
    try {
      const next = pendingAction.kind === "release"
        ? await releaseCapacityReservation(
            reservation.shipmentId,
            reservation.routeRevision,
            reason,
          )
        : await consumeCapacityLeg(
            reservation.shipmentId,
            reservation.routeRevision,
            pendingAction.legSequence,
          );
      setReservation(next);
      setPendingAction(null);
      toast.success(
        pendingAction.kind === "release"
          ? "Đã giải phóng các chặng còn giữ chỗ."
          : `Đã ghi nhận sử dụng tải chặng ${pendingAction.legSequence}.`,
      );
      try {
        await refreshCapacity();
      } catch {
        // Reservation mutation succeeded. Capacity refresh is best-effort.
      }
    } catch (actionError) {
      toast.error(networkErrorMessage(actionError, "Không thể cập nhật giữ chỗ sức chứa."));
    } finally {
      setLoading(false);
    }
  }

  const selectedLane = lanes.find((lane) => lane.id === laneId) ?? null;
  const firstReservedSequence = reservation?.legs.find((leg) => leg.status === "RESERVED")?.sequence ?? null;
  const hasReservedLeg = firstReservedSequence !== null;

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Sức chứa chuyến"
        title="Sức chứa"
        description="Theo dõi tổng tải, tải đã giữ và tải còn lại của từng chuyến; người có quyền quản lý có thể xử lý phần giữ chỗ khi cần khắc phục vận hành."
        help={{
          description: "Sức chứa được tính theo từng chuyến cụ thể, không dùng một con số chung cho cả tuyến.",
          bullets: [
            "Chọn tuyến và ngày để xem tải của từng giờ khởi hành.",
            "Vận đơn giữ chỗ theo phiên bản tuyến và từng chặng theo thứ tự.",
            "Giải phóng hoặc xác nhận dùng tải ở trang này đều được ghi nhật ký; chỉ dùng khi hiểu rõ trạng thái vận đơn.",
          ],
        }}
        actions={
          <Button variant="outline" disabled={!laneId || !serviceDate || loading} onClick={() => void loadCapacity()}>
            <RefreshCwIcon className="size-4" /> Tải lại
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader><p className="text-sm font-black">Sức chứa theo ngày</p></CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto]" onSubmit={loadCapacity}>
                <FormField label="Tuyến vận chuyển">
                  <select className={selectClassName} value={laneId} onChange={(event) => { setLaneId(event.target.value); setCapacity(null); }}>
                    <option value="">Chọn tuyến</option>
                    {lanes.map((lane) => <option key={lane.id} value={lane.id}>{lane.fromHubName} → {lane.toHubName}</option>)}
                  </select>
                </FormField>
                <FormField label="Ngày chạy"><Input type="date" value={serviceDate} onChange={(event) => { setServiceDate(event.target.value); setCapacity(null); }} /></FormField>
                <div className="flex items-end"><Button type="submit" disabled={loading}>{loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <GaugeIcon className="size-4" />}Xem sức chứa</Button></div>
              </form>
            </CardContent>
          </Card>

          {!capacity ? (
            <Card><EmptyState title="Chưa chọn ngày" description="Chọn tuyến và ngày để xem từng chuyến còn bao nhiêu tải." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-sm font-black">{selectedLane ? `${selectedLane.fromHubName} → ${selectedLane.toHubName}` : "Tuyến vận chuyển"}</p><p className="mt-1 text-xs text-muted-foreground">{selectedLane ? transportModeLabel(selectedLane.transportMode) : capacity.serviceDate}</p></div>
                  <div className="text-right"><p className="text-xl font-black">{Number(capacity.remainingCapacityKg).toLocaleString("vi-VN")} kg</p><p className="text-xs text-muted-foreground">còn lại / {Number(capacity.totalCapacityKg).toLocaleString("vi-VN")} kg</p></div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {capacity.departures.length ? capacity.departures.map((departure) => {
                  const used = ratio(Number(departure.allocatedCapacityKg), Number(departure.capacityKg));
                  return <div key={departure.scheduleId} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-lg font-black">{departure.departureTime.slice(0, 5)}</p><p className="text-xs text-muted-foreground">{departure.serviceDate}</p></div><div className="text-right text-xs"><p className="font-black">{Number(departure.allocatedCapacityKg).toLocaleString("vi-VN")} / {Number(departure.capacityKg).toLocaleString("vi-VN")} kg</p><p className="mt-1 text-muted-foreground">Còn {Number(departure.remainingCapacityKg).toLocaleString("vi-VN")} kg</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-current text-brand" style={{ width: `${used}%` }} /></div><div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground"><span>{used.toFixed(1)}% đã cấp</span><span>{departure.remainingCapacityKg <= 0 ? "Đã đầy" : "Còn chỗ"}</span></div></div>;
                }) : <EmptyState title="Không có chuyến" description="Tuyến không có lịch chạy hoạt động vào ngày đã chọn." />}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader><p className="text-sm font-black">Tra cứu giữ chỗ</p><p className="mt-1 text-xs text-muted-foreground">Dùng mã vận đơn khách hàng nhìn thấy và phiên bản tuyến.</p></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3" onSubmit={lookupReservation}>
              <FormField label="Mã vận đơn"><Input name="trackingCode" placeholder="PAVEX..." className="font-mono uppercase" defaultValue={initialTrackingCode} /></FormField>
              <FormField label="Phiên bản tuyến"><Input name="routeRevision" type="number" min="1" defaultValue={initialRouteRevision || "1"} /></FormField>
              <Button type="submit" variant="outline" disabled={loading}><SearchIcon className="size-4" />Tra cứu</Button>
            </form>

            {reservation ? (
              <div className="space-y-3 border-t pt-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2"><p className="text-xs font-black">{reservationStatusLabel(reservation.status)}</p><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">{routeSourceLabel(reservation.source)}</span></div>
                  <p className="mt-2 font-mono text-xs font-bold text-brand">{reservationTrackingCode || "Vận đơn đang tra cứu"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Dự kiến đến {formatDateTime(reservation.estimatedDeliveryAt)}</p><p className="mt-1 text-xs text-muted-foreground">{Number(reservation.shipmentWeightKg).toLocaleString("vi-VN")} kg · phiên bản {reservation.routeRevision}</p>
                </div>
                {reservation.legs.map((leg) => (
                  <div key={leg.reservationId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2"><p className="text-xs font-black">Chặng {leg.sequence}</p><span className="text-[0.65rem] font-black">{reservationStatusLabel(leg.status)}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(leg.departureAt)} → {formatDateTime(leg.arrivalAt)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Đã giữ {Number(leg.reservedWeightKg).toLocaleString("vi-VN")} kg / {Number(leg.departureCapacityKg).toLocaleString("vi-VN")} kg</p>
                    {canManage && leg.status === "RESERVED" ? (
                      <div className="mt-3 grid gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading || leg.sequence !== firstReservedSequence}
                          title={leg.sequence !== firstReservedSequence ? "Cần xác nhận dùng tải các chặng trước theo đúng thứ tự." : undefined}
                          onClick={() => setPendingAction({ kind: "consume", legSequence: leg.sequence })}
                        >
                          Ghi nhận đã dùng tải
                        </Button>
                        {leg.sequence !== firstReservedSequence ? (
                          <p className="text-[0.65rem] text-muted-foreground">Chờ chặng trước được xác nhận dùng tải.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
                {canManage && hasReservedLeg ? (
                  <div className="grid gap-2 border-t pt-3">
                    <Button type="button" variant="destructive" disabled={loading} onClick={() => setPendingAction({ kind: "release" })}>Giải phóng tải còn giữ</Button>
                    <ActionPolicyNote>Giải phóng chỉ áp dụng cho các chặng còn “Đã giữ tải”. Chặng đã xác nhận dùng tải không bị hoàn tác.</ActionPolicyNote>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.kind === "release" ? "Giải phóng phần giữ chỗ?" : "Ghi nhận đã dùng tải?"}
        description={pendingAction?.kind === "release"
          ? "Các chặng còn “Đã giữ tải” sẽ được giải phóng và sức chứa tương ứng trở lại khả dụng. Thao tác được ghi nhật ký."
          : `Chặng ${pendingAction?.kind === "consume" ? pendingAction.legSequence : ""} sẽ được đánh dấu đã sử dụng. Các chặng phải được xác nhận lần lượt theo đúng thứ tự.`}
        confirmLabel={pendingAction?.kind === "release" ? "Giải phóng tải" : "Xác nhận đã dùng"}
        destructive={pendingAction?.kind === "release"}
        loading={loading}
        reason={pendingAction?.kind === "release"}
        reasonLabel="Lý do giải phóng (không bắt buộc)"
        onCancel={() => setPendingAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
