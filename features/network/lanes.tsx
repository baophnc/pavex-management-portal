"use client";

import {
  ArrowRightIcon,
  Clock3Icon,
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
import { getHubs, getLanes, getLaneSchedules } from "@/features/network/api";
import type {
  Hub,
  HubLane,
  LaneSchedule,
  PageResponse,
  TransportMode,
} from "@/features/network/contracts";
import { transportModeLabel, transportModes } from "@/features/network/contracts";
import {
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  Pager,
  StatusBadge,
  selectClassName,
} from "@/features/network/ui";
import { apiRequest } from "@/lib/api/client";
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

export function NetworkLanes() {
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
      setError(reason instanceof Error ? reason.message : "Không thể tải transport lanes.");
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
      toast.error(reason instanceof Error ? reason.message : "Không thể tải lịch chạy.");
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
      toast.error("Chọn hai Hub khác nhau và nhập mã Lane.");
      return;
    }
    if (!Number.isFinite(estimatedTransitMinutes) || estimatedTransitMinutes <= 0) {
      toast.error("Transit time phải lớn hơn 0.");
      return;
    }
    if (!Number.isFinite(maxShipmentWeightKg) || maxShipmentWeightKg <= 0) {
      toast.error("Khối lượng tối đa phải lớn hơn 0.");
      return;
    }

    const payload = {
      ...(!selected ? { code } : {}),
      fromHubId,
      toHubId,
      transportMode,
      estimatedTransitMinutes,
      distanceKm: distanceRaw ? Number(distanceRaw) : null,
      maxShipmentWeightKg,
    };

    setSaving(true);
    try {
      const lane = (await apiRequest(
        selected ? `admin/network/lanes/${selected.id}` : "admin/network/lanes",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      )) as HubLane;
      toast.success(selected ? "Đã cập nhật Lane." : "Đã tạo Lane ở trạng thái INACTIVE.");
      setCreating(false);
      await load();
      setSelected(lane);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể lưu Lane.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLaneStatus(lane: HubLane) {
    if (!canManage) return;
    const active = lane.status !== "ACTIVE";
    if (!active && !window.confirm(`Ngừng Lane ${lane.code}?`)) return;
    setSaving(true);
    try {
      await apiRequest(`admin/network/lanes/${lane.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(active ? "Đã kích hoạt Lane." : "Đã ngừng Lane.");
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể đổi trạng thái Lane.");
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
      toast.error("Capacity phải lớn hơn 0 kg.");
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
      await apiRequest(
        selectedSchedule
          ? `admin/network/lanes/${selected.id}/schedules/${selectedSchedule.id}`
          : `admin/network/lanes/${selected.id}/schedules`,
        {
          method: selectedSchedule ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(selectedSchedule ? "Đã cập nhật lịch chạy." : "Đã thêm lịch chạy.");
      setCreatingSchedule(false);
      setSelectedSchedule(null);
      await loadSchedules(selected.id);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể lưu lịch chạy.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleScheduleStatus(schedule: LaneSchedule) {
    if (!canManage || !selected) return;
    const active = schedule.status !== "ACTIVE";
    setSaving(true);
    try {
      await apiRequest(`admin/network/lanes/${selected.id}/schedules/${schedule.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(active ? "Đã kích hoạt lịch." : "Đã ngừng lịch.");
      await loadSchedules(selected.id);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không thể đổi trạng thái lịch.");
    } finally {
      setSaving(false);
    }
  }

  const activeSchedules = useMemo(
    () => schedules.filter((item) => item.status === "ACTIVE").length,
    [schedules],
  );
  const editorKey = selected?.id ?? (creating ? "new" : "none");
  const scheduleKey = selectedSchedule?.id ?? (creatingSchedule ? "new" : "none");

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Transport graph"
        title="Lanes & schedules"
        description="Lane mô tả cạnh vận chuyển giữa hai Hub; Schedule mô tả các chuyến thực tế. parentHubId không tham gia routing. Lane mới ở INACTIVE và cần ít nhất một schedule trước khi kích hoạt."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? (
              <Button onClick={() => { setSelected(null); setCreating(true); setSchedules([]); }}>
                <PlusIcon className="size-4" /> Tạo Lane
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <Input
            placeholder="Tìm code / tên Hub..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          <select className={selectClassName} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <select className={selectClassName} value={mode} onChange={(event) => { setMode(event.target.value); setPage(1); }}>
            <option value="">Mọi phương thức</option>
            {transportModes.map((item) => <option key={item} value={item}>{transportModeLabel(item)}</option>)}
          </select>
          <div className="flex items-center justify-end text-xs font-bold text-muted-foreground">
            {result.totalItems.toLocaleString("vi-VN")} lane
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(26rem,0.75fr)]">
        <Card className="h-fit overflow-hidden">
          <CardHeader><p className="text-sm font-black">Transport graph</p></CardHeader>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-brand">{lane.code}</span>
                      <StatusBadge active={lane.status === "ACTIVE"} />
                      <span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">{transportModeLabel(lane.transportMode)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-black">
                      <span>{lane.fromHubCode}</span><ArrowRightIcon className="size-4 text-muted-foreground" /><span>{lane.toHubCode}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{lane.fromHubName} → {lane.toHubName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-right text-xs lg:min-w-48">
                    <div><p className="text-muted-foreground">Transit</p><p className="mt-1 font-black">{minutesLabel(lane.estimatedTransitMinutes)}</p></div>
                    <div><p className="text-muted-foreground">Max shipment</p><p className="mt-1 font-black">{Number(lane.maxShipmentWeightKg).toLocaleString("vi-VN")} kg</p></div>
                  </div>
                </button>
              ))}
            </div>
          ) : <EmptyState title="Chưa có Lane" description="Tạo cạnh vận chuyển giữa hai Hub để hình thành transport graph." />}
          <Pager page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPage={setPage} />
        </Card>

        <Card className="h-fit 2xl:sticky 2xl:top-32">
          <CardHeader>
            <p className="text-sm font-black">{selected ? `Lane ${selected.code}` : creating ? "Tạo Lane" : "Chi tiết Lane"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Topology của Lane ACTIVE được backend khóa; hãy deactivate trước khi đổi tuyến.</p>
          </CardHeader>
          {!selected && !creating ? (
            <EmptyState title="Chọn một Lane" description="Chọn Lane để chỉnh thông tin và quản lý lịch chạy." />
          ) : (
            <CardContent className="space-y-5">
              <form key={editorKey} className="grid gap-3 sm:grid-cols-2" onSubmit={saveLane}>
                <div className="sm:col-span-2"><FormField label="Lane code"><Input name="code" defaultValue={selected?.code ?? ""} disabled={Boolean(selected) || !canManage} className="font-mono uppercase" placeholder="HCM-HAN-AIR" /></FormField></div>
                <FormField label="From Hub"><select name="fromHubId" className={selectClassName} defaultValue={selected?.fromHubId ?? ""} disabled={!canManage}><option value="">Chọn Hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></FormField>
                <FormField label="To Hub"><select name="toHubId" className={selectClassName} defaultValue={selected?.toHubId ?? ""} disabled={!canManage}><option value="">Chọn Hub</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></FormField>
                <FormField label="Transport mode"><select name="transportMode" className={selectClassName} defaultValue={selected?.transportMode ?? "ROAD"} disabled={!canManage}>{transportModes.map((item) => <option key={item} value={item}>{transportModeLabel(item)}</option>)}</select></FormField>
                <FormField label="Transit (phút)"><Input name="estimatedTransitMinutes" type="number" min="1" max="43200" defaultValue={selected?.estimatedTransitMinutes ?? 60} disabled={!canManage} /></FormField>
                <FormField label="Khoảng cách (km)"><Input name="distanceKm" type="number" min="0.01" step="0.01" defaultValue={selected?.distanceKm ?? ""} disabled={!canManage} /></FormField>
                <FormField label="Max shipment (kg)"><Input name="maxShipmentWeightKg" type="number" min="0.001" step="0.001" defaultValue={selected?.maxShipmentWeightKg ?? 30} disabled={!canManage} /></FormField>
                {canManage ? <div className="sm:col-span-2 flex flex-wrap gap-2 border-t pt-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}{selected ? "Lưu Lane" : "Tạo Lane"}</Button>{selected ? <Button type="button" variant={selected.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving} onClick={() => void toggleLaneStatus(selected)}>{selected.status === "ACTIVE" ? "Ngừng Lane" : "Kích hoạt Lane"}</Button> : null}</div> : null}
              </form>

              {selected ? (
                <section className="border-t pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-black">Schedules</p><p className="mt-1 text-xs text-muted-foreground">{activeSchedules}/{schedules.length} lịch đang ACTIVE.</p></div>
                    {canManage ? <Button size="sm" variant="outline" onClick={() => { setSelectedSchedule(null); setCreatingSchedule(true); }}><PlusIcon className="size-3.5" /> Thêm lịch</Button> : null}
                  </div>

                  {loadingSchedules ? <div className="grid min-h-24 place-items-center"><LoaderCircleIcon className="size-4 animate-spin text-brand" /></div> : schedules.length ? (
                    <div className="mt-3 space-y-2">
                      {schedules.map((schedule) => (
                        <button key={schedule.id} type="button" onClick={() => { setSelectedSchedule(schedule); setCreatingSchedule(false); }} className={cn("w-full rounded-lg border p-3 text-left transition hover:bg-muted/35", selectedSchedule?.id === schedule.id && "border-brand/30 bg-brand/[0.045]")}>
                          <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Clock3Icon className="size-4 text-brand" /><span className="font-black">{schedule.departureTime.slice(0, 5)}</span><StatusBadge active={schedule.status === "ACTIVE"} /></div><p className="mt-1 text-[0.65rem] text-muted-foreground">{schedule.daysOfWeek.map((day) => weekDays.find(([key]) => key === day)?.[1] ?? day).join(" · ")}</p></div><p className="text-right text-xs"><span className="block font-black">{Number(schedule.capacityKg).toLocaleString("vi-VN")} kg</span><span className="text-muted-foreground">/ departure</span></p></div>
                        </button>
                      ))}
                    </div>
                  ) : <div className="mt-3"><EmptyState title="Chưa có schedule" description="Lane cần ít nhất một lịch chạy trước khi activate." /></div>}

                  {selectedSchedule || creatingSchedule ? (
                    <form key={scheduleKey} className="mt-4 grid gap-3 rounded-xl border bg-muted/15 p-4 sm:grid-cols-2" onSubmit={saveSchedule}>
                      <FormField label="Giờ khởi hành"><Input name="departureTime" type="time" required defaultValue={selectedSchedule?.departureTime.slice(0, 5) ?? "08:00"} disabled={!canManage} /></FormField>
                      <FormField label="Capacity / chuyến (kg)"><Input name="capacityKg" type="number" min="0.001" step="0.001" required defaultValue={selectedSchedule?.capacityKg ?? 1000} disabled={!canManage} /></FormField>
                      <FormField label="Hiệu lực từ"><Input name="effectiveFrom" type="date" required defaultValue={selectedSchedule?.effectiveFrom ?? ""} disabled={!canManage} /></FormField>
                      <FormField label="Hiệu lực đến"><Input name="effectiveTo" type="date" defaultValue={selectedSchedule?.effectiveTo ?? ""} disabled={!canManage} /></FormField>
                      <div className="sm:col-span-2"><p className="text-xs font-bold">Ngày chạy</p><div className="mt-2 flex flex-wrap gap-2">{weekDays.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold"><input name={`day-${key}`} type="checkbox" defaultChecked={selectedSchedule ? selectedSchedule.daysOfWeek.includes(key) : !["SATURDAY", "SUNDAY"].includes(key)} disabled={!canManage} />{label}</label>)}</div></div>
                      {canManage ? <div className="sm:col-span-2 flex flex-wrap gap-2 border-t pt-3"><Button type="submit" size="sm" disabled={saving}><SaveIcon className="size-3.5" />{selectedSchedule ? "Lưu schedule" : "Tạo schedule"}</Button>{selectedSchedule ? <Button type="button" size="sm" variant={selectedSchedule.status === "ACTIVE" ? "destructive" : "outline"} disabled={saving} onClick={() => void toggleScheduleStatus(selectedSchedule)}>{selectedSchedule.status === "ACTIVE" ? "Ngừng lịch" : "Kích hoạt lịch"}</Button> : null}<Button type="button" size="sm" variant="ghost" onClick={() => { setSelectedSchedule(null); setCreatingSchedule(false); }}><Trash2Icon className="size-3.5" /> Đóng</Button></div> : null}
                    </form>
                  ) : null}
                </section>
              ) : null}

              {selected ? <p className="text-[0.65rem] text-muted-foreground">Cập nhật {formatDateTime(selected.updatedAt)}</p> : null}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
