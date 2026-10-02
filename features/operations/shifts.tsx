"use client";

import { CalendarClockIcon, LoaderCircleIcon, PlusIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { createWorkShift, getWorkforce } from "@/features/operations/api";
import type { WorkShift } from "@/features/operations/contracts";
import { getScopedHubs } from "@/features/operations/hub-scope";
import { ShiftCalendar } from "@/features/operations/shift-calendar";
import { ApiError } from "@/lib/api/client";

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
  const { hasPermission } = useAccess();
  const canManage = hasPermission("operations.workforce.manage") || hasPermission("operations.hub.manage");
  const [hubs, setHubs] = useState<ShiftHubOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0);

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

  return (
    <div className="space-y-4">
      <CreateShiftDialog open={createOpen} hubs={hubs} onClose={() => setCreateOpen(false)} onCreated={() => setCalendarKey((value) => value + 1)} />
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand"><CalendarClockIcon className="size-5" /></span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Ca vận hành</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Ca làm việc</h1>
              <p className="mt-1 text-sm text-muted-foreground">Lịch ca từng ngày của bưu cục. Bấm vào một ngày để xem ai trong ca, ai chưa vào, ai vắng.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCalendarKey((value) => value + 1)}><RefreshCwIcon className="size-4" />Làm mới</Button>
            {canManage ? <Button onClick={() => setCreateOpen(true)}><PlusIcon className="size-4" />Tạo ca</Button> : null}
          </div>
        </div>
      </section>

      <ShiftCalendar refreshKey={calendarKey} />
    </div>
  );
}
