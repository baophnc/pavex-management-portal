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
import { networkErrorMessage } from "@/features/network/errors";
import type { Hub, HubLane, PageResponse, RouteTemplate } from "@/features/network/contracts";
import { transportModeLabel } from "@/features/network/contracts";
import {
  ActionPolicyNote,
  ConfirmActionDialog,
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

type PendingTemplateAction = {
  kind: "status" | "delete";
  template: RouteTemplate;
};

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
  const [pendingAction, setPendingAction] = useState<PendingTemplateAction | null>(null);

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
      setError(networkErrorMessage(reason, "Không thể tải tuyến mẫu."));
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
  const hubById = useMemo(() => new Map(hubs.map((hub) => [hub.id, hub])), [hubs]);

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
      toast.error("Nhập đủ tên, mã kỹ thuật và hai điểm trung chuyển khác nhau.");
      return;
    }
    if (!laneIds.length) {
      toast.error("Tuyến mẫu cần ít nhất một tuyến vận chuyển.");
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
      toast.success(selected ? `Đã cập nhật tuyến mẫu · phiên bản ${template.revision}.` : "Đã tạo tuyến mẫu ở trạng thái ngừng hoạt động.");
      setCreating(false);
      await load();
      setSelected(template);
      setLaneIds(template.legs.map((leg) => leg.laneId));
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu tuyến mẫu."));
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(template: RouteTemplate, reason: string) {
    if (!canManage) return;
    const active = template.status !== "ACTIVE";
    setSaving(true);
    try {
      await apiRequest(`admin/network/route-templates/${template.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active, reason: reason || null }),
      });
      toast.success(active ? "Đã kích hoạt tuyến mẫu." : "Đã ngừng tuyến mẫu.");
      setPendingAction(null);
      await load();
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái tuyến mẫu."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(template: RouteTemplate, reason: string) {
    if (!canManage || template.status === "ACTIVE") return;
    setSaving(true);
    try {
      const params = new URLSearchParams();
      if (reason) params.set("reason", reason);
      const query = params.toString();
      const suffix = query ? `?${query}` : "";
      await apiRequest(`admin/network/route-templates/${template.id}${suffix}`, { method: "DELETE" });
      toast.success("Đã xóa tuyến mẫu.");
      setPendingAction(null);
      setSelected(null);
      setLaneIds([]);
      await load();
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể xóa tuyến mẫu."));
    } finally {
      setSaving(false);
    }
  }

  const editorKey = selected?.id ?? (creating ? "new" : "none");

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Tuyến ưu tiên"
        title="Tuyến mẫu"
        description="Thiết lập các hành trình ưu tiên mà bộ phận vận hành muốn hệ thống thử trước khi tự tìm tuyến khác."
        help={{ description: "Tuyến mẫu là một chuỗi tuyến vận chuyển đã được sắp xếp sẵn theo thứ tự ưu tiên.", bullets: ["Ưu tiên số nhỏ hơn sẽ được thử trước.", "Nếu tuyến mẫu không khả dụng, chế độ mặc định có thể tự tìm tuyến khác.", "Mã kỹ thuật vẫn được giữ trong phần chi tiết nhưng không cần dùng để tìm kiếm hằng ngày."] }}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Tải lại</Button>
            {canManage ? <Button onClick={createNew}><PlusIcon className="size-4" />Tạo tuyến mẫu</Button> : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3"><Input placeholder="Tìm theo tên tuyến mẫu..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select className={selectClassName} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Mọi trạng thái</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select><div className="flex items-center justify-end text-xs font-bold text-muted-foreground">{result.totalItems} tuyến mẫu</div></CardContent></Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_30rem]">
        <Card className="h-fit overflow-hidden">
          <CardHeader><p className="text-sm font-black">Danh sách tuyến mẫu</p></CardHeader>
          {loading && !result.items.length ? <div className="grid min-h-56 place-items-center"><LoaderCircleIcon className="size-5 animate-spin text-brand" /></div> : result.items.length ? (
            <div className="divide-y">{result.items.map((template) => <button key={template.id} type="button" onClick={() => selectTemplate(template)} className={cn("w-full p-4 text-left transition hover:bg-muted/40", selected?.id === template.id && "bg-brand/[0.055]")}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge active={template.status === "ACTIVE"} /><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">Ưu tiên {template.priority}</span><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">Phiên bản {template.revision}</span></div><p className="mt-2 text-sm font-black">{template.name}</p><p className="mt-1 text-xs text-muted-foreground">{hubById.get(template.originHubId)?.name ?? "Điểm đi"} → {hubById.get(template.destinationHubId)?.name ?? "Điểm đến"} · {template.legs.length} chặng</p></div><div className="text-right text-xs"><p className="font-black">{template.estimatedTransitMinutes.toLocaleString("vi-VN")} phút</p><p className="mt-1 text-muted-foreground">{template.totalDistanceKm ? `${Number(template.totalDistanceKm).toLocaleString("vi-VN")} km` : "Chưa có khoảng cách"}</p></div></div></button>)}</div>
          ) : <EmptyState title="Chưa có tuyến mẫu" description="Hệ thống vẫn có thể tự tìm tuyến; tuyến mẫu chỉ dùng khi vận hành muốn ưu tiên một hành trình cụ thể." />}
          <Pager page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPage={setPage} />
        </Card>

        <Card className="h-fit 2xl:sticky 2xl:top-32">
          <CardHeader><p className="text-sm font-black">{selected ? selected.name : creating ? "Tạo tuyến mẫu" : "Chi tiết tuyến mẫu"}</p><p className="mt-1 text-xs text-muted-foreground">Các chặng phải nối liên tục từ điểm đầu đến điểm cuối; backend sẽ chặn tuyến bị đứt hoặc tạo vòng lặp.</p></CardHeader>
          {!selected && !creating ? <EmptyState title="Chọn tuyến mẫu" description="Chọn một tuyến mẫu ở danh sách hoặc tạo mới." /> : (
            <CardContent>
              <form key={editorKey} className="grid gap-3" onSubmit={save}>
                <details className="rounded-lg border bg-muted/15 p-3"><summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary><div className="mt-3"><FormField label="Mã kỹ thuật" hint="Chỉ dùng nội bộ; tìm kiếm hằng ngày dùng tên tuyến."><Input name="code" defaultValue={selected?.code ?? ""} disabled={Boolean(selected) || !canManage} className="font-mono uppercase" placeholder="HCM-HN-STANDARD" /></FormField></div></details>
                <FormField label="Tên"><Input name="name" defaultValue={selected?.name ?? ""} disabled={!canManage} placeholder="Hồ Chí Minh → Hà Nội tiêu chuẩn" /></FormField>
                <FormField label="Mô tả"><textarea name="description" className={textareaClassName} defaultValue={selected?.description ?? ""} disabled={!canManage} /></FormField>
                <div className="grid gap-3 sm:grid-cols-2"><FormField label="Điểm đầu"><select name="originHubId" className={selectClassName} defaultValue={selected?.originHubId ?? ""} disabled={!canManage}><option value="">Chọn điểm trung chuyển</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></FormField><FormField label="Điểm cuối"><select name="destinationHubId" className={selectClassName} defaultValue={selected?.destinationHubId ?? ""} disabled={!canManage}><option value="">Chọn điểm trung chuyển</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></FormField></div>
                <FormField label="Mức ưu tiên" hint="Số nhỏ hơn được ưu tiên trước."><Input name="priority" type="number" min="1" max="10000" defaultValue={selected?.priority ?? 100} disabled={!canManage} /></FormField>

                <div className="rounded-xl border p-3">
                  <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-black">Các chặng theo thứ tự</p><p className="mt-1 text-[0.65rem] text-muted-foreground">{laneIds.length}/30 chặng</p></div><GitBranchIcon className="size-4 text-brand" /></div>
                  {canManage ? <div className="mt-3 flex gap-2"><select className={selectClassName} value={laneToAdd} onChange={(event) => setLaneToAdd(event.target.value)}><option value="">Chọn tuyến để thêm</option>{lanes.filter((lane) => !laneIds.includes(lane.id)).map((lane) => <option key={lane.id} value={lane.id}>{lane.fromHubName} → {lane.toHubName}</option>)}</select><Button type="button" variant="outline" size="sm" disabled={!laneToAdd} onClick={() => { if (laneToAdd) setLaneIds((current) => [...current, laneToAdd]); setLaneToAdd(""); }}><PlusIcon className="size-3.5" />Thêm</Button></div> : null}
                  <div className="mt-3 space-y-2">{selectedLanes.length ? selectedLanes.map((lane, index) => <div key={`${lane.id}-${index}`} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-[0.65rem] font-black text-brand">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black">{lane.fromHubName} → {lane.toHubName}</p><p className="mt-0.5 text-[0.65rem] text-muted-foreground">{transportModeLabel(lane.transportMode)}</p></div>{canManage ? <div className="flex"><Button type="button" variant="ghost" size="icon" disabled={index === 0} onClick={() => setLaneIds((current) => move(current, index, index - 1))}><ArrowUpIcon className="size-3.5" /></Button><Button type="button" variant="ghost" size="icon" disabled={index === laneIds.length - 1} onClick={() => setLaneIds((current) => move(current, index, index + 1))}><ArrowDownIcon className="size-3.5" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => setLaneIds((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2Icon className="size-3.5 text-destructive" /></Button></div> : null}</div>) : <p className="py-4 text-center text-xs text-muted-foreground">Chưa có chặng trong tuyến mẫu.</p>}</div>
                </div>

                {selected ? <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3"><div><p className="text-xs font-black">Phiên bản {selected.revision}</p><p className="mt-1 text-[0.65rem] text-muted-foreground">Mỗi lần thay đổi hành trình hoặc thông tin tuyến sẽ tăng phiên bản.</p></div><StatusBadge active={selected.status === "ACTIVE"} /></div> : null}
                {canManage ? <div className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{selected ? "Lưu thay đổi" : "Tạo tuyến mẫu"}</Button>{selected ? <Button type="button" variant={selected.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving} onClick={() => setPendingAction({ kind: "status", template: selected })}>{selected.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt tuyến mẫu"}</Button> : null}{selected?.status === "INACTIVE" ? <Button type="button" variant="ghost" disabled={saving} onClick={() => setPendingAction({ kind: "delete", template: selected })}><Trash2Icon className="size-4 text-destructive" />Xóa tuyến mẫu</Button> : null}</div> : null}
                {selected ? <ActionPolicyNote>Tuyến mẫu là cấu hình Network duy nhất hiện có API xóa cứng. Backend chỉ cho xóa khi tuyến mẫu đang ngừng hoạt động; nhật ký audit vẫn được giữ.</ActionPolicyNote> : null}
              </form>
            </CardContent>
          )}
        </Card>
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.kind === "delete"
            ? "Xóa tuyến mẫu?"
            : pendingAction?.template.status === "ACTIVE"
              ? "Ngừng tuyến mẫu?"
              : "Kích hoạt tuyến mẫu?"
        }
        description={
          pendingAction?.kind === "delete"
            ? `Tuyến mẫu ${pendingAction.template.name} sẽ bị xóa khỏi cấu hình. Nhật ký thay đổi vẫn được giữ. Thao tác này chỉ hợp lệ khi tuyến đang ngừng hoạt động.`
            : pendingAction?.template.status === "ACTIVE"
              ? `Tuyến mẫu ${pendingAction?.template.name ?? "này"} sẽ không còn được planner ưu tiên.`
              : `Tuyến mẫu ${pendingAction?.template.name ?? "này"} sẽ được đưa vào danh sách ưu tiên. Backend sẽ kiểm tra toàn bộ hub, lane và lịch chạy trước khi kích hoạt.`
        }
        confirmLabel={
          pendingAction?.kind === "delete"
            ? "Xóa tuyến mẫu"
            : pendingAction?.template.status === "ACTIVE"
              ? "Ngừng hoạt động"
              : "Kích hoạt"
        }
        destructive={pendingAction?.kind === "delete" || pendingAction?.template.status === "ACTIVE"}
        loading={saving}
        reason
        reasonLabel={pendingAction?.kind === "delete" ? "Lý do xóa (không bắt buộc)" : "Lý do thay đổi (không bắt buộc)"}
        onCancel={() => setPendingAction(null)}
        onConfirm={(reason) => {
          if (!pendingAction) return;
          if (pendingAction.kind === "delete") return remove(pendingAction.template, reason);
          return applyStatus(pendingAction.template, reason);
        }}
      />
    </div>
  );
}
