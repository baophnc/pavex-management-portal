"use client";

import {
  AlertTriangleIcon,
  ArrowRightLeftIcon,
  BanIcon,
  CheckCircle2Icon,
  CircleGaugeIcon,
  LoaderCircleIcon,
  PackageCheckIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ScaleIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LocationName, LocationPicker } from "@/components/forms/location-picker";
import { REASONS, ReasonPicker } from "@/components/forms/reason-picker";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/features/auth/access-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adjustShipmentWeight,
  completeShipmentCancellation,
  completeShipmentForward,
  completeShipmentReturn,
  getShipmentExceptionState,
  placeShipmentHold,
  releaseShipmentHold,
  requestShipmentCancellation,
  requestShipmentForward,
  requestShipmentReturn,
  reviewShipmentCancellation,
  reviewShipmentForward,
  reviewShipmentReturn,
  reviewShipmentWeight,
} from "@/features/shipments/api";
import type {
  ForwardRecipient,
  ShipmentExceptionRequest,
  ShipmentExceptionRequestKind,
  ShipmentExceptionRequestStatus,
  ShipmentExceptionState,
  ShipmentLifecycleStatus,
  ShipmentParcel,
  ShipmentWeightAdjustment,
} from "@/features/shipments/contracts";
import { shipmentErrorMessage } from "@/features/shipments/presentation";
import { cn, formatDateTime } from "@/lib/utils";

const ACTIVE_REQUEST_STATUSES: ShipmentExceptionRequestStatus[] = [
  "PENDING_APPROVAL",
  "APPROVED",
  "PROCESSING",
];

function requestKindLabel(kind: ShipmentExceptionRequestKind) {
  if (kind === "RETURN") return "Hoàn hàng";
  if (kind === "FORWARD") return "Chuyển tiếp";
  return "Hủy vận đơn";
}

function requestStatusLabel(status: ShipmentExceptionRequestStatus) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Chờ duyệt";
    case "APPROVED":
      return "Đã duyệt";
    case "REJECTED":
      return "Từ chối";
    case "PROCESSING":
      return "Đang xử lý";
    case "COMPLETED":
      return "Hoàn tất";
  }
}

function requestTone(status: ShipmentExceptionRequestStatus) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "APPROVED":
    case "PROCESSING":
      return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "COMPLETED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "REJECTED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
  }
}

function textAreaClass() {
  return "min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-50";
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof ShieldAlertIcon;
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-3.5">
      <div className="flex items-center gap-2">
        <span className={cn("grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground", tone)}>
          <Icon className="size-4" />
        </span>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-sm font-black">{value}</p>
      <p className="mt-1 text-[0.64rem] leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}

function RequestTimeline({ request }: { request: ShipmentExceptionRequest }) {
  return (
    <div className="mt-3 grid gap-2 text-[0.66rem] text-muted-foreground sm:grid-cols-3">
      <div className="rounded-lg border bg-muted/15 p-2.5">
        <p className="font-bold text-foreground">Yêu cầu</p>
        <p className="mt-1">{formatDateTime(request.requestedAt)}</p>
      </div>
      <div className="rounded-lg border bg-muted/15 p-2.5">
        <p className="font-bold text-foreground">Duyệt</p>
        <p className="mt-1">{request.reviewedAt ? formatDateTime(request.reviewedAt) : "Chưa duyệt"}</p>
      </div>
      <div className="rounded-lg border bg-muted/15 p-2.5">
        <p className="font-bold text-foreground">Hoàn tất</p>
        <p className="mt-1">{request.completedAt ? formatDateTime(request.completedAt) : "Chưa hoàn tất"}</p>
      </div>
    </div>
  );
}

type RequestActions = {
  review: (approve: boolean, note: string | null) => Promise<void>;
  complete: (note: string | null) => Promise<void>;
};

function ExistingRequestCard({
  request,
  pending,
  actions,
  canManage,
}: {
  request: ShipmentExceptionRequest;
  pending: boolean;
  actions: RequestActions;
  canManage: boolean;
}) {
  const [note, setNote] = useState("");
  const canReview = request.status === "PENDING_APPROVAL";
  const canComplete = request.status === "APPROVED" || request.status === "PROCESSING";

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">{requestKindLabel(request.kind)}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{request.reason}</p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[0.62rem] font-black", requestTone(request.status))}>
          {requestStatusLabel(request.status)}
        </span>
      </div>

      {request.kind === "FORWARD" && request.forwardRecipient ? (
        <div className="mt-3 rounded-lg border bg-muted/15 p-3 text-xs">
          <p className="font-black">Người nhận chuyển tiếp</p>
          <p className="mt-1">{request.forwardRecipient.contactName} · {request.forwardRecipient.contactPhone}</p>
          <p className="mt-1 text-muted-foreground">{request.forwardRecipient.addressLine}</p>
          <p className="mt-1 text-muted-foreground"><LocationName provinceCode={request.forwardRecipient.provinceCode} wardCode={request.forwardRecipient.wardCode} /></p>
        </div>
      ) : null}

      {request.reviewNote ? (
        <p className="mt-3 rounded-lg border bg-muted/15 p-3 text-xs">
          <strong>Ghi chú duyệt:</strong> {request.reviewNote}
        </p>
      ) : null}

      <RequestTimeline request={request} />

      {canReview ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div><p className="text-xs font-black">Đang chờ trưởng bưu cục duyệt</p><p className="mt-1 text-[0.66rem] text-muted-foreground">Người gửi yêu cầu không tự duyệt được: trưởng bưu cục (hoặc quản lý vận hành) duyệt ở trang Duyệt ngoại lệ.</p></div>
          {canManage ? <Link href="/shipments/exceptions?status=PENDING_APPROVAL" className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-black hover:bg-muted">Mở trang duyệt →</Link> : null}
        </div>
      ) : canComplete && canManage ? (
        <div className="mt-4 border-t pt-4">
          <label className="grid gap-2 text-xs font-bold">Ghi chú hoàn tất<textarea className={textAreaClass()} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Ghi chú khi hoàn tất xử lý/định tuyến..." disabled={pending} /></label>
          <Button className="mt-3" type="button" size="sm" onClick={() => void actions.complete(note.trim() || null)} disabled={pending}>
            {pending ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <PackageCheckIcon className="size-3.5" />} Hoàn tất quy trình
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function NewRequestForms({
  shipmentId,
  state,
  pending,
  mutate,
}: {
  shipmentId: string;
  state: ShipmentExceptionState;
  pending: boolean;
  mutate: (label: string, action: () => Promise<ShipmentExceptionState>) => Promise<void>;
}) {
  const [returnReason, setReturnReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [forwardReason, setForwardReason] = useState("");
  const [recipient, setRecipient] = useState<ForwardRecipient>({
    contactName: "",
    contactPhone: "",
    addressLine: "",
    provinceCode: "",
    wardCode: "",
  });

  const activeRequest = [state.returnRequest, state.forwardRequest, state.cancellationRequest].find(
    (request) => request && ACTIVE_REQUEST_STATUSES.includes(request.status),
  );
  if (activeRequest) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5">
        <p className="font-black text-amber-700 dark:text-amber-300">Đang có một quy trình ngoại lệ chưa kết thúc</p>
        <p className="mt-1 text-muted-foreground">
          Mỗi vận đơn chỉ có một quy trình hoàn hàng / chuyển tiếp / hủy tại một thời điểm. Hoàn tất hoặc kết thúc quy trình hiện tại trước khi tạo yêu cầu khác.
        </p>
      </div>
    );
  }

  const createReturn = async () => {
    if (!returnReason.trim()) return toast.error("Nhập lý do hoàn hàng.");
    await mutate("Đã tạo yêu cầu hoàn hàng.", () => requestShipmentReturn(shipmentId, returnReason.trim()));
    setReturnReason("");
  };

  const createCancellation = async () => {
    if (!cancelReason.trim()) return toast.error("Nhập lý do hủy vận đơn.");
    await mutate("Đã tạo yêu cầu hủy vận đơn.", () => requestShipmentCancellation(shipmentId, cancelReason.trim()));
    setCancelReason("");
  };

  const createForward = async () => {
    if (!forwardReason.trim()) return toast.error("Nhập lý do chuyển tiếp.");
    if (!recipient.contactName.trim() || !recipient.contactPhone.trim() || !recipient.addressLine.trim() || !recipient.provinceCode.trim() || !recipient.wardCode.trim()) {
      return toast.error("Điền đầy đủ thông tin người nhận chuyển tiếp.");
    }
    await mutate("Đã tạo yêu cầu chuyển tiếp.", () => requestShipmentForward(shipmentId, {
      reason: forwardReason.trim(),
      recipient: {
        contactName: recipient.contactName.trim(),
        contactPhone: recipient.contactPhone.trim(),
        addressLine: recipient.addressLine.trim(),
        provinceCode: recipient.provinceCode.trim(),
        wardCode: recipient.wardCode.trim(),
      },
    }));
    setForwardReason("");
    setRecipient({ contactName: "", contactPhone: "", addressLine: "", provinceCode: "", wardCode: "" });
  };

  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2"><RotateCcwIcon className="size-4 text-brand" /><p className="text-sm font-black">Yêu cầu hoàn hàng</p></div>
        <ReasonPicker className="mt-3" reasons={REASONS.shipmentReturn} value={returnReason} onChange={setReturnReason} maxLength={1000} placeholder="Lý do hoàn hàng..." disabled={pending} />
        <Button className="mt-3" type="button" size="sm" variant="outline" onClick={() => void createReturn()} disabled={pending}>
          Tạo yêu cầu hoàn hàng
        </Button>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2"><ArrowRightLeftIcon className="size-4 text-brand" /><p className="text-sm font-black">Yêu cầu chuyển tiếp</p></div>
        <ReasonPicker className="mt-3" reasons={REASONS.shipmentForward} value={forwardReason} onChange={setForwardReason} maxLength={1000} placeholder="Lý do chuyển tiếp..." disabled={pending} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Input placeholder="Tên người nhận" value={recipient.contactName} onChange={(event) => setRecipient((current) => ({ ...current, contactName: event.target.value }))} disabled={pending} />
          <Input placeholder="Số điện thoại" value={recipient.contactPhone} onChange={(event) => setRecipient((current) => ({ ...current, contactPhone: event.target.value }))} disabled={pending} />
          <Input className="sm:col-span-2" placeholder="Địa chỉ" value={recipient.addressLine} onChange={(event) => setRecipient((current) => ({ ...current, addressLine: event.target.value }))} disabled={pending} />
          <LocationPicker
            className="sm:col-span-2"
            provinceCode={recipient.provinceCode}
            wardCode={recipient.wardCode}
            disabled={pending}
            onChange={(location) => setRecipient((current) => ({ ...current, ...location }))}
          />
        </div>
        <Button className="mt-3" type="button" size="sm" variant="outline" onClick={() => void createForward()} disabled={pending}>
          Tạo yêu cầu chuyển tiếp
        </Button>
      </div>

      <div className="rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2"><BanIcon className="size-4 text-destructive" /><p className="text-sm font-black">Yêu cầu hủy vận đơn</p></div>
        <ReasonPicker className="mt-3" reasons={REASONS.shipmentCancel} value={cancelReason} onChange={setCancelReason} maxLength={1000} placeholder="Lý do hủy vận đơn..." disabled={pending} />
        <Button className="mt-3" type="button" size="sm" variant="outline" onClick={() => void createCancellation()} disabled={pending}>
          Tạo yêu cầu hủy
        </Button>
      </div>
    </div>
  );
}

function HoldPanel({
  shipmentId,
  state,
  pending,
  hubOptions,
  mutate,
}: {
  shipmentId: string;
  state: ShipmentExceptionState;
  pending: boolean;
  hubOptions: Array<{ id: string; label: string }>;
  mutate: (label: string, action: () => Promise<ShipmentExceptionState>) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [hubId, setHubId] = useState("");

  const submit = async () => {
    if (!reason.trim()) return toast.error(state.isOnHold ? "Nhập lý do bỏ tạm giữ." : "Nhập lý do tạm giữ vận đơn.");
    const input = { reason: reason.trim(), hubId: hubId || null };
    if (state.isOnHold) {
      await mutate("Đã bỏ tạm giữ.", () => releaseShipmentHold(shipmentId, input));
    } else {
      await mutate("Đã tạm giữ vận đơn.", () => placeShipmentHold(shipmentId, input));
    }
    setReason("");
  };

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">Tạm giữ / bỏ tạm giữ vận đơn</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {state.isOnHold ? `Đang tạm giữ: ${state.holdReason ?? "Không có lý do"}` : "Vận đơn hiện không bị tạm giữ."}
          </p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[0.62rem] font-black", state.isOnHold ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>{state.isOnHold ? "ĐANG TẠM GIỮ" : "BÌNH THƯỜNG"}</span>
      </div>
      {state.heldAt ? <p className="mt-2 text-[0.64rem] text-muted-foreground">Tạm giữ từ {formatDateTime(state.heldAt)}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem]">
        <ReasonPicker key={state.isOnHold ? "release" : "hold"} reasons={state.isOnHold ? REASONS.shipmentRelease : REASONS.shipmentHold} value={reason} onChange={setReason} maxLength={1000} placeholder={state.isOnHold ? "Lý do bỏ tạm giữ..." : "Lý do tạm giữ vận đơn..."} disabled={pending} />
        <div className="grid content-start gap-2">
          <label className="grid gap-1.5 text-xs font-bold">Bưu cục liên quan
            <select value={hubId} onChange={(event) => setHubId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" disabled={pending}>
              <option value="">Không gắn bưu cục</option>
              {hubOptions.map((hub) => <option key={hub.id} value={hub.id}>{hub.label}</option>)}
            </select>
          </label>
          <Button type="button" size="sm" variant={state.isOnHold ? "default" : "outline"} onClick={() => void submit()} disabled={pending || (state.isOnHold && state.hasPendingWeightReview)}>
            {pending ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : state.isOnHold ? <ShieldCheckIcon className="size-3.5" /> : <ShieldAlertIcon className="size-3.5" />}
            {state.isOnHold ? "Bỏ tạm giữ" : "Tạm giữ vận đơn"}
          </Button>
          {state.isOnHold && state.hasPendingWeightReview ? (
            <p className="text-[0.62rem] font-bold text-amber-700 dark:text-amber-300">Đang chờ duyệt cân lại nên chưa thể gỡ tạm giữ.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WeightAdjustmentRow({
  adjustment,
  parcelCode,
  pending,
  canReview,
  mutate,
  shipmentId,
  currentUserId,
}: {
  adjustment: ShipmentWeightAdjustment;
  parcelCode: string | null;
  pending: boolean;
  canReview: boolean;
  mutate: (label: string, action: () => Promise<ShipmentExceptionState>) => Promise<void>;
  shipmentId: string;
  currentUserId: string | null;
}) {
  const [note, setNote] = useState("");
  const selfReview = Boolean(currentUserId && currentUserId === adjustment.actorUserId);
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black">Kiện {parcelCode ?? "không còn trong dữ liệu hiện tại"}</p>
          <p className="mt-1 text-xs font-bold">{adjustment.oldActualWeightKg} kg → {adjustment.newActualWeightKg} kg thực tế</p>
          <p className="mt-1 text-[0.64rem] text-muted-foreground">Chargeable {adjustment.oldChargeableWeightKg} kg → {adjustment.newChargeableWeightKg} kg</p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[0.62rem] font-black", adjustment.reviewCompleted ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{adjustment.reviewCompleted ? "ĐÃ DUYỆT" : "CHỜ DUYỆT"}</span>
      </div>
      <p className="mt-3 text-xs"><strong>Lý do:</strong> {adjustment.reason}</p>
      <p className="mt-1 text-[0.64rem] text-muted-foreground">Điều chỉnh {formatDateTime(adjustment.adjustedAt)}</p>
      {adjustment.reviewNote ? <p className="mt-2 rounded-lg border bg-muted/15 p-2.5 text-xs"><strong>Ghi chú duyệt:</strong> {adjustment.reviewNote}</p> : null}
      {!adjustment.reviewCompleted && canReview ? (
        <div className="mt-3 border-t pt-3">
          {selfReview ? <p className="mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[0.68rem] font-bold text-amber-800 dark:text-amber-200">Bạn là người ghi nhận cân lại. Một quản lý vận hành hoặc quản trị viên khác phải duyệt.</p> : null}
          <Input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Ghi chú kiểm tra sức chứa/định tuyến..." disabled={pending} />
          <Button className="mt-2" type="button" size="sm" onClick={() => {
            if (!note.trim()) return toast.error("Vui lòng nhập ghi chú khi duyệt cân lại.");
            void mutate("Đã duyệt xong cân lại.", () => reviewShipmentWeight(shipmentId, adjustment.adjustmentId, note.trim()));
          }} disabled={pending || selfReview}>
            <CheckCircle2Icon className="size-3.5" /> Hoàn tất review
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function WeightPanel({
  shipmentId,
  state,
  parcels,
  hubOptions,
  pending,
  canAdjust,
  canReview,
  mutate,
  currentUserId,
}: {
  shipmentId: string;
  state: ShipmentExceptionState;
  parcels: ShipmentParcel[];
  hubOptions: Array<{ id: string; label: string }>;
  pending: boolean;
  canAdjust: boolean;
  canReview: boolean;
  mutate: (label: string, action: () => Promise<ShipmentExceptionState>) => Promise<void>;
  currentUserId: string | null;
}) {
  const [parcelId, setParcelId] = useState("");
  const [weight, setWeight] = useState("");
  const [reason, setReason] = useState("");
  const [hubId, setHubId] = useState("");

  const submit = async () => {
    if (!parcelId) return toast.error("Chọn kiện cần cân lại.");
    const actualWeightKg = Number(weight);
    if (!Number.isFinite(actualWeightKg) || actualWeightKg <= 0) return toast.error("Khối lượng thực tế phải lớn hơn 0.");
    if (!reason.trim()) return toast.error("Nhập lý do điều chỉnh khối lượng.");
    await mutate("Đã ghi nhận cân lại; vận đơn bị tạm giữ cho tới khi được duyệt.", () => adjustShipmentWeight(shipmentId, {
      parcelId: parcelId.trim(),
      actualWeightKg,
      reason: reason.trim(),
      hubId: hubId || null,
    }));
    setParcelId("");
    setWeight("");
    setReason("");
  };

  return (
    <div className="space-y-3">
      {canAdjust ? (
        <div className="rounded-xl border bg-background p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand"><ScaleIcon className="size-4" /></span>
            <div>
              <p className="text-sm font-black">Ghi nhận cân lại kiện hàng</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Sau khi đổi khối lượng, vận đơn tự được tạm giữ để kiểm tra lại sức chứa và tuyến đi.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold">Kiện hàng
              <select value={parcelId} onChange={(event) => setParcelId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" disabled={pending || state.hasPendingWeightReview}>
                <option value="">Chọn kiện hàng</option>
                {parcels.map((parcel) => <option key={parcel.id} value={parcel.id}>{parcel.code} · {parcel.actualWeightKg} kg</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold">Khối lượng thực tế mới (kg)<Input type="number" min="0.001" step="0.001" value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="1.250" disabled={pending || state.hasPendingWeightReview} /></label>
            <label className="grid gap-1.5 text-xs font-bold">Bưu cục liên quan
              <select value={hubId} onChange={(event) => setHubId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm" disabled={pending || state.hasPendingWeightReview}>
                <option value="">Không gắn bưu cục</option>
                {hubOptions.map((hub) => <option key={hub.id} value={hub.id}>{hub.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-bold md:col-span-2">Lý do<textarea className={textAreaClass()} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} placeholder="Sai số cân tại bưu cục, cân lại bằng thiết bị chuẩn..." disabled={pending || state.hasPendingWeightReview} /></label>
          </div>
          <Button className="mt-3" type="button" size="sm" onClick={() => void submit()} disabled={pending || state.hasPendingWeightReview}>
            <ScaleIcon className="size-3.5" /> Ghi nhận weight adjustment
          </Button>
          {state.hasPendingWeightReview ? <p className="mt-2 text-[0.66rem] font-bold text-amber-700 dark:text-amber-300">Đang có một lần cân lại chờ duyệt; duyệt xong mới tạo được lần mới.</p> : null}
        </div>
      ) : null}

      {state.weightAdjustments.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {state.weightAdjustments.map((adjustment) => <WeightAdjustmentRow key={adjustment.adjustmentId} adjustment={adjustment} parcelCode={parcels.find((parcel) => parcel.id === adjustment.parcelId)?.code ?? null} pending={pending} canReview={canReview} mutate={mutate} shipmentId={shipmentId} currentUserId={currentUserId} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">Chưa có lần cân lại nào.</div>
      )}
    </div>
  );
}

export function ShipmentExceptionsPanel({
  shipmentId,
  trackingCode,
  lifecycleStatus,
  parcels,
  originHubId,
  originHubName,
  destinationHubId,
  destinationHubName,
  canManage,
  canRequest = canManage,
  canAdjustWeight,
  onShipmentChanged,
}: {
  shipmentId: string;
  trackingCode: string;
  lifecycleStatus: ShipmentLifecycleStatus;
  parcels: ShipmentParcel[];
  originHubId: string;
  originHubName: string;
  destinationHubId: string;
  destinationHubName: string;
  canManage: boolean;
  /** Hub staff may ask for a return, forward or cancellation; a manager approves it. */
  canRequest?: boolean;
  canAdjustWeight: boolean;
  onShipmentChanged?: () => void;
}) {
  const { user } = useAccess();
  const [state, setState] = useState<ShipmentExceptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hubOptions = useMemo(() => {
    const values = [
      { id: originHubId, label: `Bưu cục gửi · ${originHubName}` },
      { id: destinationHubId, label: `Bưu cục nhận · ${destinationHubName}` },
    ];
    return values.filter((item, index) => item.id && values.findIndex((candidate) => candidate.id === item.id) === index);
  }, [destinationHubId, destinationHubName, originHubId, originHubName]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setState(await getShipmentExceptionState(shipmentId));
    } catch (reason) {
      setState(null);
      setError(shipmentErrorMessage(reason, "Không tải được trạng thái ngoại lệ của vận đơn."));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const mutate = useCallback(async (success: string, action: () => Promise<ShipmentExceptionState>) => {
    setPending(true);
    try {
      const next = await action();
      setState(next);
      toast.success(success);
      onShipmentChanged?.();
    } catch (reason) {
      toast.error(shipmentErrorMessage(reason, "Thao tác ngoại lệ thất bại."));
    } finally {
      setPending(false);
    }
  }, [onShipmentChanged]);

  if (loading) {
    return <Card className="grid min-h-36 place-items-center text-xs font-bold text-muted-foreground"><span className="flex items-center gap-2"><LoaderCircleIcon className="size-4 animate-spin" /> Đang tải trạng thái ngoại lệ...</span></Card>;
  }

  if (error || !state) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" /><div><p className="text-sm font-black">Không tải được ngoại lệ của vận đơn</p><p className="mt-1 text-xs text-muted-foreground">{error ?? "Không có dữ liệu ngoại lệ."}</p></div></div>
          <Button type="button" size="sm" variant="outline" onClick={() => void load()}><RefreshCwIcon className="size-3.5" /> Thử lại</Button>
        </CardContent>
      </Card>
    );
  }

  const requests = [state.returnRequest, state.forwardRequest, state.cancellationRequest].filter((item): item is ShipmentExceptionRequest => Boolean(item));
  const activeCount = requests.filter((request) => ACTIVE_REQUEST_STATUSES.includes(request.status)).length;

  const requestActions = (request: ShipmentExceptionRequest): RequestActions => {
    if (request.kind === "RETURN") {
      return {
        review: async (approve, note) => mutate(approve ? "Đã duyệt yêu cầu hoàn hàng." : "Đã từ chối yêu cầu hoàn hàng.", () => reviewShipmentReturn(shipmentId, request.requestId, { approve, note })),
        complete: async (note) => mutate("Đã hoàn tất hoàn hàng.", () => completeShipmentReturn(shipmentId, request.requestId, note)),
      };
    }
    if (request.kind === "FORWARD") {
      return {
        review: async (approve, note) => mutate(approve ? "Đã duyệt yêu cầu chuyển tiếp." : "Đã từ chối yêu cầu chuyển tiếp.", () => reviewShipmentForward(shipmentId, request.requestId, { approve, note })),
        complete: async (note) => mutate("Đã hoàn tất chuyển tiếp.", () => completeShipmentForward(shipmentId, request.requestId, note)),
      };
    }
    return {
      review: async (approve, note) => mutate(approve ? "Đã duyệt yêu cầu hủy." : "Đã từ chối yêu cầu hủy.", () => reviewShipmentCancellation(shipmentId, request.requestId, { approve, note })),
      complete: async (note) => mutate("Đã hoàn tất hủy vận đơn.", () => completeShipmentCancellation(shipmentId, request.requestId, note)),
    };
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><ShieldAlertIcon className="size-4 text-brand" /><p className="text-sm font-black">Xử lý ngoại lệ</p></div>
          <p className="mt-1 text-[0.66rem] text-muted-foreground">{trackingCode} · Khi vận đơn không đi theo đường bình thường: tạm giữ để kiểm tra, hoàn về người gửi, chuyển sang địa chỉ khác, huỷ sau khi đã lấy hàng, hoặc cân lại khi khối lượng sai.</p>
        </div>
        <div className="flex gap-2"><Link href="/shipments/exceptions" className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-black hover:bg-muted">Hàng chờ duyệt</Link><Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={pending}><RefreshCwIcon className={cn("size-3.5", pending && "animate-spin")} /> Làm mới</Button></div>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={state.isOnHold ? ShieldAlertIcon : ShieldCheckIcon} label="Tạm giữ" value={state.isOnHold ? "Đang tạm giữ" : "Không tạm giữ"} hint={state.holdReason ?? "Không có lý do tạm giữ."} tone={state.isOnHold ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"} />
          <SummaryTile icon={ScaleIcon} label="Duyệt cân lại" value={state.hasPendingWeightReview ? "Đang chờ" : "Không có"} hint={`${state.weightAdjustments.length} lần điều chỉnh khối lượng đã ghi nhận.`} tone={state.hasPendingWeightReview ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : undefined} />
          <SummaryTile icon={CircleGaugeIcon} label="Quy trình ngoại lệ" value={activeCount ? `${activeCount} đang hoạt động` : "Không có"} hint={`${requests.length} yêu cầu đang ghi nhận.`} />
          <SummaryTile icon={lifecycleStatus === "ACTIVE" ? CheckCircle2Icon : BanIcon} label="Vòng đời" value={lifecycleStatus === "ACTIVE" ? "Đang hoạt động" : lifecycleStatus === "COMPLETED" ? "Đã hoàn tất" : "Đã hủy"} hint={lifecycleStatus === "ACTIVE" ? "Có thể tạo yêu cầu xử lý mới nếu không trùng yêu cầu đang mở." : "Chỉ tạo được yêu cầu xử lý mới khi vận đơn còn hoạt động."} />
        </div>

        {canManage ? <HoldPanel shipmentId={shipmentId} state={state} pending={pending} hubOptions={hubOptions} mutate={mutate} /> : null}

        {canManage || canRequest ? (
          <section className="space-y-3">
            <div><p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">Hoàn hàng / Chuyển tiếp / Hủy</p><p className="mt-1 text-xs text-muted-foreground">Nhân viên gửi yêu cầu kèm lý do, trưởng bưu cục duyệt. Khi duyệt, hệ thống đổi hướng đi của kiện, huỷ các việc đang giao dở và trả lại chỗ đã giữ trên xe.</p></div>
            {requests.length ? <div className="grid gap-3 xl:grid-cols-2">{requests.map((request) => <ExistingRequestCard key={request.requestId} request={request} pending={pending} actions={requestActions(request)} canManage={canManage} />)}</div> : <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">Chưa có yêu cầu ngoại lệ.</div>}
            {lifecycleStatus === "ACTIVE" ? <NewRequestForms shipmentId={shipmentId} state={state} pending={pending} mutate={mutate} /> : null}
          </section>
        ) : null}

        {canAdjustWeight || (canManage && state.weightAdjustments.length > 0) ? (
          <section className="space-y-3 border-t pt-5">
            <div><p className="text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">Cân lại</p><p className="mt-1 text-xs text-muted-foreground">Người có quyền cân lại ghi nhận khối lượng mới; người có quyền quản lý ngoại lệ duyệt, sau đó mới bỏ tạm giữ được.</p></div>
            <WeightPanel shipmentId={shipmentId} state={state} parcels={parcels} hubOptions={hubOptions} pending={pending} canAdjust={canAdjustWeight} canReview={canManage} mutate={mutate} currentUserId={user?.userId ?? null} />
          </section>
        ) : null}
      </div>
    </Card>
  );
}
