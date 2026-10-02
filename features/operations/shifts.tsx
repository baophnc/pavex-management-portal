"use client";

import {
  CalendarClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HubName } from "@/features/directory/names";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getScopedHubs } from "@/features/operations/hub-scope";
import { createWorkShift, getWorkforce, getWorkShifts } from "@/features/operations/api";
import type { WorkShift, WorkShiftPage, WorkShiftStatus } from "@/features/operations/contracts";
import { workShiftStatusLabel } from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 20;

type ShiftHubOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function localInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function shiftStatusClass(status: WorkShiftStatus) {
  return status === "SCHEDULED"
    ? "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    : "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

function CreateShiftDialog({
  open,
  hubs,
  onClose,
  onCreated,
}: {
  open: boolean;
  hubs: ShiftHubOption[];
  onClose: () => void;
  onCreated: (shift: WorkShift) => void;
}) {
  const [hubId, setHubId] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const task = window.setTimeout(() => {
      const start = new Date();
      start.setMinutes(0, 0, 0);
      start.setHours(start.getHours() + 1);
      const end = new Date(start);
      end.setHours(end.getHours() + 8);
      setHubId(hubs.find((hub) => hub.status === "ACTIVE")?.id ?? "");
      setName("");
      setStartsAt(localInputValue(start));
      setEndsAt(localInputValue(end));
    }, 0);
    return () => window.clearTimeout(task);
  }, [hubs, open]);

  if (!open) return null;

  const submit = async () => {
    if (!hubId || !name.trim() || !startsAt || !endsAt) {
      toast.error("Nhập đủ bưu cục, tên ca và thời gian.");
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (!(end > start)) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setSaving(true);
    try {
      const shift = await createWorkShift({
        hubId,
        name: name.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
      });
      toast.success("Đã tạo ca làm việc.");
      onCreated(shift);
      onClose();
    } catch (error) {
      toast.error(apiMessage(error, "Không thể tạo ca làm việc."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
      <section className="w-full max-w-xl rounded-xl border bg-card shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">Lập ca</p>
            <h2 className="mt-1 text-lg font-black">Tạo ca làm việc</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Ca tối đa 24 giờ; hệ thống sẽ kiểm tra bưu cục và thời gian ca.</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} disabled={saving}><XIcon className="size-4" /></Button>
        </header>
        <div className="grid gap-4 p-5">
          <label className="grid gap-2 text-xs font-bold">
            Bưu cục
            <select value={hubId} onChange={(event) => setHubId(event.target.value)} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="">Chọn bưu cục</option>
              {hubs.filter((hub) => hub.status === "ACTIVE").map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-xs font-bold">Tên ca<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ca sáng kho HCM" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs font-bold">Bắt đầu<Input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
            <label className="grid gap-2 text-xs font-bold">Kết thúc<Input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t p-5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Tạo ca</Button>
        </footer>
      </section>
    </div>
  );
}

export function OperationsShifts() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasPermission } = useAccess();
  const canManage = hasPermission("operations.workforce.manage") || hasPermission("operations.hub.manage");
  const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const hubId = searchParams.get("hubId") ?? "";
  const status = (searchParams.get("status") ?? "") as WorkShiftStatus | "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const [data, setData] = useState<WorkShiftPage | null>(null);
  const [hubs, setHubs] = useState<ShiftHubOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const query = useMemo(() => {
    const value = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (hubId) value.set("hubId", hubId);
    if (status) value.set("status", status);
    if (from) value.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) value.set("to", new Date(`${to}T23:59:59`).toISOString());
    return value;
  }, [from, hubId, page, status, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWorkShifts(query);
      setData(result);
    } catch (reason) {
      setError(apiMessage(reason, "Không thể tải danh sách ca làm việc."));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    const loadHubs = async () => {
      try {
        const networkHubs = await getScopedHubs();
        setHubs(networkHubs.map((hub) => ({ id: hub.id, code: hub.code, name: hub.name, status: hub.status })));
        return;
      } catch {
        // HUB_MANAGER may intentionally not have network.read. Fall back to
        // Operations' scoped workforce projection, whose hub snapshots are
        // already authorized by the backend.
      }

      try {
        const workforce = await getWorkforce(new URLSearchParams({ page: "1", pageSize: "100" }));
        const visible = new Map<string, ShiftHubOption>();
        workforce.items.forEach((member) => member.hubMemberships.forEach((membership) => {
          if (!membership.isActive) return;
          visible.set(membership.hubId, {
            id: membership.hubId,
            code: membership.hubCode || membership.hubId.slice(0, 8),
            name: membership.hubName || "Bưu cục được phân quyền",
            status: membership.hubStatus || "ACTIVE",
          });
        }));
        setHubs([...visible.values()].sort((left, right) => left.code.localeCompare(right.code)));
      } catch {
        setHubs([]);
      }
    };
    void loadHubs();
  }, []);

  const setFilters = (values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    if (!("page" in values)) params.delete("page");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`);
  };

  return (
    <div className="space-y-4">
      <CreateShiftDialog open={createOpen} hubs={hubs} onClose={() => setCreateOpen(false)} onCreated={() => void load()} />
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand"><CalendarClockIcon className="size-5" /></span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Ca vận hành</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Ca làm việc</h1>
              <p className="mt-1 text-sm text-muted-foreground">Lập ca, theo dõi danh sách ca và chấm công tại từng bưu cục.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />Làm mới</Button>
            {canManage ? <Button onClick={() => setCreateOpen(true)}><PlusIcon className="size-4" />Tạo ca</Button> : null}
          </div>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] sm:p-5">
          <label className="grid gap-1.5 text-[0.68rem] font-bold">Bưu cục<select value={hubId} onChange={(event) => setFilters({ hubId: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Tất cả bưu cục</option>{hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}</select></label>
          <label className="grid gap-1.5 text-[0.68rem] font-bold">Trạng thái<select value={status} onChange={(event) => setFilters({ status: event.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Tất cả</option><option value="SCHEDULED">Đã lên lịch</option><option value="CANCELLED">Đã hủy</option></select></label>
          <label className="grid gap-1.5 text-[0.68rem] font-bold">Từ ngày<Input type="date" value={from} onChange={(event) => setFilters({ from: event.target.value })} /></label>
          <label className="grid gap-1.5 text-[0.68rem] font-bold">Đến ngày<Input type="date" value={to} onChange={(event) => setFilters({ to: event.target.value })} /></label>
          <div className="flex items-end"><Button variant="ghost" onClick={() => { router.replace(pathname); }}><SearchIcon className="size-4" />Xóa lọc</Button></div>
        </div>
      </section>

      {error ? <Card><CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent></Card> : null}
      {!error && loading && !data ? <Card><CardContent className="grid min-h-56 place-items-center"><LoaderCircleIcon className="size-6 animate-spin text-brand" /></CardContent></Card> : null}
      {!error && data ? (
        <Card>
          <CardContent className="p-0">
            {data.items.length ? <div className="divide-y">{data.items.map((shift) => (
              <Link key={shift.id} href={`/operations/shifts/${shift.id}`} className="grid gap-3 px-4 py-4 transition hover:bg-muted/35 sm:grid-cols-[1.2fr_1fr_0.8fr_auto] sm:items-center sm:px-5">
                <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-black">{shift.name}</p><span className={`rounded-full border px-2 py-0.5 text-[0.58rem] font-black ${shiftStatusClass(shift.status)}`}>{workShiftStatusLabel(shift.status)}</span></div><p className="mt-1 font-mono text-[0.62rem] text-muted-foreground">{shift.code}</p></div>
                <div><p className="text-xs font-black">{shift.hubCode || "Bưu cục"}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">{shift.hubName || <HubName id={shift.hubId} />}</p></div>
                <div><p className="text-xs font-bold">{formatDateTime(shift.startsAt)}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">→ {formatDateTime(shift.endsAt)}</p></div>
                <div className="flex items-center gap-1.5 text-xs font-black"><UsersRoundIcon className="size-4 text-brand" />{shift.rosterCount}</div>
              </Link>
            ))}</div> : <div className="grid min-h-56 place-items-center p-6 text-center"><div><CalendarClockIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-black">Chưa có ca phù hợp</p><p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc hoặc tạo ca mới.</p></div></div>}
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground sm:px-5"><span>{data.totalCount} ca · trang {data.page}/{Math.max(1, data.totalPages)}</span><div className="flex gap-1"><Button size="icon" variant="outline" disabled={data.page <= 1} onClick={() => setFilters({ page: String(data.page - 1) })}><ChevronLeftIcon className="size-4" /></Button><Button size="icon" variant="outline" disabled={data.page >= data.totalPages} onClick={() => setFilters({ page: String(data.page + 1) })}><ChevronRightIcon className="size-4" /></Button></div></div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
