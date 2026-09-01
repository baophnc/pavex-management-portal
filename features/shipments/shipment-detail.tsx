"use client";

import {
  ArrowLeftIcon,
  BoxIcon,
  Building2Icon,
  CircleDollarSignIcon,
  Code2Icon,
  CopyIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
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
import { useAccess } from "@/features/auth/access-context";
import { displayUserName } from "@/features/identity/presentation";
import {
  emptyShipmentDetailContext,
  loadShipmentDetailContext,
  type ShipmentDetailContext,
} from "@/features/shipments/detail-context";
import { getAdminShipment } from "@/features/shipments/api";
import { ShipmentExceptionsPanel } from "@/features/shipments/exceptions-panel";
import type {
  AdminShipmentDetail,
  AdminShipmentEvent,
} from "@/features/shipments/contracts";
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
  shipmentEventDescription,
  shipmentEventLabel,
  shipmentStatusLabel,
  shippingFeePayerLabel,
} from "@/features/shipments/presentation";
import { formatDateTime } from "@/lib/utils";

function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-[0.62rem] font-bold text-muted-foreground">{label}</p>
      <div
        className={
          mono
            ? "mt-1 break-all font-mono text-[0.68rem] font-black"
            : "mt-1 text-xs font-black"
        }
      >
        {value || "—"}
      </div>
    </div>
  );
}

function AddressCard({
  title,
  address,
}: {
  title: string;
  address: AdminShipmentDetail["shipment"]["sender"];
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <MapPinIcon className="size-4 text-brand" />
        <p className="text-sm font-black">{title}</p>
      </div>
      <p className="mt-3 text-sm font-black">{address.contactName}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <PhoneIcon className="size-3" />
        {address.contactPhone}
      </p>
      <p className="mt-3 text-xs leading-5">{address.addressLine}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">
        {address.wardName}, {address.provinceName}
      </p>
    </Card>
  );
}

function RelatedPeopleCard({
  data,
  context,
}: {
  data: AdminShipmentDetail;
  context: ShipmentDetailContext;
}) {
  const merchant = context.merchant;
  const creator = context.users[data.createdByUserId];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Building2Icon className="size-4 text-brand" />
        <p className="text-sm font-black">Đối tác & người tạo</p>
      </div>

      <div className="mt-3">
        <p className="text-[0.62rem] font-bold text-muted-foreground">Đối tác gửi hàng</p>
        <p className="mt-1 text-sm font-black">
          {merchant?.businessName ?? "Thông tin đối tác chưa tải được"}
        </p>
        {merchant ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">{merchant.contactName}</p>
            <p className="flex items-center gap-1.5">
              <PhoneIcon className="size-3" /> {merchant.contactPhone}
            </p>
            {merchant.contactEmail ? (
              <p className="flex items-center gap-1.5">
                <MailIcon className="size-3" /> {merchant.contactEmail}
              </p>
            ) : null}
            <p>Mã đối tác: {merchant.merchantCode}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t pt-4">
        <p className="text-[0.62rem] font-bold text-muted-foreground">Người tạo vận đơn</p>
        <p className="mt-1 text-sm font-black">
          {creator ? displayUserName(creator) : "Chưa tải được thông tin người tạo"}
        </p>
        {creator ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MailIcon className="size-3" /> {creator.email}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function RouteEndpoint({
  title,
  hubName,
  serviceAreaName,
  regionName,
  locationName,
}: {
  title: string;
  hubName: string;
  serviceAreaName: string | null;
  regionName: string | null;
  locationName: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <p className="text-[0.62rem] font-black tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </p>
      <p className="mt-2 text-sm font-black">{hubName}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">{locationName}</p>
      {serviceAreaName || regionName ? (
        <p className="mt-2 text-[0.66rem] leading-5 text-muted-foreground">
          {serviceAreaName ? `Vùng phục vụ: ${serviceAreaName}` : null}
          {serviceAreaName && regionName ? " · " : null}
          {regionName ? `Vùng mạng lưới: ${regionName}` : null}
        </p>
      ) : null}
    </div>
  );
}

function TechnicalPanel({ data }: { data: AdminShipmentDetail }) {
  return (
    <Card className="overflow-hidden border-dashed">
      <div className="border-b bg-muted/25 p-4">
        <div className="flex items-center gap-2">
          <Code2Icon className="size-4 text-brand" />
          <p className="text-sm font-black">Thông tin kỹ thuật</p>
        </div>
        <p className="mt-1 text-[0.66rem] text-muted-foreground">
          Chỉ quản trị hệ thống nhìn thấy khu vực này.
        </p>
      </div>

      <div className="space-y-5 p-4">
        <section>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
            Vận đơn & định giá
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <KeyValue label="ID vận đơn" value={data.id} mono />
            <KeyValue label="ID đối tác" value={data.merchantId} mono />
            <KeyValue label="ID người tạo" value={data.createdByUserId} mono />
            <KeyValue label="Phiên bản dữ liệu" value={String(data.version)} />
            <KeyValue label="ID báo giá" value={data.quoteId} mono />
            <KeyValue label="ID yêu cầu báo giá" value={data.quoteRequestId} mono />
            <KeyValue label="ID bảng giá" value={data.ratePlanId} mono />
            <KeyValue label="Phiên bản bảng giá" value={String(data.rateRevision)} />
          </div>
        </section>

        <section>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
            Hành trình & giữ tải
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <KeyValue label="ID vùng phục vụ gửi" value={data.originServiceAreaId} mono />
            <KeyValue label="ID vùng mạng lưới gửi" value={data.originRegionId} mono />
            <KeyValue label="ID điểm trung chuyển gửi" value={data.originHubId} mono />
            <KeyValue label="ID lô giữ tải" value={data.capacityReservationBatchId ?? "—"} mono />
            <KeyValue label="ID vùng phục vụ nhận" value={data.destinationServiceAreaId} mono />
            <KeyValue label="ID vùng mạng lưới nhận" value={data.destinationRegionId} mono />
            <KeyValue label="ID điểm trung chuyển nhận" value={data.destinationHubId} mono />
            <KeyValue label="Phiên bản tuyến" value={String(data.shipment.routing.routeRevision)} />
          </div>
        </section>

        <section>
          <p className="text-[0.66rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
            Sự kiện gốc
          </p>
          <div className="mt-2 space-y-2">
            {data.events.length === 0 ? (
              <p className="text-xs text-muted-foreground">Không có sự kiện kỹ thuật.</p>
            ) : (
              data.events.map((event) => (
                <div key={event.id} className="rounded-lg border bg-background p-3">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <KeyValue label="ID sự kiện" value={event.id} mono />
                    <KeyValue label="Mã sự kiện" value={event.code} mono />
                    <KeyValue label="ID người thao tác" value={event.actorUserId ?? "—"} mono />
                    <KeyValue label="ID điểm trung chuyển" value={event.hubId ?? "—"} mono />
                  </div>
                  {event.dataJson ? (
                    <pre className="mt-2 max-h-44 overflow-auto rounded-lg bg-muted/45 p-3 text-[0.62rem] leading-4">
                      {event.dataJson}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}

function actorText(event: AdminShipmentEvent, context: ShipmentDetailContext) {
  if (!event.actorUserId) return null;
  const user = context.users[event.actorUserId];
  if (!user) return "Nhân viên Pavex";
  return `${displayUserName(user)} · ${user.email}`;
}

export function AdminShipmentDetailView({ trackingCode }: { trackingCode: string }) {
  const { hasPermission, hasRole } = useAccess();
  const [data, setData] = useState<AdminShipmentDetail | null>(null);
  const [context, setContext] = useState<ShipmentDetailContext>(
    emptyShipmentDetailContext,
  );
  const [loading, setLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);

  const loadContext = useCallback(
    async (detail: AdminShipmentDetail) => {
      setContextLoading(true);
      try {
        setContext(
          await loadShipmentDetailContext(detail, {
            canReadIdentity: hasPermission("identity.users.read"),
            canReadPartners: hasPermission("partners.merchants.read"),
            canReadNetwork: hasPermission("network.read") || hasPermission("network.manage"),
          }),
        );
      } finally {
        setContextLoading(false);
      }
    },
    [hasPermission],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getAdminShipment(trackingCode);
      setData(detail);
      setContext(emptyShipmentDetailContext);
      void loadContext(detail);
    } catch (reason) {
      setData(null);
      setContext(emptyShipmentDetailContext);
      setError(shipmentErrorMessage(reason, "Không thể tải chi tiết vận đơn."));
    } finally {
      setLoading(false);
    }
  }, [loadContext, trackingCode]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}.`);
  }

  if (loading) {
    return (
      <Card className="grid min-h-[55vh] place-items-center text-xs font-bold text-muted-foreground">
        <span className="flex items-center gap-2">
          <RefreshCwIcon className="size-4 animate-spin" /> Đang tải chi tiết vận đơn...
        </span>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="grid min-h-[55vh] place-items-center p-6 text-center">
        <div className="max-w-md">
          <p className="text-sm font-black text-destructive">
            {error ?? "Không có dữ liệu vận đơn."}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/shipments"
              className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs font-bold hover:bg-muted"
            >
              Quay lại danh sách
            </Link>
            <Button onClick={() => void load()}>Thử lại</Button>
          </div>
        </div>
      </Card>
    );
  }

  const shipment = data.shipment;
  const routing = shipment.routing;
  const pricing = shipment.pricing;
  const creator = context.users[data.createdByUserId];
  const canViewTechnical = hasRole("ADMIN");
  const canManageExceptions = hasPermission("shipments.exceptions.manage");
  const canAdjustWeight = hasPermission("shipments.weight.adjust");
  const canManageCases = hasPermission("shipments.cases.manage");
  const originHubName =
    context.network.originHub?.publicName ||
    context.network.originHub?.name ||
    routing.originHubName;
  const destinationHubName =
    context.network.destinationHub?.publicName ||
    context.network.destinationHub?.name ||
    routing.destinationHubName;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1 text-xs font-black text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5" /> Danh sách vận đơn
        </Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-brand/10 px-2.5 py-1 text-[0.62rem] font-black text-brand">
                {shipmentStatusLabel(shipment.status)}
              </span>
              <span className="rounded-full border px-2.5 py-1 text-[0.62rem] font-black">
                {lifecycleLabel(shipment.lifecycleStatus)}
              </span>
              <span className="rounded-full border px-2.5 py-1 text-[0.62rem] font-black">
                {serviceLevelLabel(pricing.serviceLevel)}
              </span>
            </div>
            <h1 className="mt-3 font-mono text-xl font-black tracking-tight sm:text-2xl">
              {shipment.trackingCode}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {shipment.merchantReference
                ? `Mã tham chiếu đối tác: ${shipment.merchantReference}`
                : "Không có mã tham chiếu đối tác"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canViewTechnical ? (
              <Button
                type="button"
                variant={technicalOpen ? "default" : "outline"}
                size="icon"
                title="Thông tin kỹ thuật"
                aria-label="Thông tin kỹ thuật"
                aria-expanded={technicalOpen}
                onClick={() => setTechnicalOpen((current) => !current)}
              >
                <Code2Icon className="size-4" />
              </Button>
            ) : null}
            {canManageCases ? (
              <Link
                href={`/shipments/cases?shipmentId=${encodeURIComponent(data.id)}`}
                className="inline-flex h-10 items-center rounded-md border bg-background px-4 text-sm font-bold hover:bg-muted"
              >
                Hồ sơ sự cố
              </Link>
            ) : null}
            <Button
              variant="outline"
              onClick={() => void copy(shipment.trackingCode, "mã vận đơn")}
            >
              <CopyIcon className="size-3.5" /> Sao chép mã
            </Button>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCwIcon className="size-3.5" /> Làm mới
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <AddressCard title="Người gửi" address={shipment.sender} />
        <AddressCard title="Người nhận" address={shipment.recipient} />
        <RelatedPeopleCard data={data} context={context} />
      </div>

      {contextLoading ? (
        <p className="flex items-center gap-2 px-1 text-[0.66rem] font-bold text-muted-foreground">
          <RefreshCwIcon className="size-3 animate-spin" /> Đang bổ sung tên đối tác, người dùng và mạng lưới...
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/25 p-4">
            <CircleDollarSignIcon className="size-4 text-brand" />
            <p className="text-sm font-black">Chi tiết cước</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <KeyValue label="Phí cơ bản" value={money(pricing.baseFee, pricing.currency)} />
            <KeyValue
              label="Phí khối lượng tăng thêm"
              value={money(pricing.additionalWeightFee, pricing.currency)}
            />
            <KeyValue
              label="Phụ phí khu vực"
              value={money(pricing.areaSurcharge, pricing.currency)}
            />
            <KeyValue label="Phí thu hộ" value={money(pricing.codFee, pricing.currency)} />
            <KeyValue
              label="Phí bảo hiểm"
              value={money(pricing.insuranceFee, pricing.currency)}
            />
            <KeyValue label="Tổng cước" value={money(pricing.shippingFee, pricing.currency)} />
            <KeyValue
              label="Số tiền cần thu hộ"
              value={money(pricing.codAmount, pricing.currency)}
            />
            <KeyValue
              label="Giá trị khai báo"
              value={money(pricing.declaredValue, pricing.currency)}
            />
            <KeyValue
              label="Người trả cước"
              value={shippingFeePayerLabel(shipment.shippingFeePayer)}
            />
            <KeyValue
              label="Phạm vi tính cước"
              value={pricingZoneLabel(pricing.pricingZone)}
            />
          </div>
          <div className="border-t p-4">
            <Link
              href={`/pricing/quotes?quoteId=${encodeURIComponent(data.quoteId)}`}
              className="text-xs font-black text-brand hover:underline"
            >
              Xem chi tiết cách tính cước →
            </Link>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/25 p-4">
            <RouteIcon className="size-4 text-brand" />
            <p className="text-sm font-black">Hành trình vận chuyển</p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <RouteEndpoint
              title="Điểm gửi"
              hubName={originHubName}
              serviceAreaName={context.network.originServiceArea?.name ?? null}
              regionName={context.network.originRegion?.name ?? null}
              locationName={`${shipment.sender.wardName}, ${shipment.sender.provinceName}`}
            />
            <div className="hidden items-center justify-center md:flex">
              <TruckIcon className="size-5 text-brand" />
            </div>
            <RouteEndpoint
              title="Điểm nhận"
              hubName={destinationHubName}
              serviceAreaName={context.network.destinationServiceArea?.name ?? null}
              regionName={context.network.destinationRegion?.name ?? null}
              locationName={`${shipment.recipient.wardName}, ${shipment.recipient.provinceName}`}
            />
          </div>
          <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-4">
            <KeyValue label="Tình trạng tuyến" value={routingStatusLabel(routing.status)} />
            <KeyValue
              label="Mức phục vụ điểm gửi"
              value={coverageTierLabel(routing.originCoverageTier)}
            />
            <KeyValue
              label="Mức phục vụ điểm nhận"
              value={coverageTierLabel(routing.destinationCoverageTier)}
            />
            <KeyValue label="Khối lượng đã giữ tải" value={`${routing.reservedWeightKg} kg`} />
            <KeyValue
              label="Dự kiến giao"
              value={
                routing.estimatedDeliveryAt
                  ? formatDateTime(routing.estimatedDeliveryAt)
                  : "Chưa có"
              }
            />
            <KeyValue
              label="Giữ tải"
              value={data.capacityReservationBatchId ? "Đã tạo giữ tải" : "Không cần giữ tải"}
            />
          </div>
          {routing.routeRevision > 0 ? (
            <div className="border-t p-4">
              <Link
                href={`/network/capacity?shipmentId=${encodeURIComponent(data.id)}&routeRevision=${routing.routeRevision}`}
                className="text-xs font-black text-brand hover:underline"
              >
                Xem tình trạng giữ tải →
              </Link>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4">
          <BoxIcon className="size-4 text-brand" />
          <p className="text-sm font-black">Kiện hàng ({shipment.parcels.length})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Kiện</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hàng hóa</th>
                <th className="px-4 py-3">Khối lượng</th>
                <th className="px-4 py-3">Kích thước</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shipment.parcels.map((parcel) => (
                <tr key={parcel.code}>
                  <td className="px-4 py-3">
                    <p className="font-mono font-black">{parcel.code}</p>
                    <p className="mt-1 text-[0.64rem] text-muted-foreground">
                      Kiện {parcel.sequence} · Số lượng {parcel.quantity}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-bold">
                    {shipmentStatusLabel(parcel.status)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{goodsCategoryLabel(parcel.category)}</p>
                    <p className="mt-1 max-w-72 text-[0.64rem] text-muted-foreground">
                      {parcel.description}
                      {parcel.isFragile ? " · Dễ vỡ" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>Thực tế {parcel.actualWeightKg} kg</p>
                    <p className="mt-1 text-[0.64rem] text-muted-foreground">
                      Quy đổi {parcel.volumetricWeightKg} kg · Tính cước {parcel.chargeableWeightKg} kg
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {parcel.lengthCm} × {parcel.widthCm} × {parcel.heightCm} cm
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {canManageExceptions ? (
        <ShipmentExceptionsPanel
          shipmentId={data.id}
          trackingCode={shipment.trackingCode}
          lifecycleStatus={shipment.lifecycleStatus}
          parcels={shipment.parcels}
          originHubId={data.originHubId}
          originHubName={originHubName}
          destinationHubId={data.destinationHubId}
          destinationHubName={destinationHubName}
          canManage={canManageExceptions}
          canAdjustWeight={canAdjustWeight}
          onShipmentChanged={() => void load()}
        />
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div className="flex items-center gap-2">
              <TruckIcon className="size-4 text-brand" />
              <p className="text-sm font-black">Lịch sử xử lý ({data.events.length})</p>
            </div>
            <span className="text-[0.62rem] font-bold text-muted-foreground">
              Bao gồm cập nhật nội bộ
            </span>
          </div>
          <div className="divide-y">
            {data.events.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Chưa có lịch sử xử lý.</p>
            ) : (
              data.events.map((event) => {
                const actor = actorText(event, context);
                return (
                  <div
                    key={event.id}
                    className="grid gap-3 p-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]"
                  >
                    <div>
                      <p className="text-[0.66rem] font-black">
                        {formatDateTime(event.occurredAt)}
                      </p>
                      <p className="mt-1 text-[0.6rem] text-muted-foreground">
                        Ghi nhận {formatDateTime(event.recordedAt)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border bg-muted/45 px-2 py-1 text-[0.6rem] font-black">
                          {shipmentStatusLabel(event.status)}
                        </span>
                        <span className="text-[0.66rem] font-black text-brand">
                          {shipmentEventLabel(event.code, event.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold">
                        {shipmentEventDescription(event.code, event.description, event.status)}
                      </p>
                      <p className="mt-1 text-[0.64rem] text-muted-foreground">
                        {event.parcelCode ? `Kiện ${event.parcelCode}` : "Toàn vận đơn"}
                        {event.locationName ? ` · ${event.locationName}` : ""}
                      </p>
                      {actor ? (
                        <p className="mt-2 text-[0.64rem] text-muted-foreground">
                          Người thao tác: {actor}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b p-4">
            <ShieldCheckIcon className="size-4 text-brand" />
            <p className="text-sm font-black">Các lần giao hàng ({data.deliveryAttempts.length})</p>
          </div>
          <div className="divide-y">
            {data.deliveryAttempts.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Chưa ghi nhận lần giao hàng.</p>
            ) : (
              data.deliveryAttempts.map((attempt) => {
                const actor = context.users[attempt.actorUserId];
                return (
                  <div key={attempt.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-black">{attempt.parcelCode}</p>
                        <p className="mt-1 text-[0.62rem] text-muted-foreground">
                          Lần {attempt.attemptNumber} · {formatDateTime(attempt.occurredAt)}
                        </p>
                      </div>
                      <span
                        className={
                          attempt.outcome === "DELIVERED"
                            ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[0.62rem] font-black text-emerald-700 dark:text-emerald-300"
                            : "rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[0.62rem] font-black text-destructive"
                        }
                      >
                        {attempt.outcome === "DELIVERED" ? "Giao thành công" : "Giao thất bại"}
                      </span>
                    </div>
                    {attempt.failureReason ? (
                      <p className="mt-3 text-xs font-bold">
                        {deliveryFailureLabel(attempt.failureReason)}
                      </p>
                    ) : null}
                    {attempt.proofMethod ? (
                      <p className="mt-3 text-xs">
                        <strong>Xác nhận giao hàng:</strong> {proofMethodLabel(attempt.proofMethod)}
                        {attempt.recipientName ? ` · ${attempt.recipientName}` : ""}
                      </p>
                    ) : null}
                    {attempt.evidenceReference ? (
                      <p className="mt-1 break-all text-[0.64rem] text-muted-foreground">
                        Minh chứng: {attempt.evidenceReference}
                      </p>
                    ) : null}
                    {attempt.note ? (
                      <p className="mt-2 text-[0.68rem] text-muted-foreground">{attempt.note}</p>
                    ) : null}
                    {attempt.latitude !== null && attempt.longitude !== null ? (
                      <p className="mt-2 text-[0.62rem] text-muted-foreground">
                        Vị trí ghi nhận: {attempt.latitude}, {attempt.longitude}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[0.64rem] text-muted-foreground">
                      Người thao tác: {actor ? `${displayUserName(actor)} · ${actor.email}` : "Nhân viên Pavex"}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <KeyValue label="Tạo lúc" value={formatDateTime(shipment.createdAt)} />
        <KeyValue label="Cập nhật gần nhất" value={formatDateTime(shipment.updatedAt)} />
        <KeyValue
          label="Hoàn tất lúc"
          value={shipment.completedAt ? formatDateTime(shipment.completedAt) : "Chưa hoàn tất"}
        />
        <KeyValue
          label="Người tạo"
          value={creator ? displayUserName(creator) : "Chưa tải được thông tin"}
        />
      </Card>

      {shipment.note || shipment.cancellationReason ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <UserRoundIcon className="size-4 text-brand" />
            <p className="text-sm font-black">Ghi chú & trạng thái vận đơn</p>
          </div>
          {shipment.note ? <p className="mt-3 text-xs leading-5">{shipment.note}</p> : null}
          {shipment.cancellationReason ? (
            <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs">
              <strong>Lý do hủy:</strong> {shipment.cancellationReason}
              {shipment.cancelledAt ? ` · ${formatDateTime(shipment.cancelledAt)}` : ""}
            </p>
          ) : null}
        </Card>
      ) : null}

      {canViewTechnical && technicalOpen ? <TechnicalPanel data={data} /> : null}
    </div>
  );
}
