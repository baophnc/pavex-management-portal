"use client";

import {
  ArrowLeftIcon,
  BoxIcon,
  CircleDollarSignIcon,
  CopyIcon,
  MapPinIcon,
  RefreshCwIcon,
  RouteIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserRoundIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminShipment } from "@/features/shipments/api";
import type { AdminShipmentDetail } from "@/features/shipments/contracts";
import {
  coverageTierLabel,
  deliveryFailureLabel,
  goodsCategoryLabel,
  lifecycleLabel,
  money,
  pricingZoneLabel,
  proofMethodLabel,
  routingStatusLabel,
  serviceLevelLabel,
  shipmentErrorMessage,
  shipmentStatusLabel,
} from "@/features/shipments/presentation";
import { formatDateTime } from "@/lib/utils";

function KeyValue({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[0.62rem] font-bold text-muted-foreground">{label}</p>
      <div className={mono ? "mt-1 break-all font-mono text-[0.68rem] font-black" : "mt-1 text-xs font-black"}>{value || "—"}</div>
    </div>
  );
}

function AddressCard({ title, address }: { title: string; address: AdminShipmentDetail["shipment"]["sender"] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2"><MapPinIcon className="size-4 text-brand" /><p className="text-sm font-black">{title}</p></div>
      <p className="mt-3 text-sm font-black">{address.contactName}</p>
      <p className="mt-1 text-xs text-muted-foreground">{address.contactPhone}</p>
      <p className="mt-3 text-xs leading-5">{address.addressLine}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{address.wardName}, {address.provinceName}</p>
      <p className="mt-2 font-mono text-[0.62rem] text-muted-foreground">{address.provinceCode} / {address.wardCode}</p>
    </Card>
  );
}

export function AdminShipmentDetailView({ trackingCode }: { trackingCode: string }) {
  const [data, setData] = useState<AdminShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminShipment(trackingCode));
    } catch (reason) {
      setData(null);
      setError(shipmentErrorMessage(reason, "Không thể tải chi tiết vận đơn."));
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}.`);
  }

  if (loading) {
    return <Card className="grid min-h-[55vh] place-items-center text-xs font-bold text-muted-foreground"><span className="flex items-center gap-2"><RefreshCwIcon className="size-4 animate-spin" /> Đang tải chi tiết vận đơn...</span></Card>;
  }

  if (error || !data) {
    return (
      <Card className="grid min-h-[55vh] place-items-center p-6 text-center">
        <div className="max-w-md"><p className="text-sm font-black text-destructive">{error ?? "Không có dữ liệu vận đơn."}</p><div className="mt-4 flex justify-center gap-2"><Link href="/shipments" className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-bold hover:bg-muted">Quay lại danh sách</Link><Button onClick={() => void load()}>Thử lại</Button></div></div>
      </Card>
    );
  }

  const shipment = data.shipment;
  const routing = shipment.routing;
  const pricing = shipment.pricing;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <Link href="/shipments" className="inline-flex items-center gap-1 text-xs font-black text-muted-foreground hover:text-foreground"><ArrowLeftIcon className="size-3.5" /> Danh sách vận đơn</Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-brand/10 px-2.5 py-1 text-[0.62rem] font-black text-brand">{shipmentStatusLabel(shipment.status)}</span>
              <span className="rounded-full border px-2.5 py-1 text-[0.62rem] font-black">{lifecycleLabel(shipment.lifecycleStatus)}</span>
              <span className="rounded-full border px-2.5 py-1 text-[0.62rem] font-black">{serviceLevelLabel(pricing.serviceLevel)}</span>
            </div>
            <h1 className="mt-3 font-mono text-xl font-black tracking-tight sm:text-2xl">{shipment.trackingCode}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{shipment.merchantReference ? `Merchant ref: ${shipment.merchantReference}` : "Không có merchant reference"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void copy(shipment.trackingCode, "tracking code")}><CopyIcon className="size-3.5" /> Sao chép tracking</Button>
            <Button variant="outline" onClick={() => void load()}><RefreshCwIcon className="size-3.5" /> Làm mới</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KeyValue label="Shipment ID" value={data.id} mono />
        <KeyValue label="Merchant ID" value={data.merchantId} mono />
        <KeyValue label="Created by User" value={data.createdByUserId} mono />
        <KeyValue label="Entity version" value={String(data.version)} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <AddressCard title="Người gửi" address={shipment.sender} />
        <AddressCard title="Người nhận" address={shipment.recipient} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/25 p-4"><CircleDollarSignIcon className="size-4 text-brand" /><p className="text-sm font-black">Pricing snapshot</p></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <KeyValue label="Tổng cước" value={money(pricing.shippingFee, pricing.currency)} />
            <KeyValue label="COD" value={money(pricing.codAmount, pricing.currency)} />
            <KeyValue label="Giá trị khai báo" value={money(pricing.declaredValue, pricing.currency)} />
            <KeyValue label="Vùng giá" value={pricingZoneLabel(pricing.pricingZone)} />
            <KeyValue label="Rate code" value={pricing.rateCode} mono />
            <KeyValue label="Rate version" value={pricing.rateVersion} mono />
            <KeyValue label="Rate plan ID" value={data.ratePlanId} mono />
            <KeyValue label="Rate revision" value={String(data.rateRevision)} />
          </div>
          <div className="border-t p-4"><Link href={`/pricing/quotes?quoteId=${encodeURIComponent(data.quoteId)}`} className="text-xs font-black text-brand hover:underline">Mở immutable Quote Snapshot →</Link></div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/25 p-4"><RouteIcon className="size-4 text-brand" /><p className="text-sm font-black">Routing snapshot</p></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <KeyValue label="Routing status" value={routingStatusLabel(routing.status)} />
            <KeyValue label="Route revision" value={String(routing.routeRevision)} />
            <KeyValue label="Hub gửi" value={`${routing.originHubCode} · ${routing.originHubName}`} />
            <KeyValue label="Hub nhận" value={`${routing.destinationHubCode} · ${routing.destinationHubName}`} />
            <KeyValue label="Tier gửi" value={coverageTierLabel(routing.originCoverageTier)} />
            <KeyValue label="Tier nhận" value={coverageTierLabel(routing.destinationCoverageTier)} />
            <KeyValue label="Khối lượng giữ tải" value={`${routing.reservedWeightKg} kg`} />
            <KeyValue label="ETA" value={routing.estimatedDeliveryAt ? formatDateTime(routing.estimatedDeliveryAt) : "—"} />
          </div>
          <div className="grid gap-2 border-t p-4 text-[0.64rem] text-muted-foreground">
            <p className="break-all font-mono">capacityBatch: {data.capacityReservationBatchId ?? "—"}</p>
            <p className="break-all font-mono">origin: {data.originServiceAreaId} / {data.originRegionId} / {data.originHubId}</p>
            <p className="break-all font-mono">destination: {data.destinationServiceAreaId} / {data.destinationRegionId} / {data.destinationHubId}</p>
            {routing.routeRevision > 0 ? (
              <Link href={`/network/capacity?shipmentId=${encodeURIComponent(data.id)}&routeRevision=${routing.routeRevision}`} className="mt-1 font-sans text-xs font-black text-brand hover:underline">
                Tra cứu capacity reservation →
              </Link>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4"><BoxIcon className="size-4 text-brand" /><p className="text-sm font-black">Kiện hàng ({shipment.parcels.length})</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-4 py-3">Kiện</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Hàng hóa</th><th className="px-4 py-3">Trọng lượng</th><th className="px-4 py-3">Kích thước</th></tr></thead>
            <tbody className="divide-y">
              {shipment.parcels.map((parcel) => (
                <tr key={parcel.code}>
                  <td className="px-4 py-3"><p className="font-mono font-black">{parcel.code}</p><p className="mt-1 text-[0.64rem] text-muted-foreground">#{parcel.sequence} · SL {parcel.quantity}</p></td>
                  <td className="px-4 py-3 font-bold">{shipmentStatusLabel(parcel.status)}</td>
                  <td className="px-4 py-3"><p className="font-bold">{goodsCategoryLabel(parcel.category)}</p><p className="mt-1 max-w-72 text-[0.64rem] text-muted-foreground">{parcel.description}{parcel.isFragile ? " · Dễ vỡ" : ""}</p></td>
                  <td className="px-4 py-3"><p>Thực {parcel.actualWeightKg} kg</p><p className="mt-1 text-[0.64rem] text-muted-foreground">Quy đổi {parcel.volumetricWeightKg} · tính cước {parcel.chargeableWeightKg} kg</p></td>
                  <td className="px-4 py-3">{parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b p-4"><div className="flex items-center gap-2"><TruckIcon className="size-4 text-brand" /><p className="text-sm font-black">Event stream đầy đủ ({data.events.length})</p></div><span className="text-[0.62rem] font-bold text-muted-foreground">Bao gồm event nội bộ</span></div>
          <div className="divide-y">
            {data.events.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Chưa có event.</p> : data.events.map((event) => (
              <div key={event.id} className="grid gap-3 p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
                <div><p className="text-[0.66rem] font-black">{formatDateTime(event.occurredAt)}</p><p className="mt-1 text-[0.6rem] text-muted-foreground">ghi {formatDateTime(event.recordedAt)}</p></div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border bg-muted/45 px-2 py-1 text-[0.6rem] font-black">{shipmentStatusLabel(event.status)}</span><code className="text-[0.64rem] font-bold text-brand">{event.code}</code></div><p className="mt-2 text-xs font-bold">{event.description}</p><p className="mt-1 text-[0.64rem] text-muted-foreground">{event.parcelCode ?? "shipment"}{event.locationName ? ` · ${event.locationName}` : ""}</p>{event.actorUserId ? <p className="mt-2 break-all font-mono text-[0.6rem] text-muted-foreground">actor: {event.actorUserId}</p> : null}{event.hubId ? <p className="mt-1 break-all font-mono text-[0.6rem] text-muted-foreground">hub: {event.hubId}</p> : null}{event.dataJson ? <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-muted/40 p-2 text-[0.6rem] leading-4">{event.dataJson}</pre> : null}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b p-4"><ShieldCheckIcon className="size-4 text-brand" /><p className="text-sm font-black">Lần giao hàng ({data.deliveryAttempts.length})</p></div>
          <div className="divide-y">
            {data.deliveryAttempts.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Chưa ghi nhận lần giao hàng.</p> : data.deliveryAttempts.map((attempt) => (
              <div key={attempt.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-xs font-black">{attempt.parcelCode}</p><p className="mt-1 text-[0.62rem] text-muted-foreground">Lần #{attempt.attemptNumber} · {formatDateTime(attempt.occurredAt)}</p></div><span className={attempt.outcome === "DELIVERED" ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[0.62rem] font-black text-emerald-700 dark:text-emerald-300" : "rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[0.62rem] font-black text-destructive"}>{attempt.outcome === "DELIVERED" ? "Giao thành công" : "Giao thất bại"}</span></div>
                {attempt.failureReason ? <p className="mt-3 text-xs font-bold">{deliveryFailureLabel(attempt.failureReason)}</p> : null}
                {attempt.proofMethod ? <p className="mt-3 text-xs"><strong>POD:</strong> {proofMethodLabel(attempt.proofMethod)}{attempt.recipientName ? ` · ${attempt.recipientName}` : ""}</p> : null}
                {attempt.evidenceReference ? <p className="mt-1 break-all text-[0.64rem] text-muted-foreground">Evidence: {attempt.evidenceReference}</p> : null}
                {attempt.note ? <p className="mt-2 text-[0.68rem] text-muted-foreground">{attempt.note}</p> : null}
                {attempt.latitude !== null && attempt.longitude !== null ? <p className="mt-2 font-mono text-[0.62rem] text-muted-foreground">GPS {attempt.latitude}, {attempt.longitude}</p> : null}
                <p className="mt-2 break-all font-mono text-[0.6rem] text-muted-foreground">actor: {attempt.actorUserId}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <KeyValue label="Quote ID" value={data.quoteId} mono />
        <KeyValue label="Quote Request ID" value={data.quoteRequestId} mono />
        <KeyValue label="Tạo lúc" value={formatDateTime(shipment.createdAt)} />
        <KeyValue label="Cập nhật" value={formatDateTime(shipment.updatedAt)} />
      </Card>

      {(shipment.note || shipment.cancellationReason) ? (
        <Card className="p-4"><div className="flex items-center gap-2"><UserRoundIcon className="size-4 text-brand" /><p className="text-sm font-black">Ghi chú & lifecycle</p></div>{shipment.note ? <p className="mt-3 text-xs leading-5">{shipment.note}</p> : null}{shipment.cancellationReason ? <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs"><strong>Lý do hủy:</strong> {shipment.cancellationReason}{shipment.cancelledAt ? ` · ${formatDateTime(shipment.cancelledAt)}` : ""}</p> : null}</Card>
      ) : null}
    </div>
  );
}
