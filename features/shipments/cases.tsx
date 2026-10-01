"use client";

import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PackageSearchIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import {
  createProblemParcelCase,
  createUnidentifiedParcelCase,
  getShipmentForCase,
  getShipmentCases,
  getShipmentCaseSummary,
} from "@/features/shipments/api";
import type {
  AdminShipmentDetail,
  ShipmentCase,
  ShipmentCasePage,
  ShipmentCaseMonitoringSummary,
  ShipmentCaseSeverity,
  ShipmentCaseStatus,
  ShipmentCaseType,
} from "@/features/shipments/contracts";
import {
  SHIPMENT_CASE_SEVERITIES,
  SHIPMENT_CASE_STATUSES,
  SHIPMENT_CASE_TYPES,
} from "@/features/shipments/contracts";
import {
  shipmentCaseSeverityLabel,
  shipmentCaseStatusLabel,
  shipmentCaseTypeLabel,
} from "@/features/shipments/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 30;
const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

function hubLabel(hubs: Hub[], hubId: string) {
  const hub = hubs.find((item) => item.id === hubId);
  return hub ? `${hub.code} · ${hub.name}` : "Bưu cục không còn trong danh mục";
}

function CreateCaseDialog({ hubs, onClose, onCreated }: { hubs: Hub[]; onClose: () => void; onCreated: (item: ShipmentCase) => void }) {
  const [type, setType] = useState<ShipmentCaseType>("PROBLEM_PARCEL");
  const [hubId, setHubId] = useState(hubs.find((hub) => hub.status === "ACTIVE")?.id ?? "");
  const [severity, setSeverity] = useState<ShipmentCaseSeverity>("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [externalBarcode, setExternalBarcode] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [shipment, setShipment] = useState<AdminShipmentDetail | null>(null);
  const [parcelId, setParcelId] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);

  async function lookupShipment() {
    if (!trackingCode.trim()) return toast.error("Nhập mã vận đơn để tìm.");
    setLookingUp(true);
    try {
      const detail = await getShipmentForCase(trackingCode.trim());
      setShipment(detail);
      setTrackingCode(detail.shipment.trackingCode);
      setParcelId("");
      if (!hubId) setHubId(detail.originHubId);
    } catch (error) {
      setShipment(null);
      toast.error(message(error, "Không tìm thấy vận đơn."));
    } finally {
      setLookingUp(false);
    }
  }

  async function submit() {
    if (!hubId) return toast.error("Chọn bưu cục đang tiếp nhận hồ sơ.");
    if (!title.trim() || !description.trim()) return toast.error("Tiêu đề và mô tả là bắt buộc.");
    if (type === "PROBLEM_PARCEL" && !shipment) return toast.error("Tìm và xác nhận vận đơn trước khi tạo hồ sơ kiện có vấn đề.");

    setSaving(true);
    try {
      const created = type === "PROBLEM_PARCEL"
        ? await createProblemParcelCase({
            shipmentId: shipment!.id,
            parcelId: parcelId || null,
            hubId,
            severity,
            title: title.trim(),
            description: description.trim(),
          })
        : await createUnidentifiedParcelCase({
            hubId,
            severity,
            title: title.trim(),
            description: description.trim(),
            externalBarcode: externalBarcode.trim() || null,
          });
      toast.success(type === "PROBLEM_PARCEL" ? "Đã mở hồ sơ kiện có vấn đề." : "Đã mở hồ sơ kiện chưa xác định đầu mối.");
      onCreated(created);
      onClose();
    } catch (error) {
      toast.error(message(error, "Không thể tạo hồ sơ sự cố."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="max-h-[94vh] w-full max-w-3xl overflow-auto rounded-xl border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-brand">Hồ sơ sự cố</p>
            <h2 className="mt-1 text-lg font-black">Mở hồ sơ sự cố kiện hàng</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Không cần nhập UUID. Chọn luồng nghiệp vụ, bưu cục và mã vận đơn/barcode mà nhân viên thực tế nhìn thấy.</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} disabled={saving}><XIcon className="size-4" /></Button>
        </header>

        <div className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => { setType("PROBLEM_PARCEL"); setShipment(null); setParcelId(""); }} className={cn("rounded-xl border p-4 text-left", type === "PROBLEM_PARCEL" && "border-brand/40 bg-brand/[0.05]")}>
              <p className="text-sm font-black">Kiện có vấn đề</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Biết vận đơn; kiện bị hư hỏng, sai trạng thái, thiếu lượt quét hoặc cần điều tra.</p>
            </button>
            <button type="button" onClick={() => { setType("UNIDENTIFIED_PARCEL"); setShipment(null); setParcelId(""); }} className={cn("rounded-xl border p-4 text-left", type === "UNIDENTIFIED_PARCEL" && "border-brand/40 bg-brand/[0.05]")}>
              <p className="text-sm font-black">Kiện chưa xác định đầu mối</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Chưa biết vận đơn nào; ghi nhận tại bưu cục trước rồi gắn vận đơn/kiện sau khi điều tra.</p>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold">Bưu cục tiếp nhận<select value={hubId} onChange={(event) => setHubId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Chọn bưu cục</option>{hubs.filter((hub) => hub.status === "ACTIVE").map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></label>
            <label className="grid gap-2 text-xs font-bold">Mức độ<select value={severity} onChange={(event) => setSeverity(event.target.value as ShipmentCaseSeverity)} className="h-10 rounded-md border bg-background px-3 text-sm">{SHIPMENT_CASE_SEVERITIES.map((value) => <option key={value} value={value}>{shipmentCaseSeverityLabel(value)}</option>)}</select></label>
          </div>

          {type === "PROBLEM_PARCEL" ? (
            <div className="rounded-xl border bg-muted/10 p-4">
              <p className="text-xs font-black">Xác định vận đơn / kiện</p>
              <div className="mt-2 flex gap-2"><Input value={trackingCode} onChange={(event) => { setTrackingCode(event.target.value); setShipment(null); setParcelId(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void lookupShipment(); } }} placeholder="Mã vận đơn PAVEX..." /><Button type="button" variant="outline" onClick={() => void lookupShipment()} disabled={lookingUp || !trackingCode.trim()}>{lookingUp ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SearchIcon className="size-4" />}Tìm</Button></div>
              {shipment ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background p-3 text-xs"><p className="font-black">{shipment.shipment.trackingCode}</p><p className="mt-1 text-muted-foreground">{shipment.shipment.sender.contactName} → {shipment.shipment.recipient.contactName}</p><p className="mt-1 text-muted-foreground">{shipment.shipment.parcels.length} kiện · {shipment.shipment.status}</p></div>
                  <label className="grid gap-2 text-xs font-bold">Kiện cụ thể <span className="font-medium text-muted-foreground">(không bắt buộc)</span><select value={parcelId} onChange={(event) => setParcelId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Sự cố cấp vận đơn / chưa xác định kiện</option>{shipment.shipment.parcels.map((parcel) => <option key={parcel.id} value={parcel.id}>{parcel.code} · {parcel.description}</option>)}</select></label>
                </div>
              ) : null}
            </div>
          ) : (
            <label className="grid gap-2 text-xs font-bold">Mã vạch / mã dán trên kiện <span className="font-medium text-muted-foreground">(nếu đọc được)</span><Input value={externalBarcode} onChange={(event) => setExternalBarcode(event.target.value)} placeholder="Quét hoặc nhập mã vạch bên ngoài" /></label>
          )}

          <label className="grid gap-2 text-xs font-bold">Tiêu đề<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder={type === "PROBLEM_PARCEL" ? "Ví dụ: Kiện móp vỡ khi dỡ hàng" : "Ví dụ: Kiện không có nhãn tại khu nhận hàng"} /></label>
          <label className="grid gap-2 text-xs font-bold">Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Mô tả tình trạng, vị trí, dấu hiệu nhận biết và việc đã kiểm tra..." /></label>
        </div>

        <footer className="flex justify-end gap-2 border-t p-5"><Button variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Mở hồ sơ</Button></footer>
      </section>
    </div>
  );
}

export function ShipmentCases() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("shipments.cases.manage");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const type = (searchParams.get("type") ?? "") as ShipmentCaseType | "";
  const status = (searchParams.get("status") ?? "") as ShipmentCaseStatus | "";
  const severity = (searchParams.get("severity") ?? "") as ShipmentCaseSeverity | "";
  const hubId = searchParams.get("hubId") ?? "";
  const trackingCodeFilter = searchParams.get("trackingCode") ?? "";
  const search = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(search);
  const [data, setData] = useState<ShipmentCasePage | null>(null);
  const [summary, setSummary] = useState<ShipmentCaseMonitoringSummary | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { const task = window.setTimeout(() => setSearchDraft(search), 0); return () => window.clearTimeout(task); }, [search]);
  useEffect(() => { const task = window.setTimeout(() => { void getScopedHubs().then(setHubs).catch(() => undefined); }, 0); return () => window.clearTimeout(task); }, []);

  const query = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (type) q.set("type", type); if (status) q.set("status", status); if (severity) q.set("severity", severity); if (hubId) q.set("hubId", hubId); if (trackingCodeFilter) q.set("trackingCode", trackingCodeFilter); if (search) q.set("search", search);
    return q;
  }, [page, type, status, severity, hubId, trackingCodeFilter, search]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const [p, s] = await Promise.all([getShipmentCases(query), getShipmentCaseSummary()]); setData(p); setSummary(s); }
    catch (error) { const text = message(error, "Không thể tải hồ sơ sự cố."); setError(text); toast.error(text); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { const task = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(task); }, [load]);

  const update = (values: Record<string, string | number>) => {
    const q = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, raw]) => { const value = String(raw); if (value) q.set(key, value); else q.delete(key); });
    if (!("page" in values)) q.set("page", "1");
    router.push(`${pathname}?${q}`);
  };
  const cards = summary ? [["Đang hoạt động", summary.totalActive], ["Mới mở", summary.open], ["Đang điều tra", summary.investigating], ["Cao / khẩn", summary.highOrCritical], ["Đã xử lý hôm nay", summary.resolvedToday]] as const : [];

  return <div className="space-y-4">
    <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Vận đơn / Hồ sơ sự cố</p><h1 className="mt-1 text-2xl font-black">Hồ sơ sự cố kiện hàng</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Theo dõi kiện có vấn đề và kiện chưa xác định đầu mối. Màn hình dùng mã vận đơn, mã kiện và tên bưu cục; ID kỹ thuật không còn là thao tác chính.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Làm mới</Button>{canManage ? <Button onClick={() => setCreateOpen(true)}><PlusIcon className="size-4" />Mở hồ sơ</Button> : null}</div></div></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <Card key={label}><CardContent><p className="text-[0.62rem] font-black uppercase text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value.toLocaleString("vi-VN")}</p></CardContent></Card>)}</section>
    {trackingCodeFilter ? <div className="flex items-center justify-between rounded-xl border border-brand/20 bg-brand/[0.04] p-3 text-xs"><span className="font-bold">Đang lọc theo vận đơn {trackingCodeFilter}.</span><Button size="sm" variant="ghost" onClick={() => update({ trackingCode: "" })}>Bỏ lọc</Button></div> : null}
    <Card><CardContent className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_170px_170px_170px_minmax(220px,1fr)_auto]"><div className="flex gap-2"><Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") update({ search: searchDraft.trim() }); }} placeholder="Mã hồ sơ, mã vạch, tiêu đề..." /><Button size="icon" variant="outline" onClick={() => update({ search: searchDraft.trim() })}><SearchIcon className="size-4" /></Button></div><select value={type} onChange={(event) => update({ type: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-xs font-bold"><option value="">Mọi loại</option>{SHIPMENT_CASE_TYPES.map((v) => <option key={v} value={v}>{shipmentCaseTypeLabel(v)}</option>)}</select><select value={status} onChange={(event) => update({ status: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-xs font-bold"><option value="">Mọi trạng thái</option>{SHIPMENT_CASE_STATUSES.map((v) => <option key={v} value={v}>{shipmentCaseStatusLabel(v)}</option>)}</select><select value={severity} onChange={(event) => update({ severity: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-xs font-bold"><option value="">Mọi mức độ</option>{SHIPMENT_CASE_SEVERITIES.map((v) => <option key={v} value={v}>{shipmentCaseSeverityLabel(v)}</option>)}</select><select value={hubId} onChange={(event) => update({ hubId: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-xs font-bold"><option value="">Mọi bưu cục</option>{hubs.filter((hub) => hub.status === "ACTIVE").map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select><Button variant="ghost" onClick={() => { setSearchDraft(""); router.push(pathname); }}><XIcon className="size-4" />Xóa lọc</Button></CardContent></Card>
    {error ? <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangleIcon className="size-4" />{error}</div> : null}
    <Card><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b bg-muted/25 text-[0.62rem] uppercase text-muted-foreground"><tr><th className="px-4 py-3">Hồ sơ</th><th className="px-4 py-3">Loại</th><th className="px-4 py-3">Mức độ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Bưu cục</th><th className="px-4 py-3">Vận đơn / kiện</th><th className="px-4 py-3">Cập nhật</th></tr></thead><tbody>{data?.items.map((item) => <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20"><td className="px-4 py-3"><Link href={`/shipments/cases/${item.id}`} className="text-xs font-black hover:text-brand">{item.caseNumber}</Link><p className="mt-1 max-w-64 truncate text-[0.68rem] text-muted-foreground">{item.title}</p></td><td className="px-4 py-3 text-xs font-bold">{shipmentCaseTypeLabel(item.type)}</td><td className="px-4 py-3 text-xs font-bold">{shipmentCaseSeverityLabel(item.severity)}</td><td className="px-4 py-3"><p className="text-xs font-black">{shipmentCaseStatusLabel(item.status)}</p><p className="mt-1 text-[0.62rem] text-muted-foreground">{item.assignedToUserId ? "Đã phân công" : "Chưa phân công"}</p></td><td className="px-4 py-3 text-xs"><p className="font-black">{hubLabel(hubs, item.hubId)}</p></td><td className="px-4 py-3 text-xs">{item.trackingCode ? <><Link href={`/shipments/${encodeURIComponent(item.trackingCode)}`} className="font-black text-brand hover:underline">{item.trackingCode}</Link><p className="mt-1 text-[0.68rem] text-muted-foreground">{item.parcelCode ?? "Toàn vận đơn"}</p></> : <><p className="font-black">Chưa xác định vận đơn</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{item.externalBarcode ?? "Chưa có barcode"}</p></>}</td><td className="px-4 py-3 text-[0.68rem] text-muted-foreground">{formatDateTime(item.updatedAt)}</td></tr>)}{loading && !data ? <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground"><LoaderCircleIcon className="mr-2 inline size-4 animate-spin" />Đang tải...</td></tr> : null}{!loading && data?.items.length === 0 ? <tr><td colSpan={7} className="px-4 py-16 text-center"><PackageSearchIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-black">Không có hồ sơ phù hợp</p></td></tr> : null}</tbody></table></div></Card>
    {data ? <div className="flex items-center justify-between rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{data.totalCount.toLocaleString("vi-VN")} case · trang {data.page}/{Math.max(1, data.totalPages)}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => update({ page: page - 1 })}><ChevronLeftIcon className="size-4" />Trước</Button><Button size="sm" variant="outline" disabled={page >= data.totalPages || loading || data.totalPages === 0} onClick={() => update({ page: page + 1 })}>Sau<ChevronRightIcon className="size-4" /></Button></div></div> : null}
    {canManage && createOpen ? <CreateCaseDialog hubs={hubs} onClose={() => setCreateOpen(false)} onCreated={(created) => { router.push(`/shipments/cases/${created.id}`); }} /> : null}
  </div>;
}
