"use client";

import {
  AlertTriangleIcon,
  BanIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PackageCheckIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  ScaleIcon,
  SearchIcon,
  TruckIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAccess } from "@/features/auth/access-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getShipmentExceptionQueue,
  getShipmentExceptionQueueSummary,
  reviewShipmentCancellation,
  reviewShipmentForward,
  reviewShipmentReturn,
  reviewShipmentWeight,
} from "@/features/shipments/api";
import {
  SHIPMENT_EXCEPTION_QUEUE_KINDS,
  SHIPMENT_EXCEPTION_QUEUE_STATUSES,
  type ShipmentExceptionQueueItem,
  type ShipmentExceptionQueueKind,
  type ShipmentExceptionQueuePage,
  type ShipmentExceptionQueueStatus,
  type ShipmentExceptionQueueSummary,
} from "@/features/shipments/contracts";
import { shipmentStatusLabel } from "@/features/shipments/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

function message(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function kindLabel(kind: ShipmentExceptionQueueKind) {
  switch (kind) {
    case "RETURN":
      return "Hoàn hàng";
    case "FORWARD":
      return "Chuyển tiếp";
    case "CANCELLATION":
      return "Huỷ vận đơn";
    case "WEIGHT_REVIEW":
      return "Duyệt cân lại";
  }
}

function statusLabel(status: ShipmentExceptionQueueStatus) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Chờ cấp duyệt";
    case "PENDING_REVIEW":
      return "Chờ duyệt cân lại";
    case "APPROVED":
      return "Đã duyệt";
    case "PROCESSING":
      return "Đang xử lý";
    case "REJECTED":
      return "Đã từ chối";
    case "COMPLETED":
      return "Hoàn tất";
  }
}

function KindIcon({ kind }: { kind: ShipmentExceptionQueueKind }) {
  switch (kind) {
    case "CANCELLATION":
      return <BanIcon className="size-4" />;
    case "RETURN":
      return <RotateCcwIcon className="size-4" />;
    case "FORWARD":
      return <TruckIcon className="size-4" />;
    case "WEIGHT_REVIEW":
      return <ScaleIcon className="size-4" />;
  }
}

function statusTone(status: ShipmentExceptionQueueStatus) {
  if (status === "PENDING_APPROVAL" || status === "PENDING_REVIEW") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  if (status === "APPROVED" || status === "PROCESSING") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-800 dark:text-sky-200";
  }
  if (status === "COMPLETED") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200";
  }
  return "border-destructive/20 bg-destructive/10 text-destructive";
}

function QueueItem({ item, currentUserId, canManage, canOpenShipment, onChanged }: { item: ShipmentExceptionQueueItem; currentUserId: string | null; canManage: boolean; canOpenShipment: boolean; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<"approve" | "reject" | "review" | null>(null);
  const pendingApproval = item.status === "PENDING_APPROVAL";
  const selfRequested = Boolean(currentUserId && currentUserId === item.requestedByUserId);
  const pendingWeight = item.kind === "WEIGHT_REVIEW" && item.status === "PENDING_REVIEW";
  const processing = item.status === "APPROVED" || item.status === "PROCESSING";

  async function review(approve: boolean) {
    setSaving(approve ? "approve" : "reject");
    try {
      const value = note.trim() || null;
      if (item.kind === "RETURN") {
        await reviewShipmentReturn(item.shipmentId, item.id, { approve, note: value });
      } else if (item.kind === "FORWARD") {
        await reviewShipmentForward(item.shipmentId, item.id, { approve, note: value });
      } else if (item.kind === "CANCELLATION") {
        await reviewShipmentCancellation(item.shipmentId, item.id, { approve, note: value });
      }
      toast.success(approve ? "Đã duyệt yêu cầu." : "Đã từ chối yêu cầu.");
      setNote("");
      onChanged();
    } catch (error) {
      toast.error(message(error, "Không thể cập nhật yêu cầu."));
    } finally {
      setSaving(null);
    }
  }

  async function completeWeightReview() {
    if (!note.trim()) {
      toast.error("Nhập ghi chú kiểm tra sức chứa/định tuyến trước khi xác nhận.");
      return;
    }
    setSaving("review");
    try {
      await reviewShipmentWeight(item.shipmentId, item.id, note.trim());
      toast.success("Đã duyệt xong cân lại.");
      setNote("");
      onChanged();
    } catch (error) {
      toast.error(message(error, "Không thể hoàn tất duyệt cân lại."));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <KindIcon kind={item.kind} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {canOpenShipment ? (
                  <Link href={`/shipments/${encodeURIComponent(item.trackingCode)}`} className="text-sm font-black hover:text-brand hover:underline">
                    {item.trackingCode}
                  </Link>
                ) : <span className="text-sm font-black">{item.trackingCode}</span>}
                <span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[0.62rem] font-black">
                  {kindLabel(item.kind)}
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 text-[0.62rem] font-black", statusTone(item.status))}>
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold leading-5">{item.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.originHubCode} · {item.originHubName} → {item.destinationHubCode} · {item.destinationHubName}
              </p>
              {item.parcelCode ? <p className="mt-1 text-xs font-bold text-brand">Kiện {item.parcelCode}</p> : null}
            </div>
          </div>

          <div className="shrink-0 text-left text-[0.68rem] text-muted-foreground lg:text-right">
            <p>{formatDateTime(item.requestedAt)}</p>
            <p className="mt-1">Vận đơn: <span className="font-bold text-foreground">{shipmentStatusLabel(item.shipmentStatus)}</span></p>
            {item.isOnHold ? <p className="mt-1 font-bold text-amber-700 dark:text-amber-300">Đang tạm giữ</p> : null}
          </div>
        </div>

        {canManage && (pendingApproval || pendingWeight) ? (
          <div className="rounded-xl border bg-muted/10 p-3">
            {selfRequested ? (
              <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
                Bạn là người tạo nghiệp vụ này. Theo nguyên tắc hai người kiểm tra, một quản lý vận hành hoặc quản trị viên khác phải thực hiện bước duyệt.
              </div>
            ) : null}
            <label className="grid gap-2 text-xs font-bold">
              {pendingWeight ? "Ghi chú kiểm tra sức chứa / định tuyến" : "Ghi chú quyết định"}
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder={pendingWeight ? "Xác nhận sức chứa và định tuyến vẫn phù hợp..." : "Lý do duyệt hoặc từ chối (không bắt buộc)..."}
                className="min-h-20 resize-y rounded-md border bg-background px-3 py-2 text-sm"
                disabled={saving !== null}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingApproval ? (
                <>
                  <Button size="sm" onClick={() => void review(true)} disabled={saving !== null || selfRequested}>
                    {saving === "approve" ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <CheckCircle2Icon className="size-3.5" />}
                    Duyệt
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void review(false)} disabled={saving !== null || selfRequested}>
                    {saving === "reject" ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <XCircleIcon className="size-3.5" />}
                    Từ chối
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => void completeWeightReview()} disabled={saving !== null || !note.trim() || selfRequested}>
                  {saving === "review" ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <PackageCheckIcon className="size-3.5" />}
                  Hoàn tất duyệt
                </Button>
              )}
            </div>
          </div>
        ) : processing ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3">
            <div>
              <p className="text-xs font-black text-sky-800 dark:text-sky-200">Đã qua bước duyệt</p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">Mở vận đơn để theo dõi xử lý/định tuyến và hoàn tất quy trình khi đã đủ điều kiện.</p>
            </div>
            {canOpenShipment ? <Link href={`/shipments/${encodeURIComponent(item.trackingCode)}`} className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-black hover:bg-muted">
              Tiếp tục xử lý →
            </Link> : null}
          </div>
        ) : null}

      </CardContent>
    </Card>
  );
}

export function ShipmentExceptionQueue() {
  const { user, hasPermission, hasAnyPermission } = useAccess();
  const canManage = hasPermission("shipments.exceptions.manage");
  const canOpenShipment = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const kind = (searchParams.get("kind") ?? "") as ShipmentExceptionQueueKind | "";
  const status = (searchParams.get("status") ?? "") as ShipmentExceptionQueueStatus | "";
  const search = searchParams.get("q") ?? "";
  const [searchDraft, setSearchDraft] = useState(search);
  const [data, setData] = useState<ShipmentExceptionQueuePage | null>(null);
  const [summary, setSummary] = useState<ShipmentExceptionQueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => setSearchDraft(search), 0);
    return () => window.clearTimeout(task);
  }, [search]);

  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (kind) value.set("kind", kind);
    if (status) value.set("status", status);
    if (search) value.set("q", search);
    return value;
  }, [kind, page, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageValue, summaryValue] = await Promise.all([
        getShipmentExceptionQueue(query),
        getShipmentExceptionQueueSummary(),
      ]);
      setData(pageValue);
      setSummary(summaryValue);
    } catch (reason) {
      setError(message(reason, "Không thể tải hàng chờ duyệt ngoại lệ."));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function update(values: Record<string, string | number>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, raw]) => {
      const value = String(raw);
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!("page" in values)) next.set("page", "1");
    router.push(`${pathname}?${next.toString()}`);
  }

  const cards = summary ? [
    { label: "Chờ cấp duyệt", value: summary.pendingApproval, kind: "", status: "PENDING_APPROVAL", icon: Clock3Icon },
    { label: "Huỷ đơn", value: summary.cancellationPending, kind: "CANCELLATION", status: "PENDING_APPROVAL", icon: BanIcon },
    { label: "Hoàn hàng", value: summary.returnPending, kind: "RETURN", status: "PENDING_APPROVAL", icon: RotateCcwIcon },
    { label: "Chuyển tiếp", value: summary.forwardPending, kind: "FORWARD", status: "PENDING_APPROVAL", icon: TruckIcon },
    { label: "Duyệt cân lại", value: summary.pendingWeightReview, kind: "WEIGHT_REVIEW", status: "PENDING_REVIEW", icon: ScaleIcon },
    { label: "Đang xử lý", value: summary.approvedOrProcessing, kind: "", status: "PROCESSING", icon: PackageCheckIcon },
  ] : [];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="bg-gradient-to-br from-brand/[0.08] via-card to-card p-5 sm:p-6">
          <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Giám sát vận đơn</p>
          <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-black">Duyệt ngoại lệ & huỷ vận đơn</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Yêu cầu hoàn hàng, chuyển tiếp, hủy và duyệt cân lại được gom vào một hàng chờ. Quyền xem chỉ theo dõi trong phạm vi bưu cục; nút duyệt chỉ hiện với tài khoản có quyền xử lý ngoại lệ.
              </p>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} /> Làm mới
            </Button>
          </div>
        </div>
      </section>

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.label} type="button" onClick={() => update({ kind: card.kind, status: card.status })} className="rounded-xl border bg-card p-4 text-left transition hover:border-brand/30 hover:shadow-sm">
                <div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand"><Icon className="size-4" /></span><span className="text-2xl font-black tabular-nums">{card.value.toLocaleString("vi-VN")}</span></div>
                <p className="mt-3 text-xs font-black">{card.label}</p>
              </button>
            );
          })}
        </section>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_13rem_auto]">
          <div className="flex gap-2">
            <Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") update({ q: searchDraft.trim() }); }} placeholder="Mã vận đơn, mã kiện hoặc lý do..." />
            <Button variant="outline" onClick={() => update({ q: searchDraft.trim() })}><SearchIcon className="size-4" /> Tìm</Button>
          </div>
          <select value={kind} onChange={(event) => update({ kind: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Tất cả nghiệp vụ</option>
            {SHIPMENT_EXCEPTION_QUEUE_KINDS.map((value) => <option key={value} value={value}>{kindLabel(value)}</option>)}
          </select>
          <select value={status} onChange={(event) => update({ status: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="">Đang cần xử lý</option>
            {SHIPMENT_EXCEPTION_QUEUE_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
          <Button variant="ghost" onClick={() => { setSearchDraft(""); router.push(pathname); }}>Xoá lọc</Button>
        </CardContent>
      </Card>

      {error ? (
        <div className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangleIcon className="size-4 shrink-0" />{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="grid min-h-72 place-items-center text-sm text-muted-foreground"><div className="flex items-center gap-2"><LoaderCircleIcon className="size-4 animate-spin" />Đang tải hàng chờ duyệt...</div></div>
      ) : data?.items.length ? (
        <div className="grid gap-3">
          {data.items.map((item) => <QueueItem key={`${item.kind}:${item.id}`} item={item} currentUserId={user?.userId ?? null} canManage={canManage} canOpenShipment={canOpenShipment} onChanged={() => void load()} />)}
        </div>
      ) : (
        <Card><CardContent className="grid min-h-56 place-items-center text-center"><div><CheckCircle2Icon className="mx-auto size-9 text-emerald-600" /><p className="mt-3 text-sm font-black">Không có yêu cầu phù hợp</p><p className="mt-1 text-xs text-muted-foreground">Hàng chờ hiện tại không có ngoại lệ cần xử lý theo bộ lọc.</p></div></CardContent></Card>
      )}

      {data ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{data.totalCount.toLocaleString("vi-VN")} yêu cầu · trang {data.page}/{Math.max(1, data.totalPages)}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => update({ page: page - 1 })}><ChevronLeftIcon className="size-4" />Trước</Button>
            <Button size="sm" variant="outline" disabled={page >= data.totalPages || loading || data.totalPages === 0} onClick={() => update({ page: page + 1 })}>Sau<ChevronRightIcon className="size-4" /></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
