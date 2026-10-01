"use client";

import { PlusIcon, PrinterIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getShipmentLabels } from "@/features/counter/api";
import type { ShipmentLabels } from "@/features/counter/contracts";
import { counterErrorMessage } from "@/features/counter/errors";
import { getAdminShipment } from "@/features/shipments/api";
import { Barcode } from "@/features/shipments/barcode";
import type { AdminShipmentDetail } from "@/features/shipments/contracts";
import { money } from "@/features/shipments/presentation";
import { formatDateTime } from "@/lib/utils";

/**
 * After booking at the counter: one label per parcel to stick on, and a receipt the customer keeps.
 * Only the printable part is printed; the buttons and the console around it are hidden.
 */
export function CounterPrint({ trackingCode }: { trackingCode: string }) {
  const [labels, setLabels] = useState<ShipmentLabels | null>(null);
  const [detail, setDetail] = useState<AdminShipmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getShipmentLabels(trackingCode), getAdminShipment(trackingCode)])
      .then(([nextLabels, nextDetail]) => {
        if (cancelled) return;
        setLabels(nextLabels);
        setDetail(nextDetail);
      })
      .catch((reason) => {
        if (!cancelled) setError(counterErrorMessage(reason, "Không tải được nhãn kiện."));
      });
    return () => {
      cancelled = true;
    };
  }, [trackingCode]);

  if (error) return <Card className="p-6 text-sm font-bold text-destructive">{error}</Card>;
  if (!labels || !detail) return <Card className="p-6 text-sm text-muted-foreground">Đang tải nhãn kiện…</Card>;

  const shipment = detail.shipment;
  const feePaid = detail.counterFeePaidAmount ?? 0;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={() => window.print()}>
          <PrinterIcon className="size-3.5" /> In nhãn và biên nhận
        </Button>
        <Link href="/counter/new" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold hover:bg-muted">
          <PlusIcon className="size-3.5" /> Nhận gửi đơn khác
        </Link>
        <Link href={`/shipments/${encodeURIComponent(trackingCode)}`} className="text-xs text-brand hover:underline">
          Xem chi tiết vận đơn
        </Link>
      </div>

      <div className="counter-print grid gap-4">
        <section className="break-after-page rounded-lg border bg-white p-5 text-black">
          <div className="flex items-start justify-between gap-4 border-b border-black pb-3">
            <div>
              <p className="text-lg font-black tracking-tight">PAVEX · BIÊN NHẬN GỬI HÀNG</p>
              <p className="text-xs">Nhận tại {shipment.routing.originHubName} · {formatDateTime(shipment.createdAt)}</p>
            </div>
            <p className="font-mono text-sm font-black">{labels.trackingCode}</p>
          </div>
          <div className="mt-3 flex justify-center">
            <Barcode value={labels.trackingCode} label={`Mã vạch vận đơn ${labels.trackingCode}`} />
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <Line label="Người gửi" value={`${shipment.sender.contactName} · ${shipment.sender.contactPhone}`} />
            <Line label="Người nhận" value={`${shipment.recipient.contactName} · ${shipment.recipient.contactPhone}`} />
            <Line label="Giao đến" value={`${shipment.recipient.addressLine}, ${shipment.recipient.wardName}, ${shipment.recipient.provinceName}`} wide />
            <Line label="Số kiện" value={`${labels.parcelCount}`} />
            <Line label="Dịch vụ" value={shipment.pricing.serviceLevel === "EXPRESS" ? "Hoả tốc" : "Tiêu chuẩn"} />
            <Line label="Cước vận chuyển" value={money(shipment.pricing.shippingFee)} />
            <Line label="Đã thu tại quầy" value={money(feePaid)} />
            <Line label="Người nhận trả khi giao" value={money(labels.amountToCollect)} />
            {shipment.pricing.codAmount > 0 ? <Line label="Tiền thu hộ trả lại người gửi" value={money(shipment.pricing.codAmount)} /> : null}
          </dl>
          {shipment.pricing.codAmount > 0 ? (
            <p className="mt-3 rounded border border-black p-2 text-xs">
              Sau khi giao thành công, quý khách nhận lại tiền thu hộ tại quầy {shipment.routing.originHubName}. Mang theo biên nhận và
              dùng đúng số điện thoại {shipment.sender.contactPhone}.
            </p>
          ) : null}
          <p className="mt-3 text-xs">Tra cứu hành trình: nhập mã {labels.trackingCode} tại trang Tra cứu vận đơn của Pavex.</p>
        </section>

        {labels.parcels.map((parcel) => (
          <section key={parcel.parcelCode} className="break-after-page rounded-lg border bg-white p-4 text-black">
            <div className="flex items-start justify-between gap-3">
              <p className="text-lg font-black">PAVEX</p>
              <p className="text-right text-xs font-bold">
                Kiện {parcel.sequence}/{labels.parcelCount}
                <br />
                Đến bưu cục {parcel.destinationHubCode}
              </p>
            </div>
            <div className="mt-2 flex flex-col items-center">
              <Barcode value={parcel.parcelCode} label={`Mã vạch kiện ${parcel.parcelCode}`} />
              <p className="mt-1 font-mono text-sm font-black tracking-[0.08em]">{parcel.parcelCode}</p>
            </div>
            <div className="mt-3 grid gap-2 border-t border-black pt-2 text-sm">
              <p>
                <span className="font-bold">Gửi:</span> {parcel.senderName} · {parcel.senderPhone}
              </p>
              <p>
                <span className="font-bold">Nhận:</span> {parcel.recipientName} · {parcel.recipientPhone}
                <br />
                {parcel.recipientAddress}
              </p>
            </div>
            <div className="mt-2 flex items-end justify-between border-t border-black pt-2">
              <div className="text-xs">
                {parcel.chargeableWeightKg} kg{parcel.isFragile ? " · HÀNG DỄ VỠ" : ""}
                {parcel.note ? <p>Ghi chú: {parcel.note}</p> : null}
              </div>
              <div className="text-right">
                <p className="text-[0.65rem]">Thu người nhận</p>
                <p className="text-lg font-black">{money(parcel.amountToCollect)}</p>
                {labels.parcelCount > 1 ? <p className="text-[0.6rem]">Thu một lần cho cả {labels.parcelCount} kiện</p> : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Line({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[0.65rem] uppercase tracking-wide">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
