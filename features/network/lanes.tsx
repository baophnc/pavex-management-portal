"use client";

import {
  ArrowRightIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  createLane,
  createLaneSchedule,
  getHubs,
  getLanes,
  getLaneSchedules,
  updateLane,
  updateLaneSchedule,
  updateLaneScheduleStatus,
  updateLaneStatus,
} from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
import type {
  Hub,
  HubLane,
  LaneSchedule,
  PageResponse,
  TransportMode,
} from "@/features/network/contracts";
import { transportModeLabel, transportModes } from "@/features/network/contracts";
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
} from "@/features/network/ui";
import { cn, formatDateTime } from "@/lib/utils";

const weekDays = [
  ["MONDAY", "T2"],
  ["TUESDAY", "T3"],
  ["WEDNESDAY", "T4"],
  ["THURSDAY", "T5"],
  ["FRIDAY", "T6"],
  ["SATURDAY", "T7"],
  ["SUNDAY", "CN"],
] as const;

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return remain ? `${hours}h ${remain}m` : `${hours}h`;
}

type PendingStatusAction =
  | { kind: "lane"; lane: HubLane }
  | { kind: "schedule"; schedule: LaneSchedule };

export function NetworkLanes({ embedded = false }: { embedded?: boolean } = {}) {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");
  const [result, setResult] = useState<PageResponse<HubLane>>({
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selected, setSelected] = useState<HubLane | null>(null);
  const [creating, setCreating] = useState(false);
  const [schedules, setSchedules] = useState<LaneSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<LaneSchedule | null>(null);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatusAction | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (mode) params.set("transportMode", mode);
      const [lanes, hubPage] = await Promise.all([
        getLanes(params),
        getHubs(new URLSearchParams({ page: "1", pageSize: "100" })),
      ]);
      setResult(lanes);
      setHubs(hubPage.items);
      setSelected((current) =>
        current ? lanes.items.find((item) => item.id === current.id) ?? current : null,
      );
    } catch (reason) {
      setError(networkErrorMessage(reason, "Không thể tải danh sách tuyến vận chuyển."));
    } finally {
      setLoading(false);
    }
  }, [mode, page, search, status]);

  const loadSchedules = useCallback(async (laneId: string) => {
    setLoadingSchedules(true);
    try {
      const items = await getLaneSchedules(laneId);
      setSchedules(items);
      setSelectedSchedule((current) =>
        current ? items.find((item) => item.id === current.id) ?? null : null,
      );
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể tải lịch chạy."));
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!selected?.id) return;
    const laneId = selected.id;
    const task = window.setTimeout(() => void loadSchedules(laneId), 0);
    return () => window.clearTimeout(task);
  }, [loadSchedules, selected?.id]);

  async function saveLane(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const fromHubId = String(form.get("fromHubId") ?? "");
    const toHubId = String(form.get("toHubId") ?? "");
    const transportMode = String(form.get("transportMode") ?? "ROAD") as TransportMode;
    const estimatedTransitMinutes = Number(form.get("estimatedTransitMinutes"));
    const distanceRaw = String(form.get("distanceKm") ?? "").trim();
    const maxShipmentWeightKg = Number(form.get("maxShipmentWeightKg"));

    if ((!selected && !code) || !fromHubId || !toHubId || fromHubId === toHubId) {
      toast.error("Chọn hai điểm trung chuyển khác nhau và nhập mã kỹ thuật cho tuyến mới.");
      return;
    }
    if (!Number.isFinite(estimatedTransitMinutes) || estimatedTransitMinutes <= 0) {
      toast.error("Thời gian vận chuyển phải lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(maxShipmentWeightKg) || maxShipmentWeightKg <= 0) {
      toast.error("Khối lượng tối đa phải lớn hơn 0.");
      return;
    }

    const payload = {
      fromHubId,
      toHubId,
      transportMode,
      estimatedTransitMinutes,
      distanceKm: distanceRaw ? Number(distanceRaw) : null,
      maxShipmentWeightKg,
    };

    setSaving(true);
    try {
      const lane = selected
        ? await updateLane(selected.id, payload)
        : await createLane({ code, ...payload });
      toast.success(selected ? "Đã cập nhật tuyến vận chuyển." : "Đã tạo tuyến ở trạng thái ngừng hoạt động.");
      setCreating(false);
      await load();
      setSelected(lane);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu tuyến vận chuyển."));
    } finally {
      setSaving(false);
    }
  }

  async function applyLaneStatus(lane: HubLane, reason: string) {
    if (!canManage) return;
    const active = lane.status !== "ACTIVE";
    setSaving(true);
    try {
      await updateLaneStatus(lane.id, { active, reason: reason || null });
      toast.success(active ? "Đã kích hoạt tuyến vận chuyển." : "Đã ngừng tuyến vận chuyển.");
      setPendingStatus(null);
      await load();
      await loadSchedules(lane.id);
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái tuyến vận chuyển."));
    } finally {
      setSaving(false);
    }
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selected) return;
    const form = new FormData(event.currentTarget);
    const daysOfWeek = weekDays
      .filter(([key]) => form.get(`day-${key}`) === "on")
      .map(([key]) => key);
    if (!daysOfWeek.length) {
      toast.error("Chọn ít nhất một ngày chạy.");
      return;
    }
    const capacityKg = Number(form.get("capacityKg"));
    if (!Number.isFinite(capacityKg) || capacityKg <= 0) {
      toast.error("Sức chứa phải lớn hơn 0 kg.");
      return;
    }
    const payload = {
      departureTime: String(form.get("departureTime") ?? ""),
      daysOfWeek,
      effectiveFrom: String(form.get("effectiveFrom") ?? ""),
      effectiveTo: String(form.get("effectiveTo") ?? "") || null,
      capacityKg,
      ...(!selectedSchedule ? { active: true } : {}),
    };

    setSaving(true);
    try {
      if (selectedSchedule) {
        await updateLaneSchedule(selected.id, selectedSchedule.id, payload);
      } else {
        await createLaneSchedule(selected.id, payload);
      }
      toast.success(selectedSchedule ? "Đã cập nhật lịch chạy." : "Đã thêm lịch chạy.");
      setCreatingSchedule(false);
      setSelectedSchedule(null);
      await loadSchedules(selected.id);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu lịch chạy."));
    } finally {
      setSaving(false);
    }
  }

  async function applyScheduleStatus(schedule: LaneSchedule, reason: string) {
    if (!canManage || !selected) return;
    const active = schedule.status !== "ACTIVE";
    setSaving(true);
    try {
      await updateLaneScheduleStatus(selected.id, schedule.id, {
        active,
        reason: reason || null,
      });
      toast.success(active ? "Đã kích hoạt lịch chạy." : "Đã ngừng lịch chạy.");
      setPendingStatus(null);
      await loadSchedules(selected.id);
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái lịch chạy."));
    } finally {
      setSaving(false);
    }
  }

  const activeSchedules = useMemo(
    () => schedules.filter((item) => item.status === "ACTIVE").length,
    [schedules],
  );
  const usableActiveSchedules = schedules.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const canActivateSelectedLane =
    selected?.status === "ACTIVE" || usableActiveSchedules > 0;
  const canDeactivateSelectedSchedule = !(
    selected?.status === "ACTIVE" &&
    selectedSchedule?.status === "ACTIVE" &&
    usableActiveSchedules <= 1
  );
  const editorKey = selected?.id ?? (creating ? "new" : "none");
  const scheduleKey = selectedSchedule?.id ?? (creatingSchedule ? "new" : "none");

  return (
    <div className="space-y-4">
      {embedded ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black">Tuyến trực tiếp & lịch chạy</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Mỗi tuyến là một chặng giữa hai điểm trung chuyển. Chọn tuyến để xem và chỉnh lịch khởi hành ngay bên cạnh.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? (
              <Button onClick={() => { setSelected(null); setCreating(true); setSchedules([]); }}>
                <PlusIcon className="size-4" /> Tạo tuyến
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <NetworkPageHeader
          eyebrow="Mạng vận chuyển"
          title="Tuyến vận chuyển & lịch chạy"
          description="Quản lý đường đi giữa hai điểm trung chuyển, thời gian vận chuyển, lịch khởi hành và sức chứa từng chuyến."
          help={{ description: "Một tuyến vận chuyển nối hai điểm trung chuyển theo một chiều; lịch chạy quyết định khi nào tuyến đó thực sự có chuyến.", bullets: ["Tìm tuyến bằng tên điểm đi hoặc điểm đến, không cần nhớ mã kỹ thuật.", "Tuyến mới cần ít nhất một lịch chạy trước khi kích hoạt.", "Sức chứa được cấu hình trên từng lịch chạy và được kiểm tra khi lập tuyến."] }}
          actions={
            <>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
                Tải lại
              </Button>
              {canManage ? (
                <Button onClick={() => { setSelected(null); setCreating(true); setSchedules([]); }}>
                  <PlusIcon className="size-4" /> Tạo tuyến
                </Button>
              ) : null}
            </>
          }
        />
      )}

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input
            placeholder="Tìm theo tên điểm đi hoặc điểm đến..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          <select className={selectClassName} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
          <select className={selectClassName} value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }}>
            <option value="">Mọi phương thức</option>
            {transportModes.map((item) => <option key={item} value={item}>{transportModeLabel(item)}</option>)}
          </select>
          <div className="flex items-center justify-end text-xs font-bold text-muted-foreground">
            {result.totalItems.toLocaleString("vi-VN")} tuyến
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(26rem,0.75fr)]">
        <Card className="h-fit overflow-hidden">
          <CardHeader><p className="text-sm font-black">Danh sách tuyến vận chuyển</p></CardHeader>
          {loading && !result.items.length ? (
            <div className="grid min-h-56 place-items-center"><LoaderCircleIcon className="size-5 animate-spin text-brand" /></div>
          ) : result.items.length ? (
            <div className="divide-y">
              {result.items.map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => { setSelected(lane); setCreating(false); setSelectedSchedule(null); setCreatingSchedule(false); }}
                  className={cn("grid w-full gap-3 p-4 text-left transition hover:bg-muted/40 lg:grid-cols-[1fr_auto]", selected?.id === lane.id && "bg-brand/[0.055]")}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge active={lane.status === "ACTIVE"} /><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">{transportModeLabel(lane.transportMode)}</span></div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-base font-black"><span>{lane.fromHubName}</span><ArrowRightIcon className="size-4 text-muted-foreground" /><span>{lane.toHubName}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-right text-xs lg:min-w-48">
                    <div><p className="text-muted-foreground">Thời gian</p><p className="mt-1 font-black">{minutesLabel(lane.estimatedTransitMinutes)}</p></div>
                    <div><p className="text-muted-foreground">Khối lượng tối đa</p><p className="mt-1 font-black">{Number(lane.maxShipmentWeightKg).toLocaleString("vi-VN")} kg</p></div>
                  </div>
                </button>
              ))}
            </div>
          ) : <EmptyState title="Chưa có tuyến vận chuyển" description="Tạo tuyến giữa hai điểm trung chuyển để hệ thống có thể lập hành trình." />}
          <Pager page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPage={setPage} />
        </Card>

        <Card className="h-fit 2xl:sticky 2xl:top-32">
          <CardHeader>
            <p className="text-sm font-black">{selected ? `${selected.fromHubName} → ${selected.toHubName}` : creating ? "Tạo tuyến vận chuyển" : "Chi tiết tuyến"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Khi tuyến đang hoạt động, điểm đi/đến bị khoá; hãy ngừng hoạt động tuyến trước khi thay đổi cấu trúc.</p>
          </CardHeader>
          {!selected && !creating ? (
            <EmptyState title="Chọn một tuyến" description="Chọn tuyến để xem thông tin và quản lý lịch chạy." />
          ) : (
            <CardContent className="space-y-5">
              <form key={editorKey} className="grid gap-3 sm:grid-cols-2" onSubmit={saveLane}>
                <details className="sm:col-span-2 rounded-lg border bg-muted/15 p-3">
                  <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
                  <div className="mt-3">
                    <FormField label="Mã kỹ thuật" hint="Chỉ dùng nội bộ; danh sách và tìm kiếm ưu tiên tên địa danh.">
                      <Input name="code" defaultValue={selected?.code ?? ""} disabled={Boolean(selected) || !canManage} className="font-mono uppercase" placeholder="DN-GW-TO-DN-HOIAN" />
                    </FormField>
                  </div>
                </details>
                <FormField label="Điểm đi" hint={selected?.status === "ACTIVE" ? "Đang khóa vì tuyến đang hoạt động." : undefined}>
                  {selected?.status === "ACTIVE" ? <input type="hidden" name="fromHubId" value={selected.fromHubId} /> : null}
                  <select name="fromHubId" className={selectClassName} defaultValue={selected?.fromHubId ?? ""} disabled={!canManage || selected?.status === "ACTIVE"}><option value="">Chọn điểm trung chuyển</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select>
                </FormField>
                <FormField label="Điểm đến" hint={selected?.status === "ACTIVE" ? "Đang khóa vì tuyến đang hoạt động." : undefined}>
                  {selected?.status === "ACTIVE" ? <input type="hidden" name="toHubId" value={selected.toHubId} /> : null}
                  <select name="toHubId" className={selectClassName} defaultValue={selected?.toHubId ?? ""} disabled={!canManage || selected?.status === "ACTIVE"}><option value="">Chọn điểm trung chuyển</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}</select>
                </FormField>
                <FormField label="Phương thức vận chuyển" hint={selected?.status === "ACTIVE" ? "Đang khóa vì tuyến đang hoạt động." : undefined}>
                  {selected?.status === "ACTIVE" ? <input type="hidden" name="transportMode" value={selected.transportMode} /> : null}
                  <select name="transportMode" className={selectClassName} defaultValue={selected?.transportMode ?? "ROAD"} disabled={!canManage || selected?.status === "ACTIVE"}>{transportModes.map((item) => <option key={item} value={item}>{transportModeLabel(item)}</option>)}</select>
                </FormField>
                <FormField label="Thời gian dự kiến (phút)"><Input name="estimatedTransitMinutes" type="number" min="1" max="43200" defaultValue={selected?.estimatedTransitMinutes ?? 60} disabled={!canManage} /></FormField>
                <FormField label="Khoảng cách (km)"><Input name="distanceKm" type="number" min="0.01" step="0.01" defaultValue={selected?.distanceKm ?? ""} disabled={!canManage} /></FormField>
                <FormField label="Khối lượng đơn tối đa (kg)"><Input name="maxShipmentWeightKg" type="number" min="0.001" step="0.001" defaultValue={selected?.maxShipmentWeightKg ?? 30} disabled={!canManage} /></FormField>
                {canManage ? <div className="sm:col-span-2 flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{selected ? "Lưu thay đổi" : "Tạo tuyến"}</Button>{selected ? <Button type="button" variant={selected.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving || (selected.status === "INACTIVE" && !canActivateSelectedLane)} title={selected.status === "INACTIVE" && !canActivateSelectedLane ? "Tạo ít nhất một lịch chạy đang hoạt động trước khi kích hoạt tuyến." : undefined} onClick={() => setPendingStatus({ kind: "lane", lane: selected })}>{selected.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt tuyến"}</Button> : null}</div> : null}
                {selected?.status === "ACTIVE" ? <div className="sm:col-span-2"><ActionPolicyNote>Điểm đi, điểm đến và phương thức vận chuyển đang bị khoá vì tuyến còn hoạt động. Muốn đổi cấu trúc tuyến, hãy ngừng hoạt động tuyến trước.</ActionPolicyNote></div> : null}
                {selected?.status === "INACTIVE" && !canActivateSelectedLane ? <div className="sm:col-span-2"><ActionPolicyNote>Chưa thể kích hoạt: tuyến cần ít nhất một lịch chạy đang hoạt động và còn hiệu lực.</ActionPolicyNote></div> : null}
              </form>

              {selected ? (
                <section className="border-t pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-black">Lịch chạy</p><p className="mt-1 text-xs text-muted-foreground">{activeSchedules}/{schedules.length} lịch đang hoạt động.</p></div>
                    {canManage ? <Button size="sm" variant="outline" onClick={() => { setSelectedSchedule(null); setCreatingSchedule(true); }}><PlusIcon className="size-3.5" /> Thêm lịch</Button> : null}
                  </div>

                  {loadingSchedules ? <div className="grid min-h-24 place-items-center"><LoaderCircleIcon className="size-4 animate-spin text-brand" /></div> : schedules.length ? (
                    <div className="mt-3 space-y-2">
                      {schedules.map((schedule) => (
                        <button key={schedule.id} type="button" onClick={() => { setSelectedSchedule(schedule); setCreatingSchedule(false); }} className={cn("w-full rounded-lg border p-3 text-left transition hover:bg-muted/35", selectedSchedule?.id === schedule.id && "border-brand/30 bg-brand/[0.045]")}>
                          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Clock3Icon className="size-4 text-brand" /><span className="font-black">{schedule.departureTime.slice(0, 5)}</span><StatusBadge active={schedule.status === "ACTIVE"} /></div><p className="mt-1 text-[0.65rem] text-muted-foreground">{schedule.daysOfWeek.map((day) => weekDays.find(([key]) => key === day)?.[1] ?? day).join(" · ")}</p></div><p className="text-right text-xs"><span className="block font-black">{Number(schedule.capacityKg).toLocaleString("vi-VN")} kg</span><span className="text-muted-foreground">/ chuyến</span></p></div>
                        </button>
                      ))}
                    </div>
                  ) : <div className="mt-3"><EmptyState title="Chưa có lịch chạy" description="Tuyến cần ít nhất một lịch chạy trước khi kích hoạt." /></div>}

                  {selectedSchedule || creatingSchedule ? (
                    <form key={scheduleKey} className="mt-4 grid gap-3 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2" onSubmit={saveSchedule}>
                      <FormField label="Giờ khởi hành"><Input name="departureTime" type="time" required defaultValue={selectedSchedule?.departureTime.slice(0, 5) ?? "08:00"} disabled={!canManage} /></FormField>
                      <FormField label="Sức chứa / chuyến (kg)"><Input name="capacityKg" type="number" min="0.001" step="0.001" required defaultValue={selectedSchedule?.capacityKg ?? 1000} disabled={!canManage} /></FormField>
                      <FormField label="Hiệu lực từ"><Input name="effectiveFrom" type="date" required defaultValue={selectedSchedule?.effectiveFrom ?? ""} disabled={!canManage} /></FormField>
                      <FormField label="Hiệu lực đến"><Input name="effectiveTo" type="date" defaultValue={selectedSchedule?.effectiveTo ?? ""} disabled={!canManage} /></FormField>
                      <div className="sm:col-span-2"><p className="text-xs font-bold">Ngày chạy</p><div className="mt-2 flex flex-wrap gap-2">{weekDays.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold"><input name={`day-${key}`} type="checkbox" defaultChecked={selectedSchedule ? selectedSchedule.daysOfWeek.includes(key) : !["SATURDAY", "SUNDAY"].includes(key)} disabled={!canManage} />{label}</label>)}</div></div>
                      {canManage ? <div className="sm:col-span-2 flex flex-wrap gap-2 border-t pt-3"><Button type="submit" size="sm" disabled={saving}><SaveIcon className="size-3.5" />{selectedSchedule ? "Lưu lịch chạy" : "Tạo lịch chạy"}</Button>{selectedSchedule ? <Button type="button" size="sm" variant={selectedSchedule.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving || (selectedSchedule.status === "ACTIVE" && !canDeactivateSelectedSchedule)} title={selectedSchedule.status === "ACTIVE" && !canDeactivateSelectedSchedule ? "Tuyến đang hoạt động cần giữ ít nhất một lịch chạy khả dụng." : undefined} onClick={() => setPendingStatus({ kind: "schedule", schedule: selectedSchedule })}>{selectedSchedule.status === "ACTIVE" ? "Ngừng lịch" : "Kích hoạt lịch"}</Button> : null}<Button type="button" size="sm" variant="ghost" onClick={() => { setSelectedSchedule(null); setCreatingSchedule(false); }}><XIcon className="size-3.5" /> Đóng</Button></div> : null}
                      {selectedSchedule?.status === "ACTIVE" && !canDeactivateSelectedSchedule ? <div className="sm:col-span-2"><ActionPolicyNote>Không thể ngừng lịch này tại đây vì đây là lịch khả dụng cuối cùng của một tuyến đang hoạt động. Hãy tạo/kích hoạt lịch khác trước.</ActionPolicyNote></div> : null}
                    </form>
                  ) : null}
                </section>
              ) : null}

              {selected ? <ActionPolicyNote>Tuyến và lịch chạy không xoá được. Dùng “Ngừng hoạt động” để vẫn giữ lịch sử và nhật ký thay đổi.</ActionPolicyNote> : null}
              {selected ? <p className="text-[0.65rem] text-muted-foreground">Cập nhật {formatDateTime(selected.updatedAt)}</p> : null}
            </CardContent>
          )}
        </Card>
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingStatus)}
        title={
          pendingStatus?.kind === "lane"
            ? pendingStatus.lane.status === "ACTIVE" ? "Ngừng tuyến vận chuyển?" : "Kích hoạt tuyến vận chuyển?"
            : pendingStatus?.kind === "schedule"
              ? pendingStatus.schedule.status === "ACTIVE" ? "Ngừng lịch chạy?" : "Kích hoạt lịch chạy?"
              : "Xác nhận thao tác"
        }
        description={
          pendingStatus?.kind === "lane"
            ? pendingStatus.lane.status === "ACTIVE"
              ? `Ngừng tuyến ${pendingStatus.lane.fromHubName} → ${pendingStatus.lane.toHubName}. Không ngừng được nếu tuyến còn chỗ đã giữ hoặc đang nằm trong hành trình ưu tiên đang hoạt động.`
              : `Kích hoạt tuyến ${pendingStatus.lane.fromHubName} → ${pendingStatus.lane.toHubName}. Hai điểm đầu/cuối và ít nhất một lịch chạy phải đang hoạt động.`
            : pendingStatus?.kind === "schedule"
              ? pendingStatus.schedule.status === "ACTIVE"
                ? "Lịch này sẽ ngừng nhận hành trình mới. Không ngừng được nếu lịch còn chỗ đã giữ cho các chuyến sắp tới, hoặc đây là lịch duy nhất còn lại của tuyến đang hoạt động."
                : "Lịch chạy sẽ được đưa trở lại sử dụng. Hệ thống sẽ kiểm tra trùng lịch trước khi kích hoạt."
              : ""
        }
        confirmLabel={
          pendingStatus?.kind === "lane"
            ? pendingStatus.lane.status === "ACTIVE" ? "Ngừng tuyến" : "Kích hoạt tuyến"
            : pendingStatus?.kind === "schedule"
              ? pendingStatus.schedule.status === "ACTIVE" ? "Ngừng lịch" : "Kích hoạt lịch"
              : "Xác nhận"
        }
        destructive={
          pendingStatus?.kind === "lane"
            ? pendingStatus.lane.status === "ACTIVE"
            : pendingStatus?.kind === "schedule"
              ? pendingStatus.schedule.status === "ACTIVE"
              : false
        }
        loading={saving}
        reason
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => {
          if (pendingStatus?.kind === "lane") return applyLaneStatus(pendingStatus.lane, reason);
          if (pendingStatus?.kind === "schedule") return applyScheduleStatus(pendingStatus.schedule, reason);
        }}
      />
    </div>
  );
}
