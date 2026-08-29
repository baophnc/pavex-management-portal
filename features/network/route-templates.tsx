"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  GitBranchIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getHubs, getLanes, getRouteTemplates } from "@/features/network/api";
import type { Hub, HubLane, PageResponse, RouteTemplate } from "@/features/network/contracts";
import { transportModeLabel } from "@/features/network/contracts";
import {
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  Pager,
  StatusBadge,
  selectClassName,
  textareaClassName,
} from "@/features/network/ui";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}

export function NetworkRouteTemplates() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");
  const [result, setResult] = useState<PageResponse<RouteTemplate>>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [lanes, setLanes] = useState<HubLane[]>([]);
  const [selected, setSelected] = useState<RouteTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [laneIds, setLaneIds] = useState<string[]>([]);
  const [laneToAdd, setLaneToAdd] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const [templates, hubPage, lanePage] = await Promise.all([
        getRouteTemplates(params),
        getHubs(new URLSearchParams({ page: "1", pageSize: "100" })),
        getLanes(new URLSearchParams({ page: "1", pageSize: "100" })),
      ]);
      setResult(templates);
      setHubs(hubPage.items);
      setLanes(lanePage.items);
      setSelected((current) => current ? templates.items.find((item) => item.id === current.id) ?? current : null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải Route Template.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function selectTemplate(template: RouteTemplate) {
    setSelected(template);
    setCreating(false);
    setLaneIds(template.legs.sort((a, b) => a.sequence - b.sequence).map((leg) => leg.laneId));
  }

  function createNew() {
    setSelected(null);
    setCreating(true);
    setLaneIds([]);
  }

  const selectedLanes = useMemo(
    () => laneIds.map((id) => lanes.find((lane) => lane.id === id)).filter((lane): lane is HubLane => Boolean(lane)),
    [laneIds, lanes],
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const name = String(form.get("name") ?? "").trim();
    const description = String(form.get("description") ?? "").trim() || null;
    const originHubId = String(form.get("originHubId") ?? "");
    const destinationHubId = String(form.get("destinationHubId") ?? "");
    const priority = Number(form.get("priority"));

    if ((!selected && !code) || !name || !originHubId || !destinationHubId || originHubId === destinationHubId) {
      toast.error("Nhập đủ code, tên và hai Hub khác nhau.");
      return;
    }
    if (!laneIds.length) {
      toast.error("Route Template cần ít nhất một Lane.");
      return;
    }

    setSaving(true);
    try {
      const template = (await apiRequest(
        selected ? `admin/network/route-templates/${selected.id}` : "admin/network/route-templates",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify({
            ...(!selected ? { code } : {}),
            name,
            description,
            originHubId,
            destinationHubId,
            priority,
            laneIds,
          }),
        },
      )) as RouteTemplate;
      toast.success(selected ? `Đã cập nhật template · revision ${template.revision}.` : "Đã tạo Route Template ở trạng thái INACTIVE.");
      setCreating(false);
      await load();
      setSelected(template);
      setLaneIds(template.legs.map((leg) => leg.laneId));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể lưu Route Template.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(template: RouteTemplate) {
    if (!canManage) return;
    const active = template.status !== "ACTIVE";
    if (!active && !window.confirm(`Ngừng Route Template ${template.code}?`)) return;
    setSaving(true);
    try {
      await apiRequest(`admin/network/route-templates/${template.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(active ? "Đã kích hoạt Route Template." : "Đã ngừng Route Template.");
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể đổi trạng thái template.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(template: RouteTemplate) {
    if (!canManage || template.status === "ACTIVE") return;
    if (!window.confirm(`Xóa template ${template.code}? Audit history vẫn được giữ.`)) return;
    setSaving(true);
    try {
      await apiRequest(`admin/network/route-templates/${template.id}`, { method: "DELETE" });
      toast.success("Đã xóa Route Template.");
      setSelected(null);
      setLaneIds([]);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể xóa template.");
    } finally {
      setSaving(false);
    }
  }

  const editorKey = selected?.id ?? (creating ? "new" : "none");

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Preferred routing"
        title="Route Templates"
        description="Template là tuyến operator ưu tiên trên transport graph. Planner thử template ACTIVE theo priority; nếu không khả dụng và mode là PREFER_TEMPLATE thì tự fallback sang earliest-arrival graph planner."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Tải lại</Button>
            {canManage ? <Button onClick={createNew}><PlusIcon className="size-4" />Tạo template</Button> : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3"><Input placeholder="Tìm code / tên..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select className={selectClassName} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Mọi trạng thái</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select><div className="flex items-center justify-end text-xs font-bold text-muted-foreground">{result.totalItems} template</div></CardContent></Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_30rem]">
        <Card className="h-fit overflow-hidden">
          <CardHeader><p className="text-sm font-black">Preferred routes</p></CardHeader>
          {loading && !result.items.length ? <div className="grid min-h-56 place-items-center"><LoaderCircleIcon className="size-5 animate-spin text-brand" /></div> : result.items.length ? (
            <div className="divide-y">{result.items.map((template) => <button key={template.id} type="button" onClick={() => selectTemplate(template)} className={cn("w-full p-4 text-left transition hover:bg-muted/40", selected?.id === template.id && "bg-brand/[0.055]")}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-black text-brand">{template.code}</span><StatusBadge active={template.status === "ACTIVE"} /><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">P{template.priority}</span><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">rev {template.revision}</span></div><p className="mt-1 text-sm font-black">{template.name}</p><p className="mt-1 text-xs text-muted-foreground">{template.originHubCode} → {template.destinationHubCode} · {template.legs.length} legs</p></div><div className="text-right text-xs"><p className="font-black">{template.estimatedTransitMinutes.toLocaleString("vi-VN")} phút</p><p className="mt-1 text-muted-foreground">{template.totalDistanceKm ? `${Number(template.totalDistanceKm).toLocaleString("vi-VN")} km` : "Chưa có distance"}</p></div></div></button>)}</div>
          ) : <EmptyState title="Chưa có Route Template" description="Graph Planner vẫn hoạt động; template chỉ cần khi Operations muốn ưu tiên một tuyến cụ thể." />}
          <Pager page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPage={setPage} />
        </Card>

        <Card className="h-fit 2xl:sticky 2xl:top-32">
          <CardHeader><p className="text-sm font-black">{selected ? selected.code : creating ? "Tạo Route Template" : "Chi tiết template"}</p><p className="mt-1 text-xs text-muted-foreground">Thứ tự Lane phải liên tục từ Origin đến Destination; backend sẽ chặn path disconnected hoặc cycle.</p></CardHeader>
          {!selected && !creating ? <EmptyState title="Chọn template" description="Chọn một template ở danh sách hoặc tạo mới." /> : (
            <CardContent>
              <form key={editorKey} className="grid gap-3" onSubmit={save}>
                <FormField label="Code"><Input name="code" defaultValue={selected?.code ?? ""} disabled={Boolean(selected) || !canManage} className="font-mono uppercase" placeholder="HCM-HAN-STANDARD" /></FormField>
                <FormField label="Tên"><Input name="name" defaultValue={selected?.name ?? ""} disabled={!canManage} placeholder="HCM - Hà Nội Standard" /></FormField>
                <FormField label="Mô tả"><textarea name="description" className={textareaClassName} defaultValue={selected?.description ?? ""} disabled={!canManage} /></FormField>
                <div className="grid gap-3 sm:grid-cols-2"><FormField label="Origin Hub"><select name="originHubId" className={selectClassName} defaultValue={selected?.originHubId ?? ""} disabled={!canManage}><option value="">Chọn Hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></FormField><FormField label="Destination Hub"><select name="destinationHubId" className={selectClassName} defaultValue={selected?.destinationHubId ?? ""} disabled={!canManage}><option value="">Chọn Hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></FormField></div>
                <FormField label="Priority" hint="Số nhỏ hơn được ưu tiên trước."><Input name="priority" type="number" min="1" max="10000" defaultValue={selected?.priority ?? 100} disabled={!canManage} /></FormField>

                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-black">Ordered lanes</p><p className="mt-1 text-[0.65rem] text-muted-foreground">{laneIds.length}/30 legs</p></div><GitBranchIcon className="size-4 text-brand" /></div>
                  {canManage ? <div className="mt-3 flex gap-2"><select className={selectClassName} value={laneToAdd} onChange={(event) => setLaneToAdd(event.target.value)}><option value="">Chọn Lane để thêm</option>{lanes.filter((lane) => !laneIds.includes(lane.id)).map((lane) => <option key={lane.id} value={lane.id}>{lane.code} · {lane.fromHubCode} → {lane.toHubCode}</option>)}</select><Button type="button" variant="outline" size="sm" disabled={!laneToAdd} onClick={() => { if (laneToAdd) setLaneIds((current) => [...current, laneToAdd]); setLaneToAdd(""); }}><PlusIcon className="size-3.5" />Thêm</Button></div> : null}
                  <div className="mt-3 space-y-2">{selectedLanes.length ? selectedLanes.map((lane, index) => <div key={`${lane.id}-${index}`} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.65rem] font-black text-brand">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-mono text-xs font-black">{lane.code}</p><p className="mt-0.5 text-[0.65rem] text-muted-foreground">{lane.fromHubCode} → {lane.toHubCode} · {transportModeLabel(lane.transportMode)}</p></div>{canManage ? <div className="flex"><Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => setLaneIds((current) => move(current, index, index - 1))}><ArrowUpIcon className="size-3.5" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === laneIds.length - 1} onClick={() => setLaneIds((current) => move(current, index, index + 1))}><ArrowDownIcon className="size-3.5" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => setLaneIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2Icon className="size-3.5 text-destructive" /></Button></div> : null}</div>) : <p className="py-4 text-center text-xs text-muted-foreground">Chưa có Lane trong template.</p>}</div>
                </div>

                {selected ? <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3"><div><p className="text-xs font-black">Revision {selected.revision}</p><p className="mt-1 text-[0.65rem] text-muted-foreground">Mỗi lần update path/metadata sẽ tăng revision.</p></div><StatusBadge active={selected.status === "ACTIVE"} /></div> : null}
                {canManage ? <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{selected ? "Lưu template" : "Tạo template"}</Button>{selected ? <Button type="button" variant={selected.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving} onClick={() => void toggleStatus(selected)}>{selected.status === "ACTIVE" ? "Ngừng template" : "Kích hoạt template"}</Button> : null}{selected?.status === "INACTIVE" ? <Button type="button" variant="ghost" disabled={saving} onClick={() => void remove(selected)}><Trash2Icon className="size-4 text-destructive" />Xóa</Button> : null}</div> : null}
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
