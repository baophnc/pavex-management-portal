"use client";

import { ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HubSelect, useHubScope } from "@/features/directory/hub-scope";
import { getWorkforce, getWorkShift, getWorkShifts } from "@/features/operations/api";
import type { WorkShift, WorkShiftDetail, WorkforceShiftAssignmentStatus } from "@/features/operations/contracts";
import { workforceIdentityName, workforceKindLabel, workforceShiftStatusLabel } from "@/features/operations/presentation";
import { cn } from "@/lib/utils";

const DAYS = 14;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** yyyy-mm-dd of a local date. */
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function time(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function hours(shift: WorkShift) {
  return (new Date(shift.endsAt).getTime() - new Date(shift.startsAt).getTime()) / 3_600_000;
}

/** The days a shift touches, so a night shift shows on both days. */
function shiftDays(shift: WorkShift) {
  const days: string[] = [];
  const end = new Date(new Date(shift.endsAt).getTime() - 1);
  for (let day = new Date(shift.startsAt); dayKey(day) <= dayKey(end); day = addDays(day, 1)) days.push(dayKey(day));
  return days;
}

const rosterTone: Record<WorkforceShiftAssignmentStatus, string> = {
  CHECKED_IN: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SCHEDULED: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  CHECKED_OUT: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  ABSENT: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  CANCELLED: "border-slate-500/20 text-muted-foreground line-through",
};

/**
 * Shifts of one hub as two weeks of days: each day says how many shifts and people it has; tap a
 * day to see its shifts and who is in, not yet in, or absent.
 */
export function ShiftCalendar({ refreshKey }: { refreshKey: number }) {
  const scope = useHubScope();
  const [hubId, setHubId] = useState("");
  const activeHubId = hubId || scope.initialHubId || scope.hubs[0]?.id || "";
  const [start, setStart] = useState(() => mondayOf(new Date()));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [shifts, setShifts] = useState<WorkShift[] | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [details, setDetails] = useState<Record<string, WorkShiftDetail>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeHubId) return;
    let active = true;
    const params = new URLSearchParams({
      hubId: activeHubId,
      from: start.toISOString(),
      to: addDays(start, DAYS).toISOString(),
      page: "1",
      pageSize: "200",
    });
    Promise.all([
      getWorkShifts(params),
      getWorkforce(new URLSearchParams({ hubId: activeHubId, page: "1", pageSize: "100" })).catch(() => null),
    ])
      .then(([page, workforce]) => {
        if (!active) return;
        setShifts(page.items.filter((shift) => shift.status === "SCHEDULED"));
        setNames(new Map((workforce?.items ?? []).map((member) => [member.id, workforceIdentityName(member.identity ?? {})])));
        setDetails({});
        setError(null);
      })
      .catch(() => {
        if (active) setError("Không tải được ca làm việc của bưu cục này.");
      });
    return () => {
      active = false;
    };
  }, [activeHubId, start, refreshKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, WorkShift[]>();
    for (const shift of shifts ?? []) {
      for (const day of shiftDays(shift)) map.set(day, [...(map.get(day) ?? []), shift]);
    }
    return map;
  }, [shifts]);

  const dayShifts = useMemo(
    () => [...(byDay.get(selected) ?? [])].sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    [byDay, selected],
  );

  useEffect(() => {
    const missing = dayShifts.filter((shift) => !details[shift.id]);
    if (missing.length === 0) return;
    let active = true;
    void Promise.all(missing.map((shift) => getWorkShift(shift.id).catch(() => null))).then((loaded) => {
      if (!active) return;
      setDetails((current) => {
        const next = { ...current };
        for (const detail of loaded) if (detail) next[detail.shift.id] = detail;
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, [dayShifts, details]);

  const days = Array.from({ length: DAYS }, (_, index) => addDays(start, index));
  const today = dayKey(new Date());

  return (
    <div className="grid gap-3">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <HubSelect scope={scope} value={activeHubId} onChange={(next) => { setHubId(next); setShifts(null); }} className="w-auto min-w-64" />
        <div className="ml-auto flex items-center gap-1">
          <Button size="icon" variant="outline" aria-label="Hai tuần trước" onClick={() => setStart((value) => addDays(value, -7))}><ChevronLeftIcon className="size-4" /></Button>
          <Button variant="outline" onClick={() => { setStart(mondayOf(new Date())); setSelected(today); }}>Hôm nay</Button>
          <Button size="icon" variant="outline" aria-label="Tuần sau" onClick={() => setStart((value) => addDays(value, 7))}><ChevronRightIcon className="size-4" /></Button>
        </div>
      </Card>

      {scope.error || error ? <p className="rounded border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-brand">{scope.error ?? error}</p> : null}

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = dayKey(day);
          const list = byDay.get(key) ?? [];
          const people = list.reduce((sum, shift) => sum + shift.rosterCount, 0);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={cn(
                "rounded-xl border bg-card p-2 text-left transition hover:border-brand/40",
                key === selected && "border-brand ring-2 ring-brand/15",
                key === today && "bg-brand/[0.04]",
              )}
            >
              <p className={cn("text-[0.62rem] font-black uppercase", key === today ? "text-brand" : "text-muted-foreground")}>
                {WEEKDAYS[day.getDay()]}{key === today ? " · Hôm nay" : ""}
              </p>
              <p className="text-lg font-black">{day.getDate()}/{day.getMonth() + 1}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                {shifts === null ? "…" : list.length ? `${list.length} ca · ${people} người` : "Không có ca"}
              </p>
            </button>
          );
        })}
      </div>

      <Card className="divide-y">
        <div className="p-4">
          <p className="text-sm font-black">
            {WEEKDAYS[new Date(`${selected}T00:00:00`).getDay()]} {selected.split("-").reverse().join("/")}
          </p>
          <p className="text-xs text-muted-foreground">Ai được xếp ca, ai đã vào ca và ai vắng trong ngày.</p>
        </div>
        {shifts === null ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" /> Đang tải…</p>
        ) : dayShifts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Ngày này bưu cục không có ca nào.</p>
        ) : (
          dayShifts.map((shift) => {
            const roster = (details[shift.id]?.roster ?? []).filter((entry) => entry.status !== "CANCELLED");
            const count = (status: WorkforceShiftAssignmentStatus) => roster.filter((entry) => entry.status === status).length;
            return (
              <div key={shift.id} className="grid gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black">{shift.name}</p>
                    <p className="text-xs text-muted-foreground">{hours(shift) >= 24 ? "Cả ngày (00:00 – 24:00)" : `${time(shift.startsAt)} – ${time(shift.endsAt)}`}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-bold">
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">{count("CHECKED_IN")} đang trong ca</span>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300">{count("SCHEDULED")} chưa vào</span>
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-300">{count("ABSENT")} vắng</span>
                    <Link href={`/operations/shifts/${shift.id}`} className="text-brand hover:underline">Quản lý ca →</Link>
                  </div>
                </div>
                {details[shift.id] ? (
                  roster.length ? (
                    <div className="flex flex-wrap gap-2">
                      {roster.map((entry) => (
                        <span key={entry.id} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs", rosterTone[entry.status])}>
                          <UsersRoundIcon className="size-3.5" />
                          <b>{names.get(entry.workforceMemberId) ?? entry.employeeCode}</b>
                          <span className="opacity-80">· {workforceKindLabel(entry.kind)} · {workforceShiftStatusLabel(entry.status)}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Chưa xếp ai vào ca này.</p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">Đang tải danh sách…</p>
                )}
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
