"use client";

import { PencilIcon, SaveIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type AdminShipmentUpdate, updateAdminShipment } from "@/features/shipments/api";
import type { AdminShipmentDetail } from "@/features/shipments/contracts";
import { shipmentErrorMessage } from "@/features/shipments/presentation";

const inputClass =
  "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/30";

/**
 * Corrects the recipient's name, phone or street and the note, also after pickup (for example
 * when the recipient calls the hotline). Ward, COD and parcels cannot change here.
 */
export function ShipmentEditCard({
  data,
  onUpdated,
}: {
  data: AdminShipmentDetail;
  onUpdated: (detail: AdminShipmentDetail) => void;
}) {
  const shipment = data.shipment;
  const initial = {
    recipientName: shipment.recipient.contactName,
    recipientPhone: shipment.recipient.contactPhone,
    recipientAddressLine: shipment.recipient.addressLine,
    note: shipment.note ?? "",
  };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: AdminShipmentUpdate = { reason: reason.trim() };
    (Object.keys(initial) as (keyof typeof initial)[]).forEach((field) => {
      if (draft[field].trim() !== initial[field]) body[field] = draft[field].trim();
    });
    if (Object.keys(body).length === 1) {
      setOpen(false);
      return;
    }
    if (!body.reason) {
      toast.error("Vui lòng ghi lý do sửa để lưu vào lịch sử vận đơn.");
      return;
    }
    setSaving(true);
    try {
      onUpdated(await updateAdminShipment(shipment.trackingCode, body));
      setOpen(false);
      setReason("");
      toast.success("Đã cập nhật vận đơn.");
    } catch (cause) {
      toast.error(shipmentErrorMessage(cause, "Không thể cập nhật vận đơn."));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-black">Sửa thông tin người nhận</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tên, số điện thoại, địa chỉ chi tiết và ghi chú. Đổi phường, tiền thu hộ hay kiện hàng thì cần huỷ và tạo đơn mới.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setDraft(initial);
            setOpen(true);
          }}
        >
          <PencilIcon className="size-3.5" /> Sửa
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
        <p className="text-sm font-black sm:col-span-2">Sửa thông tin người nhận</p>
        <label className="grid gap-1 text-xs font-bold">
          Tên người nhận
          <input className={inputClass} value={draft.recipientName} maxLength={120} required onChange={(event) => setDraft({ ...draft, recipientName: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Số điện thoại
          <input className={inputClass} inputMode="tel" value={draft.recipientPhone} maxLength={20} required onChange={(event) => setDraft({ ...draft, recipientPhone: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs font-bold sm:col-span-2">
          Địa chỉ chi tiết · {shipment.recipient.wardName}, {shipment.recipient.provinceName}
          <input className={inputClass} value={draft.recipientAddressLine} maxLength={500} required onChange={(event) => setDraft({ ...draft, recipientAddressLine: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs font-bold sm:col-span-2">
          Ghi chú
          <textarea className={`${inputClass} h-auto py-2`} rows={2} value={draft.note} maxLength={1000} onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
        </label>
        <label className="grid gap-1 text-xs font-bold sm:col-span-2">
          Lý do sửa (ghi vào lịch sử vận đơn)
          <input className={inputClass} value={reason} maxLength={300} placeholder="Ví dụ: người nhận gọi tổng đài đổi số" onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            <SaveIcon className="size-3.5" /> Lưu
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>
            Huỷ bỏ
          </Button>
        </div>
      </form>
    </Card>
  );
}
