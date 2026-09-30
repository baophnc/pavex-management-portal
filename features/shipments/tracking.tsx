"use client";

import { ExternalLinkIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataTable, type Column } from "@/components/workspace/data-table";
import { EmptyState } from "@/components/workspace/empty-state";
import { controlClass, ToolbarButton } from "@/components/workspace/filters";
import { InfoCard, InfoList, Panel } from "@/components/workspace/panel";
import { getAdminShipment } from "@/features/shipments/api";
import type { AdminDeliveryAttempt, AdminShipmentDetail, AdminShipmentEvent, ShipmentAddress } from "@/features/shipments/contracts";
import {
  collectionStatusLabel,
  deliveryFailureLabel,
  goodsCategoryLabel,
  lifecycleLabel,
  money,
  parcelStatusLabel,
  pricingZoneLabel,
  proofMethodLabel,
  serviceLevelLabel,
  shipmentErrorMessage,
  shipmentEventDescription,
  shipmentStatusLabel,
  shippingFeePayerLabel,
} from "@/features/shipments/presentation";
import { ShipmentStatusTag } from "@/features/shipments/shipments";
import { cn, formatDateTime } from "@/lib/utils";

const MAX_CODES = 50;
const PARALLEL_LOOKUPS = 5;

type Result = { code: string; detail?: AdminShipmentDetail; error?: string };

/** Tracking codes from free text: any separator, parcel suffixes (-01) dropped, duplicates removed. */
export function parseCodes(text: string) {
  const codes = text
    .split(/[\s,;]+/)
    .map((value) => value.trim().toUpperCase().replace(/-\d{1,3}$/, ""))
    .filter(Boolean);
  return [...new Set(codes)];
}

function address(value: ShipmentAddress) {
  return [value.addressLine, value.wardName, value.provinceName].filter(Boolean).join(", ");
}

const eventColumns: Column<AdminShipmentEvent>[] = [
  { key: "occurredAt", header: "Thời gian", width: 130, sortValue: (row) => row.occurredAt, cell: (row) => formatDateTime(row.occurredAt) },
  { key: "status", header: "Trạng thái", width: 140, sortValue: (row) => shipmentStatusLabel(row.status), cell: (row) => <ShipmentStatusTag status={row.status} /> },
  {
    key: "description",
    header: "Nội dung",
    width: 320,
    cell: (row) => <span className="whitespace-normal">{shipmentEventDescription(row.code, row.description, row.status)}</span>,
  },
  { key: "parcel", header: "Kiện", width: 170, cell: (row) => (row.parcelCode ? <span className="font-mono">{row.parcelCode}</span> : "Cả đơn") },
  { key: "location", header: "Địa điểm", width: 180, sortValue: (row) => row.locationName, cell: (row) => row.locationName ?? "—" },
];

const attemptColumns: Column<AdminDeliveryAttempt>[] = [
  { key: "attempt", header: "Lần giao", width: 80, align: "center", cell: (row) => row.attemptNumber },
  { key: "parcel", header: "Kiện", width: 170, cell: (row) => <span className="font-mono">{row.parcelCode}</span> },
  {
    key: "outcome",
    header: "Kết quả",
    width: 110,
    cell: (row) => (
      <span className={row.outcome === "DELIVERED" ? "text-emerald-700 dark:text-emerald-300" : "text-brand"}>
        {row.outcome === "DELIVERED" ? "Thành công" : "Không thành công"}
      </span>
    ),
  },
  { key: "reason", header: "Lý do", width: 180, cell: (row) => (row.failureReason ? deliveryFailureLabel(row.failureReason) : "—") },
  { key: "recipient", header: "Người nhận", width: 150, cell: (row) => row.recipientName ?? "—" },
  { key: "proof", header: "Chứng từ", width: 110, cell: (row) => (row.proofMethod ? proofMethodLabel(row.proofMethod) : "—") },
  { key: "occurredAt", header: "Thời gian", width: 130, cell: (row) => formatDateTime(row.occurredAt) },
];

function ShipmentRecord({ data }: { data: AdminShipmentDetail }) {
  const shipment = data.shipment;
  const chargeable = shipment.parcels.reduce((sum, parcel) => sum + parcel.chargeableWeightKg, 0);
  const events = useMemo(
    () => [...data.events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    [data.events],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2.5">
        <span className="h-3.5 w-[3px] rounded-full bg-brand" aria-hidden="true" />
        <p className="text-sm font-bold">
          Mã đơn : <span className="font-mono">{shipment.trackingCode}</span>
        </p>
        <ShipmentStatusTag status={shipment.status} />
        <span className="text-xs text-muted-foreground">{lifecycleLabel(shipment.lifecycleStatus)}</span>
        <Link
          href={`/shipments/${encodeURIComponent(shipment.trackingCode)}`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-brand hover:underline"
        >
          Mở chi tiết vận đơn <ExternalLinkIcon className="size-3" />
        </Link>
      </div>

      <Panel title="Thông tin cơ bản" collapsible bodyClassName="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
        <InfoCard title="Thông tin đơn">
          <InfoList
            items={[
              ["Mã vận đơn", <span key="code" className="font-mono">{shipment.trackingCode}</span>],
              ["Mã tham chiếu", shipment.merchantReference],
              ["Thời gian tạo", formatDateTime(shipment.createdAt)],
              ["Dịch vụ", serviceLevelLabel(shipment.pricing.serviceLevel)],
              ["Hoàn tất lúc", shipment.completedAt ? formatDateTime(shipment.completedAt) : null],
              ["Lý do huỷ", shipment.cancellationReason],
              ["Ghi chú", shipment.note],
            ]}
          />
        </InfoCard>
        <InfoCard title="Chi tiết gửi hàng">
          <InfoList
            items={[
              ["Bưu cục gửi", `${shipment.routing.originHubName} (${shipment.routing.originHubCode})`],
              ["Bưu cục phát", `${shipment.routing.destinationHubName} (${shipment.routing.destinationHubCode})`],
              ["Vùng giá", pricingZoneLabel(shipment.pricing.pricingZone)],
              ["Quãng đường", shipment.routing.distanceKm !== null ? `${shipment.routing.distanceKm.toLocaleString("vi-VN")} km` : null],
              ["Dự kiến giao", shipment.routing.estimatedDeliveryAt ? formatDateTime(shipment.routing.estimatedDeliveryAt) : null],
              ["Số kiện", shipment.parcels.length],
              ["KL tính cước", `${chargeable.toLocaleString("vi-VN")} kg`],
            ]}
          />
        </InfoCard>
        <InfoCard title="Thông tin thanh toán">
          <InfoList
            items={[
              ["Người trả cước", shippingFeePayerLabel(shipment.shippingFeePayer)],
              ["Cước", money(shipment.pricing.shippingFee)],
              ["COD", money(shipment.pricing.codAmount)],
              ["Khai giá", money(shipment.pricing.declaredValue)],
              ["Thu người nhận", money(shipment.collection.amountToCollect)],
              ["Thu tiền", collectionStatusLabel(shipment.collection.status)],
              ["Đã thu lúc", shipment.collection.collectedAt ? formatDateTime(shipment.collection.collectedAt) : null],
            ]}
          />
        </InfoCard>
        <InfoCard title="Thông tin người gửi">
          <InfoList
            items={[
              ["Họ tên", shipment.sender.contactName],
              ["Điện thoại", shipment.sender.contactPhone],
              ["Địa chỉ", address(shipment.sender)],
            ]}
          />
        </InfoCard>
        <InfoCard title="Thông tin người nhận">
          <InfoList
            items={[
              ["Họ tên", shipment.recipient.contactName],
              ["Điện thoại", shipment.recipient.contactPhone],
              ["Địa chỉ", address(shipment.recipient)],
            ]}
          />
        </InfoCard>
        <InfoCard title="Kiện hàng">
          <ul className="space-y-1.5 text-xs">
            {shipment.parcels.map((parcel) => (
              <li key={parcel.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono font-semibold">{parcel.code}</span>
                <span className="text-muted-foreground">
                  {goodsCategoryLabel(parcel.category)} · {parcel.chargeableWeightKg.toLocaleString("vi-VN")} kg
                </span>
                <span className="ml-auto">{parcelStatusLabel(parcel.status)}</span>
              </li>
            ))}
          </ul>
        </InfoCard>
      </Panel>

      <Panel title={`Hành trình (${events.length})`} collapsible bodyClassName="p-0">
        <DataTable columns={eventColumns} rows={events} rowKey={(row) => row.id} emptyText="Chưa có sự kiện" maxHeight="28rem" fill={false} className="rounded-none border-0" />
      </Panel>

      {data.deliveryAttempts.length ? (
        <Panel title={`Lần giao hàng (${data.deliveryAttempts.length})`} collapsible bodyClassName="p-0">
          <DataTable columns={attemptColumns} rows={data.deliveryAttempts} rowKey={(row) => row.id} maxHeight="20rem" fill={false} className="rounded-none border-0" />
        </Panel>
      ) : null}
    </div>
  );
}

export function ShipmentTracking({ initialCodes = "" }: { initialCodes?: string }) {
  const [text, setText] = useState(parseCodes(initialCodes).join("\n"));
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codes = parseCodes(text);
  const tooMany = codes.length > MAX_CODES;

  const lookup = useCallback(async (wanted: string[]) => {
    if (!wanted.length) return;
    setLoading(true);
    const found: Result[] = wanted.map((code) => ({ code }));
    let next = 0;
    // A few lookups at a time: fast for a batch without flooding the gateway.
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_LOOKUPS, wanted.length) }, async () => {
        while (next < wanted.length) {
          const index = next++;
          try {
            found[index] = { code: wanted[index]!, detail: await getAdminShipment(wanted[index]!) };
          } catch (reason) {
            found[index] = { code: wanted[index]!, error: shipmentErrorMessage(reason, "Không tra được vận đơn này.") };
          }
        }
      }),
    );
    setResults(found);
    setSelected(found.find((item) => item.detail)?.code ?? found[0]?.code ?? null);
    setLoading(false);
  }, []);

  const initialLookup = useRef(parseCodes(initialCodes).slice(0, MAX_CODES));
  useEffect(() => {
    const task = window.setTimeout(() => void lookup(initialLookup.current), 0);
    return () => window.clearTimeout(task);
  }, [lookup]);

  const current = results.find((item) => item.code === selected);
  const foundCount = results.filter((item) => item.detail).length;

  return (
    <div className="grid gap-2.5 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2.5 rounded-md border bg-card p-3 lg:sticky lg:top-[6.25rem] lg:max-h-[calc(100dvh-7rem)]">
        <select className={controlClass} disabled aria-label="Tra theo">
          <option>Theo vận đơn</option>
        </select>
        <div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
            aria-label="Mã vận đơn cần tra"
            placeholder={`Nhập mã vận đơn, mỗi dòng một mã.\nTra được tối đa ${MAX_CODES} mã một lần.`}
            className={cn(controlClass, "h-auto resize-y py-2 font-mono uppercase placeholder:font-sans placeholder:normal-case")}
          />
          <p className={cn("mt-1 text-right text-[0.68rem]", tooMany ? "text-brand" : "text-muted-foreground")}>
            {codes.length}/{MAX_CODES} mã
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ToolbarButton
            tone="solid"
            icon={<SearchIcon />}
            disabled={loading || codes.length === 0 || tooMany}
            onClick={() => void lookup(codes)}
            className="justify-center"
          >
            Tra cứu
          </ToolbarButton>
          <ToolbarButton
            icon={<RotateCcwIcon />}
            onClick={() => {
              setText("");
              setResults([]);
              setSelected(null);
            }}
            className="justify-center"
          >
            Làm mới
          </ToolbarButton>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t pt-2.5">
          <p className="flex items-center gap-2 text-xs font-bold">
            <span className="h-3.5 w-[3px] rounded-full bg-brand" aria-hidden="true" />
            Danh sách đơn
          </p>
          {results.length ? (
            <ul className="scrollbar-thin mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {results.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    onClick={() => setSelected(item.code)}
                    aria-pressed={item.code === selected}
                    className={cn(
                      "w-full rounded border px-2.5 py-1.5 text-left transition",
                      item.code === selected ? "border-brand bg-brand/5" : "border-transparent hover:bg-muted",
                    )}
                  >
                    <span className="block truncate font-mono text-xs font-semibold">{item.code}</span>
                    <span className="mt-0.5 block text-[0.68rem]">
                      {item.detail ? (
                        <span className="text-muted-foreground">{shipmentStatusLabel(item.detail.shipment.status)}</span>
                      ) : (
                        <span className="text-brand">{item.error}</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState text={loading ? "Đang tra cứu…" : "Chưa tra mã nào"} className="py-6" />
          )}
          {results.length ? (
            <p className="mt-2 border-t pt-2 text-[0.68rem] text-muted-foreground">
              Số tra cứu {results.length} · Tìm thấy {foundCount}
            </p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        {loading ? (
          <div className="rounded-md border bg-card">
            <EmptyState text="Đang tra cứu…" className="py-24" />
          </div>
        ) : current?.detail ? (
          <ShipmentRecord data={current.detail} />
        ) : (
          <div className="rounded-md border bg-card">
            <EmptyState text={current?.error ?? "Nhập mã vận đơn bên trái để xem hành trình"} className="py-24" />
          </div>
        )}
      </div>
    </div>
  );
}
