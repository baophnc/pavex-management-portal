"use client";

import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  BanIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import {
  assignOperationalAssignment,
  cancelOperationalAssignment,
  getOperationalAssignmentEvents,
  getOperationalAssignments,
  getWorkforce,
} from "@/features/operations/api";
import type {
  OperationalAssignment,
  OperationalAssignmentEvent,
  WorkforceMember,
} from "@/features/operations/contracts";
import {
  operationalAssignmentEventLabel,
  operationalAssignmentStatusLabel,
  operationalAssignmentTypeLabel,
  workforceIdentityName,
  workforceKindLabel,
} from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function OperationsAssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const [assignment, setAssignment] = useState<OperationalAssignment | null>(null);
  const [events, setEvents] = useState<OperationalAssignmentEvent[]>([]);
  const [workforce, setWorkforce] = useState<WorkforceMember[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candidates = await getOperationalAssignments(new URLSearchParams());
      const found = candidates.find((item) => item.id === assignmentId) ?? null;
      if (!found) throw new Error("Assignment không nằm trong phạm vi truy cập hiện tại.");

      const [eventPage, workforcePage, visibleHubs] = await Promise.all([
        getOperationalAssignmentEvents(assignmentId, 1, 100),
        getWorkforce(
          new URLSearchParams({
            page: "1",
            pageSize: "100",
            hubId: found.hubId,
            kind: found.requiredKind,
            status: "ACTIVE",
          }),
        ),
        getScopedHubs().catch(() => []),
      ]);

      setAssignment(found);
      setEvents(eventPage.items);
      setWorkforce(workforcePage.items);
      setHubs(visibleHubs);
      setSelectedWorker(found.assigneeWorkforceMemberId ?? "");
    } catch (cause) {
      const message = apiMessage(cause, cause instanceof Error ? cause.message : "Không thể tải assignment.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const eligibleWorkers = useMemo(
    () => workforce.filter((member) => {
      const atHub = member.hubMemberships.some(
        (membership) => membership.isActive && membership.hubId === assignment?.hubId,
      );
      return (
        member.status === "ACTIVE" &&
        member.kind === assignment?.requiredKind &&
        member.identityAccessValid &&
        atHub &&
        (member.availability?.remainingCapacity ?? 0) > 0
      );
    }),
    [assignment?.hubId, assignment?.requiredKind, workforce],
  );

  const selectedMember = workforce.find((item) => item.id === selectedWorker) ?? null;
  const canAssign = assignment && ["READY", "PENDING", "ASSIGNED", "REJECTED"].includes(assignment.status);
  const canCancel = assignment && assignment.status !== "COMPLETED" && assignment.status !== "CANCELLED";

  const assign = async () => {
    if (!assignment || !selectedWorker) return;
    setSaving(true);
    try {
      const updated = await assignOperationalAssignment(assignment.id, selectedWorker);
      setAssignment(updated);
      toast.success("Đã phân công assignment.");
      await load();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể phân công assignment."));
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    if (!assignment || !cancelReason.trim()) return;
    setSaving(true);
    try {
      const updated = await cancelOperationalAssignment(assignment.id, cancelReason.trim());
      setAssignment(updated);
      setCancelReason("");
      toast.success("Đã hủy assignment.");
      await load();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể hủy assignment."));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !assignment) {
    return <div className="grid min-h-72 place-items-center text-sm text-muted-foreground"><LoaderCircleIcon className="mr-2 inline size-4 animate-spin" />Đang tải assignment...</div>;
  }

  if (error || !assignment) {
    return (
      <div className="space-y-3">
        <Link href="/operations/assignments" className="inline-flex items-center gap-2 text-xs font-black text-brand hover:underline">
          <ArrowLeftIcon className="size-4" /> Quay lại assignments
        </Link>
        <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangleIcon className="size-4 shrink-0" /> {error ?? "Không tìm thấy assignment."}
        </div>
      </div>
    );
  }

  const hub = hubs.find((item) => item.id === assignment.hubId);
  const assignedMember = workforce.find((item) => item.id === assignment.assigneeWorkforceMemberId);
  const assigningUser = workforce.find((item) => item.userId === assignment.assignedByUserId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/operations/assignments" className="inline-flex items-center gap-2 text-xs font-black text-brand hover:underline">
          <ArrowLeftIcon className="size-4" /> Assignments
        </Link>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCwIcon className="size-4" /> Làm mới
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Assignment detail</p>
            <h1 className="mt-1 text-xl font-black">{assignment.code}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{operationalAssignmentTypeLabel(assignment.type)} · {workforceKindLabel(assignment.requiredKind)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black">{operationalAssignmentStatusLabel(assignment.status)}</p>
            <p className="mt-1 text-[0.68rem] text-muted-foreground">Priority {assignment.priority}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Mã nội bộ vận đơn" value={shortId(assignment.shipmentId)} />
              <Info label="Bưu cục" value={hub ? `${hub.code} · ${hub.name}` : "Bưu cục trong phạm vi"} />
              <Info label="Chặng tuyến nội bộ" value={shortId(assignment.routeLegId)} />
              <Info label="Thứ tự thực thi" value={String(assignment.sequence)} />
              <Info label="Nhân sự được phân công" value={assignedMember ? `${assignedMember.employeeCode} · ${workforceIdentityName(assignedMember.identity ?? {})}` : "Chưa phân công"} />
              <Info label="Người phân công" value={assigningUser ? workforceIdentityName(assigningUser.identity ?? {}) : assignment.assignedByUserId ? "Người điều phối được phân quyền" : "—"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Time label="Assigned" value={assignment.assignedAt} />
              <Time label="Accepted" value={assignment.acceptedAt} />
              <Time label="Started" value={assignment.startedAt} />
              <Time label="Completed" value={assignment.completedAt} />
              <Time label="Cancelled" value={assignment.cancelledAt} />
              <Time label="Updated" value={assignment.updatedAt} />
            </div>
            {assignment.resolutionNote ? (
              <div className="rounded-lg border bg-muted/25 p-3 text-xs leading-5">
                <p className="font-black">Resolution</p>
                <p className="mt-1 text-muted-foreground">{assignment.resolutionNote}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-black">Phân công worker</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Danh sách được lọc theo hub, kind, Identity access và remaining capacity. Backend vẫn xác thực lại khi submit.
                </p>
              </div>
              <select
                value={selectedWorker}
                onChange={(event) => setSelectedWorker(event.target.value)}
                disabled={!canAssign || saving}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Chọn workforce member</option>
                {eligibleWorkers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.employeeCode} · {workforceIdentityName(member.identity ?? {})} · còn {member.availability?.remainingCapacity ?? 0}
                  </option>
                ))}
              </select>
              {selectedMember ? (
                <p className="text-[0.68rem] text-muted-foreground">
                  {selectedMember.identity?.email ?? selectedMember.userId} · load {selectedMember.availability?.activeAssignments ?? 0}/{selectedMember.availability?.maxConcurrentAssignments ?? 0}
                </p>
              ) : null}
              <Button onClick={() => void assign()} disabled={!canAssign || saving || !selectedWorker}>
                {saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <UserRoundCheckIcon className="size-4" />}
                {assignment.status === "ASSIGNED" ? "Phân công lại" : "Phân công"}
              </Button>
              {canAssign && eligibleWorkers.length === 0 ? (
                <p className="text-[0.68rem] text-amber-700 dark:text-amber-300">Không có candidate còn capacity trong projection hiện tại.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-black">Hủy assignment</p>
                <p className="mt-1 text-xs text-muted-foreground">Completed assignment không thể hủy.</p>
              </div>
              <Input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Lý do hủy..." disabled={!canCancel || saving} />
              <Button variant="destructive" onClick={() => void cancel()} disabled={!canCancel || saving || !cancelReason.trim()}>
                <BanIcon className="size-4" /> Hủy assignment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black">Event timeline</p>
              <p className="mt-1 text-xs text-muted-foreground">Immutable dispatch history từ Operations event log.</p>
            </div>
            <span className="text-xs font-black text-brand">{events.length} event</span>
          </div>
          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có event.</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div key={event.eventId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black">{operationalAssignmentEventLabel(event.eventType)}</p>
                      <p className="mt-1 text-[0.68rem] text-muted-foreground">
                        {event.previousStatus ? `${operationalAssignmentStatusLabel(event.previousStatus)} → ` : ""}{operationalAssignmentStatusLabel(event.newStatus)}
                      </p>
                    </div>
                    <p className="text-[0.65rem] text-muted-foreground">{formatDateTime(event.occurredAt)}</p>
                  </div>
                  <div className="mt-2 grid gap-1 text-[0.65rem] text-muted-foreground sm:grid-cols-2">
                    <p>Worker: <span className="font-mono">{shortId(event.workforceMemberId)}</span></p>
                    <p>Actor: <span className="font-mono">{shortId(event.actorUserId)}</span></p>
                  </div>
                  {event.reason ? <p className="mt-2 text-xs leading-5">{event.reason}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const body = <p className="mt-1 break-all font-mono text-xs">{value}</p>;
  return (
    <div className="rounded-lg border bg-muted/15 p-3">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      {body}
    </div>
  );
}

function Time({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs">{value ? formatDateTime(value) : "—"}</p>
    </div>
  );
}
