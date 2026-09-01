"use client";

import { AlertTriangleIcon, ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, PlusIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createProblemParcelCase, createUnidentifiedParcelCase, getShipmentCases, getShipmentCaseSummary } from "@/features/shipments/api";
import { SHIPMENT_CASE_SEVERITIES, SHIPMENT_CASE_STATUSES, SHIPMENT_CASE_TYPES, type ShipmentCaseMonitoringSummary, type ShipmentCasePage, type ShipmentCaseSeverity, type ShipmentCaseStatus, type ShipmentCaseType } from "@/features/shipments/contracts";
import { shipmentCaseSeverityLabel, shipmentCaseStatusLabel, shipmentCaseTypeLabel } from "@/features/shipments/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 30;
const message = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback;

function severityClass(value: ShipmentCaseSeverity) {
  if (value === "CRITICAL") return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  if (value === "HIGH") return "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  if (value === "MEDIUM") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
}

function CreateCasePanel({ onCreated, defaults }: { onCreated: (id: string) => void; defaults: { shipmentId: string; hubId: string } }) {
  const [type, setType] = useState<ShipmentCaseType>("PROBLEM_PARCEL");
  const [severity, setSeverity] = useState<ShipmentCaseSeverity>("MEDIUM");
  const [shipmentId, setShipmentId] = useState(defaults.shipmentId);
  const [parcelId, setParcelId] = useState("");
  const [hubId, setHubId] = useState(defaults.hubId);
  const [externalBarcode, setExternalBarcode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setShipmentId(defaults.shipmentId), [defaults.shipmentId]);
  useEffect(() => setHubId(defaults.hubId), [defaults.hubId]);

  async function submit() {
    if (!hubId.trim() || !title.trim() || !description.trim()) return toast.error("Hub, tiêu đề và mô tả là bắt buộc.");
    if (type === "PROBLEM_PARCEL" && !shipmentId.trim()) return toast.error("Problem parcel case cần Shipment UUID.");
    setSaving(true);
    try {
      const created = type === "PROBLEM_PARCEL"
        ? await createProblemParcelCase({ shipmentId: shipmentId.trim(), parcelId: parcelId.trim() || null, hubId: hubId.trim(), severity, title: title.trim(), description: description.trim() })
        : await createUnidentifiedParcelCase({ hubId: hubId.trim(), severity, title: title.trim(), description: description.trim(), externalBarcode: externalBarcode.trim() || null });
      toast.success(`Đã tạo ${created.caseNumber}.`);
      onCreated(created.id);
    } catch (error) {
      toast.error(message(error, "Không thể tạo shipment case."));
    } finally { setSaving(false); }
  }

  return (
    <Card><CardContent className="space-y-3">
      <div><p className="text-sm font-black">Tạo hồ sơ sự cố</p><p className="mt-1 text-xs text-muted-foreground">Problem parcel gắn shipment ngay; unidentified parcel có thể link sau khi điều tra.</p></div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <select value={type} onChange={(e) => setType(e.target.value as ShipmentCaseType)} className="h-10 rounded-md border bg-background px-3 text-sm">{SHIPMENT_CASE_TYPES.map((v) => <option key={v} value={v}>{shipmentCaseTypeLabel(v)}</option>)}</select>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as ShipmentCaseSeverity)} className="h-10 rounded-md border bg-background px-3 text-sm">{SHIPMENT_CASE_SEVERITIES.map((v) => <option key={v} value={v}>{shipmentCaseSeverityLabel(v)}</option>)}</select>
        <Input value={hubId} onChange={(e) => setHubId(e.target.value)} placeholder="Hub UUID" className="font-mono text-xs" />
        {type === "UNIDENTIFIED_PARCEL" ? <Input value={externalBarcode} onChange={(e) => setExternalBarcode(e.target.value)} placeholder="Barcode ngoài (nếu có)" /> : <Input value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} placeholder="Shipment UUID" className="font-mono text-xs" />}
      </div>
      {type === "PROBLEM_PARCEL" ? <Input value={parcelId} onChange={(e) => setParcelId(e.target.value)} placeholder="Parcel UUID (không bắt buộc)" className="font-mono text-xs" /> : null}
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề sự cố" maxLength={160} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả điều tra ban đầu" maxLength={2000} className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" />
      <div className="flex justify-end"><Button onClick={() => void submit()} disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Tạo case</Button></div>
    </CardContent></Card>
  );
}

export function ShipmentCases() {
  const pathname = usePathname(); const router = useRouter(); const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const type = (searchParams.get("type") ?? "") as ShipmentCaseType | "";
  const status = (searchParams.get("status") ?? "") as ShipmentCaseStatus | "";
  const severity = (searchParams.get("severity") ?? "") as ShipmentCaseSeverity | "";
  const hubId = searchParams.get("hubId") ?? ""; const shipmentId = searchParams.get("shipmentId") ?? ""; const search = searchParams.get("search") ?? "";
  const [data, setData] = useState<ShipmentCasePage | null>(null); const [summary, setSummary] = useState<ShipmentCaseMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [createOpen, setCreateOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(search); const [hubDraft, setHubDraft] = useState(hubId); const [shipmentDraft, setShipmentDraft] = useState(shipmentId);
  const query = useMemo(() => { const q = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) }); if (type) q.set("type", type); if (status) q.set("status", status); if (severity) q.set("severity", severity); if (hubId) q.set("hubId", hubId); if (shipmentId) q.set("shipmentId", shipmentId); if (search) q.set("search", search); return q; }, [page,type,status,severity,hubId,shipmentId,search]);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const [p,s] = await Promise.all([getShipmentCases(query), getShipmentCaseSummary()]); setData(p); setSummary(s); } catch (e) { const m=message(e,"Không thể tải shipment cases."); setError(m); toast.error(m); } finally { setLoading(false); } }, [query]);
  useEffect(() => { void load(); }, [load]);
  const update = (values: Record<string,string|number>) => { const q=new URLSearchParams(searchParams.toString()); Object.entries(values).forEach(([k,v]) => { const s=String(v); if (s) q.set(k,s); else q.delete(k); }); if (!("page" in values)) q.set("page","1"); router.push(`${pathname}?${q}`); };
  const cards = summary ? [["Đang hoạt động",summary.totalActive],["Mới mở",summary.open],["Đang điều tra",summary.investigating],["Cao / khẩn",summary.highOrCritical],["Đã xử lý hôm nay",summary.resolvedToday]] : [];
  return <div className="space-y-4">
    <section className="rounded-xl border bg-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Shipment support</p><h1 className="mt-1 text-2xl font-black">Hồ sơ sự cố</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Theo dõi problem parcel và unidentified parcel, phân công điều tra và lưu immutable event timeline.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4",loading&&"animate-spin")}/>Làm mới</Button><Button onClick={() => setCreateOpen((v)=>!v)}><PlusIcon className="size-4"/>Tạo case</Button></div></div></section>
    {cards.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([l,v])=><Card key={String(l)}><CardContent><p className="text-[0.65rem] font-black uppercase text-muted-foreground">{l}</p><p className="mt-2 text-2xl font-black">{v}</p></CardContent></Card>)}</div>:null}
    {createOpen ? <CreateCasePanel defaults={{shipmentId,hubId}} onCreated={(id)=>router.push(`/shipments/cases/${id}`)}/> : null}
    <Card><CardContent className="space-y-3"><div className="grid gap-2 lg:grid-cols-[1fr_1fr_1fr_180px_180px_180px_auto]">
      <Input value={searchDraft} onChange={(e)=>setSearchDraft(e.target.value)} placeholder="Số case, tiêu đề, barcode..."/><Input value={shipmentDraft} onChange={(e)=>setShipmentDraft(e.target.value)} placeholder="Shipment UUID" className="font-mono text-xs"/><Input value={hubDraft} onChange={(e)=>setHubDraft(e.target.value)} placeholder="Hub UUID" className="font-mono text-xs"/>
      <select value={type} onChange={(e)=>update({type:e.target.value})} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Tất cả loại</option>{SHIPMENT_CASE_TYPES.map(v=><option key={v} value={v}>{shipmentCaseTypeLabel(v)}</option>)}</select>
      <select value={status} onChange={(e)=>update({status:e.target.value})} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Tất cả trạng thái</option>{SHIPMENT_CASE_STATUSES.map(v=><option key={v} value={v}>{shipmentCaseStatusLabel(v)}</option>)}</select>
      <select value={severity} onChange={(e)=>update({severity:e.target.value})} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Mọi mức độ</option>{SHIPMENT_CASE_SEVERITIES.map(v=><option key={v} value={v}>{shipmentCaseSeverityLabel(v)}</option>)}</select>
      <Button variant="outline" onClick={()=>update({search:searchDraft.trim(),shipmentId:shipmentDraft.trim(),hubId:hubDraft.trim()})}><SearchIcon className="size-4"/>Lọc</Button>
    </div></CardContent></Card>
    {error ? <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangleIcon className="size-4"/>{error}</div> : null}
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b bg-muted/30 text-[0.65rem] uppercase text-muted-foreground"><tr>{["Case","Loại","Mức độ","Trạng thái","Shipment / barcode","Assignee","Cập nhật"].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>
      {data?.items.map(item=><tr key={item.id} className="border-b last:border-0 hover:bg-muted/20"><td className="px-4 py-3"><Link href={`/shipments/cases/${item.id}`} className="text-xs font-black text-brand hover:underline">{item.caseNumber}</Link><p className="mt-1 max-w-64 truncate text-[0.68rem] text-muted-foreground">{item.title}</p></td><td className="px-4 py-3 text-xs font-bold">{shipmentCaseTypeLabel(item.type)}</td><td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-1 text-[0.65rem] font-black",severityClass(item.severity))}>{shipmentCaseSeverityLabel(item.severity)}</span></td><td className="px-4 py-3 text-xs font-bold">{shipmentCaseStatusLabel(item.status)}</td><td className="px-4 py-3 font-mono text-[0.68rem]">{item.shipmentId ? `${item.shipmentId.slice(0,8)}…` : item.externalBarcode ?? "—"}</td><td className="px-4 py-3 font-mono text-[0.68rem]">{item.assignedToUserId ? `${item.assignedToUserId.slice(0,8)}…` : "—"}</td><td className="px-4 py-3 text-[0.68rem] text-muted-foreground">{formatDateTime(item.updatedAt)}</td></tr>)}
      {!loading && data?.items.length===0 ? <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">Không có case phù hợp.</td></tr> : null}
    </tbody></table></div></Card>
    {data ? <div className="flex items-center justify-between rounded-xl border bg-card p-3"><p className="text-xs text-muted-foreground">{data.totalCount.toLocaleString("vi-VN")} case · trang {data.page}/{Math.max(1,data.totalPages)}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page<=1||loading} onClick={()=>update({page:page-1})}><ChevronLeftIcon className="size-4"/>Trước</Button><Button size="sm" variant="outline" disabled={page>=data.totalPages||loading} onClick={()=>update({page:page+1})}>Sau<ChevronRightIcon className="size-4"/></Button></div></div>:null}
  </div>;
}
