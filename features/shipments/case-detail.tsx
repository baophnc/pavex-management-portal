"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  LinkIcon,
  LoaderCircleIcon,
  MessageSquarePlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import { getWorkforce } from "@/features/operations/api";
import type { WorkforceMember } from "@/features/operations/contracts";
import { workforceIdentityName } from "@/features/operations/presentation";
import {
  addShipmentCaseNote,
  assignShipmentCase,
  closeShipmentCase,
  getShipmentForCase,
  getShipmentCase,
  investigateShipmentCase,
  linkShipmentCase,
  resolveShipmentCase,
} from "@/features/shipments/api";
import type { AdminShipmentDetail, ShipmentCase } from "@/features/shipments/contracts";
import {
  shipmentCaseEventLabel,
  shipmentCaseSeverityLabel,
  shipmentCaseStatusLabel,
  shipmentCaseTypeLabel,
} from "@/features/shipments/presentation";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;
const Field = ({ label, value }: { label: string; value: React.ReactNode }) => <div className="rounded-lg border bg-muted/10 p-3"><p className="text-[0.62rem] font-black uppercase text-muted-foreground">{label}</p><div className="mt-1 text-xs font-black">{value || "—"}</div></div>;

function personLabel(member: WorkforceMember | undefined) {
  if (!member) return "Đã phân công";
  return `${workforceIdentityName(member.identity ?? {})} · ${member.employeeCode}`;
}

export function ShipmentCaseDetail({ caseId }: { caseId: string }) {
  const { hasPermission, hasAnyPermission } = useAccess();
  const canManage = hasPermission("shipments.cases.manage");
  const canReadGlobalShipments = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]);
  const canReadWorkforce = [
    "operations.workforce.read",
    "operations.workforce.manage",
    "operations.dispatch.manage",
    "operations.hub.manage",
  ].some(hasPermission);
  const [item, setItem] = useState<ShipmentCase | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [linkTarget, setLinkTarget] = useState<AdminShipmentDetail | null>(null);
  const [linkParcelId, setLinkParcelId] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await getShipmentCase(caseId);
      setItem(data);
      setAssignee(data.assignedToUserId ?? "");
      setResolution(data.resolution ?? "");
      setTrackingCode(data.trackingCode ?? "");
    } catch (error) {
      setError(message(error, "Không thể tải hồ sơ sự cố."));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { const task = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(task); }, [load]);
  useEffect(() => {
    const task = window.setTimeout(() => {
      void getScopedHubs().then(setHubs).catch(() => undefined);
      if (canReadWorkforce) {
        const params = new URLSearchParams({ page: "1", pageSize: "100", status: "ACTIVE", kind: "HUB_MANAGER" });
        void getWorkforce(params).then((page) => setWorkforce(page.items)).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(task);
  }, [canReadWorkforce]);

  const hub = item ? hubs.find((value) => value.id === item.hubId) : undefined;
  const assignedMember = item?.assignedToUserId ? workforce.find((member) => member.userId === item.assignedToUserId) : undefined;
  const mutable = canManage && item ? !["RESOLVED", "CLOSED"].includes(item.status) : false;
  const notClosed = canManage && item?.status !== "CLOSED";
  const canInvestigate = mutable && item ? ["OPEN", "ASSIGNED"].includes(item.status) : false;
  const canClose = canManage && item?.status === "RESOLVED";
  const canLink = item?.type === "UNIDENTIFIED_PARCEL" && mutable;

  const actorNames = useMemo(() => new Map(workforce.map((member) => [member.userId, workforceIdentityName(member.identity ?? {})])), [workforce]);

  async function mutate(action: () => Promise<ShipmentCase>, success: string) {
    setSaving(true);
    try {
      const next = await action();
      setItem(next); setAssignee(next.assignedToUserId ?? ""); setResolution(next.resolution ?? ""); setNote("");
      if (next.trackingCode) setTrackingCode(next.trackingCode);
      toast.success(success);
    } catch (error) {
      toast.error(message(error, "Không thể cập nhật hồ sơ sự cố."));
    } finally {
      setSaving(false);
    }
  }

  async function lookupLinkTarget() {
    if (!trackingCode.trim()) return toast.error("Nhập mã vận đơn cần liên kết.");
    setLookingUp(true);
    try {
      const detail = await getShipmentForCase(trackingCode.trim());
      setLinkTarget(detail); setTrackingCode(detail.shipment.trackingCode); setLinkParcelId("");
    } catch (error) {
      setLinkTarget(null); toast.error(message(error, "Không tìm thấy vận đơn."));
    } finally { setLookingUp(false); }
  }

  if (loading && !item) return <div className="grid min-h-72 place-items-center text-sm text-muted-foreground"><LoaderCircleIcon className="mr-2 inline size-4 animate-spin" />Đang tải hồ sơ...</div>;
  if (error || !item) return <div className="space-y-3"><Link href="/shipments/cases" className="text-xs font-black text-brand hover:underline"><ArrowLeftIcon className="mr-1 inline size-4" />Hồ sơ sự cố</Link><div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangleIcon className="size-4" />{error ?? "Không tìm thấy hồ sơ."}</div></div>;

  return <div className="space-y-4">
    <div className="flex items-center justify-between"><Link href="/shipments/cases" className="text-xs font-black text-brand hover:underline"><ArrowLeftIcon className="mr-1 inline size-4" />Hồ sơ sự cố</Link><Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || saving}><RefreshCwIcon className="size-4" />Làm mới</Button></div>
    <section className="rounded-xl border bg-card p-4 sm:p-5"><p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">{item.caseNumber}</p><div className="mt-1 flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black sm:text-2xl">{item.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.description}</p></div><div className="text-right text-xs"><p className="font-black">{shipmentCaseStatusLabel(item.status)}</p><p className="mt-1 text-muted-foreground">{shipmentCaseSeverityLabel(item.severity)} · {shipmentCaseTypeLabel(item.type)}</p></div></div></section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Field label="Bưu cục" value={hub ? `${hub.code} · ${hub.name}` : "Đang tải thông tin bưu cục"} />
      <Field label="Vận đơn" value={item.trackingCode ? canReadGlobalShipments ? <Link href={`/shipments/${encodeURIComponent(item.trackingCode)}`} className="text-brand hover:underline">{item.trackingCode}</Link> : item.trackingCode : "Chưa xác định"} />
      <Field label="Kiện" value={item.parcelCode ?? item.externalBarcode ?? "Chưa xác định"} />
      <Field label="Phụ trách" value={item.assignedToUserId ? personLabel(assignedMember) : "Chưa phân công"} />
      <Field label="Tạo lúc" value={formatDateTime(item.createdAt)} />
      <Field label="Cập nhật" value={formatDateTime(item.updatedAt)} />
      <Field label="Loại hồ sơ" value={shipmentCaseTypeLabel(item.type)} />
      <Field label="Mức độ" value={shipmentCaseSeverityLabel(item.severity)} />
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardContent className="space-y-4"><div><p className="text-sm font-black">Điều tra & phối hợp</p><p className="mt-1 text-xs text-muted-foreground">Phân công theo tên nhân sự vận hành, thêm ghi chú và cập nhật quá trình điều tra.</p></div>
        {mutable ? <label className="grid gap-2 text-xs font-bold">Người phụ trách<select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Chọn điều phối viên</option>{workforce.map((member) => <option key={member.id} value={member.userId}>{workforceIdentityName(member.identity ?? {})} · {member.employeeCode}</option>)}</select></label> : null}
        {mutable && assignee ? <Button variant="outline" disabled={saving || assignee === item.assignedToUserId} onClick={() => void mutate(() => assignShipmentCase(item.id, assignee, note.trim() || null), "Đã phân công hồ sơ.")}><UserRoundCheckIcon className="size-4" />Phân công</Button> : null}
        {notClosed ? <><label className="grid gap-2 text-xs font-bold">Ghi chú<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kết quả kiểm tra, vị trí kiện, người đã liên hệ..." maxLength={2000} className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" /></label><div className="flex flex-wrap gap-2">{mutable ? <Button variant="outline" disabled={!canInvestigate || saving} onClick={() => void mutate(() => investigateShipmentCase(item.id, note.trim() || null), "Đã bắt đầu điều tra.")}><SearchIcon className="size-4" />Bắt đầu điều tra</Button> : null}<Button variant="outline" disabled={!note.trim() || saving} onClick={() => void mutate(() => addShipmentCaseNote(item.id, note.trim()), "Đã thêm ghi chú.")}><MessageSquarePlusIcon className="size-4" />Thêm ghi chú</Button></div></> : <p className="text-xs text-muted-foreground">Hồ sơ đã đóng.</p>}

        {canLink ? <div className="space-y-3 border-t pt-4"><div><p className="text-xs font-black">Xác định vận đơn cho kiện chưa rõ đầu mối</p><p className="mt-1 text-[0.68rem] text-muted-foreground">Tìm bằng mã vận đơn rồi chọn kiện theo mã công khai.</p></div><div className="flex gap-2"><Input value={trackingCode} onChange={(event) => { setTrackingCode(event.target.value); setLinkTarget(null); setLinkParcelId(""); }} placeholder="Mã vận đơn PAVEX..." /><Button variant="outline" onClick={() => void lookupLinkTarget()} disabled={lookingUp || !trackingCode.trim()}>{lookingUp ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}Tìm</Button></div>{linkTarget ? <div className="grid gap-3"><div className="rounded-lg border bg-muted/10 p-3 text-xs"><p className="font-black">{linkTarget.shipment.trackingCode}</p><p className="mt-1 text-muted-foreground">{linkTarget.shipment.sender.contactName} → {linkTarget.shipment.recipient.contactName}</p></div><label className="grid gap-2 text-xs font-bold">Kiện<select value={linkParcelId} onChange={(event) => setLinkParcelId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Chỉ liên kết vận đơn</option>{linkTarget.shipment.parcels.map((parcel) => <option key={parcel.id} value={parcel.id}>{parcel.code} · {parcel.description}</option>)}</select></label><Button variant="outline" disabled={saving} onClick={() => void mutate(() => linkShipmentCase(item.id, linkTarget.id, linkParcelId || null, note.trim() || null), "Đã xác định vận đơn cho hồ sơ.")}><LinkIcon className="size-4" />Xác nhận liên kết</Button></div> : null}</div> : null}
      </CardContent></Card>

      <Card><CardContent className="space-y-3"><div><p className="text-sm font-black">Kết luận</p><p className="mt-1 text-xs text-muted-foreground">Chỉ đánh dấu đã xử lý khi đã xác định nguyên nhân và hướng xử lý.</p></div>{canManage ? <textarea value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Kết quả xử lý và quyết định cuối cùng" maxLength={2000} className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm" disabled={!mutable} /> : null}{mutable ? <Button disabled={!resolution.trim() || saving} onClick={() => void mutate(() => resolveShipmentCase(item.id, resolution.trim()), "Đã đánh dấu hồ sơ xử lý xong.")}>Đánh dấu đã xử lý</Button> : null}{canClose ? <Button variant="outline" disabled={saving} onClick={() => void mutate(() => closeShipmentCase(item.id, note.trim() || null), "Đã đóng hồ sơ.")}>Đóng hồ sơ</Button> : null}{item.resolution ? <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-5"><span className="font-black">Kết luận:</span> {item.resolution}</div> : null}</CardContent></Card>
    </div>

    <Card><CardContent><p className="text-sm font-black">Nhật ký xử lý</p><div className="mt-3 space-y-2">{item.events.map((event) => <div key={event.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black">{shipmentCaseEventLabel(event.code)}</p><p className="text-[0.68rem] text-muted-foreground">{formatDateTime(event.occurredAt)}</p></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{event.description}</p><p className="mt-2 text-[0.62rem] text-muted-foreground">Thực hiện bởi: {actorNames.get(event.actorUserId) ?? "Người dùng được phân quyền"}</p>{event.dataJson ? <details className="mt-2 text-[0.62rem] text-muted-foreground"><summary className="cursor-pointer font-bold">Thông tin kỹ thuật</summary><pre className="mt-2 max-h-36 overflow-auto rounded bg-muted/40 p-2">{event.dataJson}</pre></details> : null}</div>)}{item.events.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có sự kiện.</p> : null}</div></CardContent></Card>

    <details className="rounded-xl border bg-card p-3 text-[0.64rem] text-muted-foreground"><summary className="cursor-pointer font-bold">Thông tin kỹ thuật</summary><div className="mt-2 grid gap-1 font-mono"><span>ID hồ sơ: {item.id}</span><span>ID bưu cục: {item.hubId}</span>{item.shipmentId ? <span>ID vận đơn: {item.shipmentId}</span> : null}{item.parcelId ? <span>ID kiện: {item.parcelId}</span> : null}{item.assignedToUserId ? <span>ID người xử lý: {item.assignedToUserId}</span> : null}<span>ID người báo: {item.reportedByUserId}</span></div></details>
  </div>;
}
