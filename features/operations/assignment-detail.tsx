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
import type { ReactNode } from "react";
import { toast } from "sonner";

import { REASONS, ReasonPicker } from "@/components/forms/reason-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  WorkforceMemberKind,
} from "@/features/operations/contracts";
import {
  operationalAssignmentEventLabel,
  operationalAssignmentStatusLabel,
  operationalAssignmentTypeLabel,
  workforceIdentityName,
  workforceKindLabel,
} from "@/features/operations/presentation";
import { TrackingCode, UserName } from "@/features/directory/names";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/** Hub managers take hub handling where there is no clerk, as Operations allows. */
function eligibleKinds(requiredKind: WorkforceMemberKind): WorkforceMemberKind[] {
  return requiredKind === "WAREHOUSE_OPERATOR" ? ["WAREHOUSE_OPERATOR", "HUB_MANAGER"] : [requiredKind];
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
      if (!found) throw new Error("Phân công không nằm trong phạm vi truy cập hiện tại.");

      const [eventPage, workforcePages, visibleHubs] = await Promise.all([
        getOperationalAssignmentEvents(assignmentId, 1, 100),
        Promise.all(
          eligibleKinds(found.requiredKind).map((kind) =>
            getWorkforce(
              new URLSearchParams({
                page: "1",
                pageSize: "100",
                hubId: found.hubId,
                kind,
                status: "ACTIVE",
              }),
            ),
          ),
        ),
        getScopedHubs().catch(() => []),
      ]);

      setAssignment(found);
      setEvents(eventPage.items);
      setWorkforce(workforcePages.flatMap((page) => page.items));
      setHubs(visibleHubs);
      setSelectedWorker(found.assigneeWorkforceMemberId ?? "");
    } catch (cause) {
      const message = apiMessage(cause, cause instanceof Error ? cause.message : "Không thể tải phân công.");
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
        assignment !== null &&
        eligibleKinds(assignment.requiredKind).includes(member.kind) &&
        member.identityAccessValid &&
        atHub &&
        (member.availability?.remainingCapacity ?? 0) > 0
      );
    }),
    [assignment, workforce],
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
      toast.success("Đã giao việc.");
      await load();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể giao việc."));
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
      toast.success("Đã hủy phân công.");
      await load();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể hủy phân công."));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !assignment) {
    return <div className="grid min-h-72 place-items-center text-sm text-muted-foreground"><LoaderCircleIcon className="mr-2 inline size-4 animate-spin" />Đang tải phân công...</div>;
  }

  if (error || !assignment) {
    return (
      <div className="space-y-3">
        <Link href="/operations/assignments" className="inline-flex items-center gap-2 text-xs font-black text-brand hover:underline">
          <ArrowLeftIcon className="size-4" /> Quay lại danh sách phân công
        </Link>
        <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangleIcon className="size-4 shrink-0" /> {error ?? "Không tìm thấy phân công."}
        </div>
      </div>
    );
  }

  const hub = hubs.find((item) => item.id === assignment.hubId);
  const assignedMember = workforce.find((item) => item.id === assignment.assigneeWorkforceMemberId);
  const assigningUser = workforce.find((item) => item.userId === assignment.assignedByUserId);
  const memberName = (id: string) => {
    const member = workforce.find((item) => item.id === id);
    return member ? workforceIdentityName(member.identity ?? {}) : "Nhân viên khác";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/operations/assignments" className="inline-flex items-center gap-2 text-xs font-black text-brand hover:underline">
          <ArrowLeftIcon className="size-4" /> Danh sách việc
        </Link>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || saving}>
          <RefreshCwIcon className="size-4" /> Làm mới
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Chi tiết việc</p>
            <h1 className="mt-1 text-xl font-black">{operationalAssignmentTypeLabel(assignment.type)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Vận đơn <TrackingCode id={assignment.shipmentId} /> · cần {workforceKindLabel(assignment.requiredKind).toLowerCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black">{operationalAssignmentStatusLabel(assignment.status)}</p>
            <p className="mt-1 text-[0.68rem] text-muted-foreground">Ưu tiên {assignment.priority}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Bưu cục" value={hub ? `${hub.code} · ${hub.name}` : "Bưu cục trong phạm vi"} />
              <Info label="Thứ tự thực thi" value={String(assignment.sequence)} />
              <Info label="Nhân sự được phân công" value={assignedMember ? `${assignedMember.employeeCode} · ${workforceIdentityName(assignedMember.identity ?? {})}` : "Chưa phân công"} />
              <Info label="Người phân công" value={assigningUser ? workforceIdentityName(assigningUser.identity ?? {}) : assignment.assignedByUserId ? <UserName id={assignment.assignedByUserId} /> : assignment.assignedAt ? "Hệ thống tự phân" : "—"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Time label="Giao việc" value={assignment.assignedAt} />
              <Time label="Nhận việc" value={assignment.acceptedAt} />
              <Time label="Bắt đầu" value={assignment.startedAt} />
              <Time label="Hoàn tất" value={assignment.completedAt} />
              <Time label="Đã hủy" value={assignment.cancelledAt} />
              <Time label="Cập nhật" value={assignment.updatedAt} />
            </div>
            {assignment.resolutionNote ? (
              <div className="rounded-lg border bg-muted/25 p-3 text-xs leading-5">
                <p className="font-black">Kết quả xử lý</p>
                <p className="mt-1 text-muted-foreground">{assignment.resolutionNote}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-black">Giao cho nhân viên</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Danh sách đã lọc theo bưu cục, loại nhân sự, quyền tài khoản và số việc còn nhận được. Hệ thống vẫn kiểm tra lại khi bạn xác nhận.
                </p>
              </div>
              <select
                value={selectedWorker}
                onChange={(event) => setSelectedWorker(event.target.value)}
                disabled={!canAssign || saving}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Chọn nhân viên</option>
                {eligibleWorkers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.employeeCode} · {workforceIdentityName(member.identity ?? {})}
                    {member.kind === assignment.requiredKind ? "" : ` (${workforceKindLabel(member.kind)})`} · còn {member.availability?.remainingCapacity ?? 0}
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
                <p className="text-[0.68rem] text-amber-700 dark:text-amber-300">Hiện không có nhân viên nào còn nhận thêm việc được.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-black">Hủy phân công</p>
                <p className="mt-1 text-xs text-muted-foreground">Chỉ huỷ được việc chưa hoàn tất. Việc bị huỷ sẽ không giao cho ai nữa.</p>
              </div>
              <ReasonPicker reasons={REASONS.assignmentCancel} value={cancelReason} onChange={setCancelReason} placeholder="Lý do hủy..." disabled={!canCancel || saving} />
              <Button variant="destructive" onClick={() => void cancel()} disabled={!canCancel || saving || !cancelReason.trim()}>
                <BanIcon className="size-4" /> Huỷ việc này
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black">Diễn biến</p>
              <p className="mt-1 text-xs text-muted-foreground">Lịch sử điều phối, không thể chỉnh sửa.</p>
            </div>
            <span className="text-xs font-black text-brand">{events.length} mốc</span>
          </div>
          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Chưa có diễn biến.</p>
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
                    <p>Nhân viên: <span className="font-bold text-foreground">{event.workforceMemberId ? memberName(event.workforceMemberId) : "—"}</span></p>
                    <p>Người thao tác: <span className="font-bold text-foreground">{event.actorUserId ? <UserName id={event.actorUserId} /> : "Hệ thống tự động"}</span></p>
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

function Info({ label, value }: { label: string; value: ReactNode }) {
  const body = <p className="mt-1 break-words text-xs font-semibold">{value}</p>;
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
