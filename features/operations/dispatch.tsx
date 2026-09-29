"use client";

import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  discardOperationsDeadLetter,
  getOperationalAssignments,
  getOperationsDeadLetter,
  getOperationsDeadLetters,
  getOperationsDispatchEvents,
  getOperationsOutboxSummary,
  getWorkforce,
  retryOperationsDeadLetter,
} from "@/features/operations/api";
import {
  operationalAssignmentEventTypes,
  type OperationalAssignmentEventPage,
  type OperationalAssignmentEventType,
  type OperationsOutboxDeadLetter,
  type OperationsOutboxDeadLetterPage,
  type OperationsOutboxSummary,
} from "@/features/operations/contracts";
import {
  operationalAssignmentEventLabel,
  operationalAssignmentStatusLabel,
  workforceIdentityName,
} from "@/features/operations/presentation";
import { getAdminShipment, getAdminShipments } from "@/features/shipments/api";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/utils";

const EVENT_PAGE_SIZE = 50;
const DEAD_PAGE_SIZE = 20;

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function OperationsDispatch() {
  const { hasPermission, hasAnyPermission } = useAccess();
  const canManageOutbox = hasPermission("operations.assignments.manage");
  const canReadGlobalShipments = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const eventPage = Math.max(1, Number(searchParams.get("page") || "1") || 1);
  const assignmentCode = searchParams.get("assignmentCode") ?? "";
  const trackingCode = searchParams.get("trackingCode") ?? "";
  const eventType = (searchParams.get("eventType") ?? "") as OperationalAssignmentEventType | "";

  const [assignmentDraft, setAssignmentDraft] = useState(assignmentCode);
  const [shipmentDraft, setShipmentDraft] = useState(trackingCode);
  const [assignmentLabels, setAssignmentLabels] = useState<Record<string, string>>({});
  const [shipmentLabels, setShipmentLabels] = useState<Record<string, string>>({});
  const [workerLabels, setWorkerLabels] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<OperationalAssignmentEventPage | null>(null);
  const [summary, setSummary] = useState<OperationsOutboxSummary | null>(null);
  const [deadLetters, setDeadLetters] = useState<OperationsOutboxDeadLetterPage | null>(null);
  const [deadPage, setDeadPage] = useState(1);
  const [selected, setSelected] = useState<OperationsOutboxDeadLetter | null>(null);
  const [discardReason, setDiscardReason] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingOutbox, setLoadingOutbox] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => setAssignmentDraft(assignmentCode), 0);
    return () => window.clearTimeout(task);
  }, [assignmentCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setShipmentDraft(trackingCode), 0);
    return () => window.clearTimeout(task);
  }, [trackingCode]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError(null);
    try {
      const [assignments, shipmentPage, workforcePage] = await Promise.all([
        getOperationalAssignments(new URLSearchParams()),
        canReadGlobalShipments
          ? getAdminShipments(new URLSearchParams({ limit: "100" })).catch(() => null)
          : Promise.resolve(null),
        getWorkforce(new URLSearchParams({ page: "1", pageSize: "100" })).catch(() => null),
      ]);
      const params = new URLSearchParams({ page: String(eventPage), pageSize: String(EVENT_PAGE_SIZE) });
      if (assignmentCode) {
        const assignment = assignments.find((item) => item.code === assignmentCode.trim().toUpperCase());
        if (!assignment) throw new Error("Không tìm thấy mã assignment trong phạm vi truy cập.");
        params.set("assignmentId", assignment.id);
      }
      const nextShipmentLabels = Object.fromEntries(
        (shipmentPage?.items ?? []).map((shipment) => [shipment.id, shipment.trackingCode]),
      );
      if (trackingCode && canReadGlobalShipments) {
        const normalizedTrackingCode = trackingCode.trim().toUpperCase();
        const knownShipment = shipmentPage?.items.find(
          (shipment) => shipment.trackingCode === normalizedTrackingCode,
        );
        const shipment = knownShipment ?? await getAdminShipment(normalizedTrackingCode);
        params.set("shipmentId", shipment.id);
        nextShipmentLabels[shipment.id] = "shipment" in shipment
          ? shipment.shipment.trackingCode
          : shipment.trackingCode;
      }
      if (eventType) params.set("eventType", eventType);
      setAssignmentLabels(Object.fromEntries(assignments.map((assignment) => [assignment.id, assignment.code])));
      setShipmentLabels(nextShipmentLabels);
      setWorkerLabels(Object.fromEntries((workforcePage?.items ?? []).map((member) => [
        member.id,
        `${workforceIdentityName(member.identity ?? {})} · ${member.employeeCode}`,
      ])));
      setEvents(await getOperationsDispatchEvents(params));
    } catch (cause) {
      const message = apiMessage(cause, "Không thể tải dispatch events.");
      setError(message);
      toast.error(message);
    } finally {
      setLoadingEvents(false);
    }
  }, [assignmentCode, canReadGlobalShipments, eventPage, eventType, trackingCode]);

  const loadOutbox = useCallback(async () => {
    if (!canManageOutbox) return;
    setLoadingOutbox(true);
    try {
      const [nextSummary, nextDeadLetters] = await Promise.all([
        getOperationsOutboxSummary(),
        getOperationsDeadLetters(deadPage, DEAD_PAGE_SIZE),
      ]);
      setSummary(nextSummary);
      setDeadLetters(nextDeadLetters);
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể tải Operations outbox."));
    } finally {
      setLoadingOutbox(false);
    }
  }, [canManageOutbox, deadPage]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadEvents(), 0);
    return () => window.clearTimeout(task);
  }, [loadEvents]);

  useEffect(() => {
    const task = window.setTimeout(() => void loadOutbox(), 0);
    return () => window.clearTimeout(task);
  }, [loadOutbox]);

  const updateFilters = (next: Record<string, string>) => {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    });
    if (!("page" in next)) query.set("page", "1");
    const serialized = query.toString();
    router.push(serialized ? `${pathname}?${serialized}` : pathname);
  };

  const openDeadLetter = async (id: string) => {
    setMutating(true);
    try {
      setSelected(await getOperationsDeadLetter(id));
      setDiscardReason("");
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể tải dead-letter message."));
    } finally {
      setMutating(false);
    }
  };

  const retry = async () => {
    if (!selected) return;
    setMutating(true);
    try {
      await retryOperationsDeadLetter(selected.messageId);
      toast.success("Đã đưa message về hàng đợi retry.");
      setSelected(null);
      await loadOutbox();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể retry dead-letter."));
    } finally {
      setMutating(false);
    }
  };

  const discard = async () => {
    if (!selected || !discardReason.trim()) return;
    setMutating(true);
    try {
      await discardOperationsDeadLetter(selected.messageId, discardReason.trim());
      toast.success("Đã discard dead-letter message.");
      setSelected(null);
      setDiscardReason("");
      await loadOutbox();
    } catch (cause) {
      toast.error(apiMessage(cause, "Không thể discard dead-letter."));
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Dispatch reliability</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Dispatch & outbox</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Event feed được scope theo quyền hub/global. Dead-letter outbox là reliability tooling toàn hệ thống và chỉ global assignment manager được thao tác.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => { void loadEvents(); void loadOutbox(); }}
            disabled={loadingEvents || loadingOutbox}
          >
            <RefreshCwIcon className="size-4" /> Làm mới
          </Button>
        </div>
      </section>

      {canManageOutbox ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Pending outbox" value={summary?.pendingCount} loading={loadingOutbox} />
          <SummaryCard label="Dead-letter" value={summary?.deadLetteredCount} loading={loadingOutbox} danger />
          <SummaryCard label="Đã discard" value={summary?.discardedCount} loading={loadingOutbox} />
          <Card>
            <CardContent>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-muted-foreground">Oldest pending</p>
              <p className="mt-2 text-sm font-black">{summary?.oldestPendingAgeSeconds != null ? `${summary.oldestPendingAgeSeconds}s` : "—"}</p>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">{summary?.oldestPendingOccurredAt ? formatDateTime(summary.oldestPendingOccurredAt) : "Không có pending message"}</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
          Bạn đang ở hub-scoped access. Dispatch event vẫn hiển thị theo hub được backend cấp; outbox/dead-letter bị ẩn vì cần <code>operations.assignments.manage</code> global.
        </div>
      )}

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlertIcon className="size-4 text-brand" />
            <p className="text-sm font-black">Dispatch events</p>
          </div>
          <div className={canReadGlobalShipments
            ? "grid gap-2 lg:grid-cols-[1fr_1fr_220px_auto]"
            : "grid gap-2 lg:grid-cols-[1fr_220px_auto]"}
          >
            <Input value={assignmentDraft} onChange={(event) => setAssignmentDraft(event.target.value)} placeholder="Mã assignment, ví dụ OA-..." className="font-mono text-xs uppercase" />
            {canReadGlobalShipments ? (
              <Input value={shipmentDraft} onChange={(event) => setShipmentDraft(event.target.value)} placeholder="Mã vận đơn, ví dụ PAVEX..." className="font-mono text-xs uppercase" />
            ) : null}
            <select
              value={eventType}
              onChange={(event) => updateFilters({ eventType: event.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Tất cả event</option>
              {operationalAssignmentEventTypes.map((item) => <option key={item} value={item}>{operationalAssignmentEventLabel(item)}</option>)}
            </select>
            <Button onClick={() => updateFilters({
              assignmentCode: assignmentDraft.toUpperCase(),
              trackingCode: canReadGlobalShipments ? shipmentDraft.toUpperCase() : "",
            })}>
              <SearchIcon className="size-4" /> Lọc
            </Button>
          </div>

          {error ? (
            <div className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangleIcon className="size-4 shrink-0" /> {error}
            </div>
          ) : null}

          {loadingEvents ? (
            <div className="grid min-h-40 place-items-center text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" /></div>
          ) : !events?.items.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Không có dispatch event phù hợp.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {events.items.map((event) => (
                <div key={event.eventId} className="grid gap-2 px-3 py-3 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <p className="text-xs font-black">{operationalAssignmentEventLabel(event.eventType)}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      {event.previousStatus ? `${operationalAssignmentStatusLabel(event.previousStatus)} → ` : ""}{operationalAssignmentStatusLabel(event.newStatus)}
                    </p>
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground">
                    <p>Assignment <span className="font-mono">{assignmentLabels[event.assignmentId] || shortId(event.assignmentId)}</span></p>
                    <p className="mt-1">Vận đơn <span className="font-mono">{shipmentLabels[event.shipmentId] || shortId(event.shipmentId)}</span></p>
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground">
                    <p>Nhân sự <span>{event.workforceMemberId ? workerLabels[event.workforceMemberId] || "Ngoài danh sách hiện tại" : "—"}</span></p>
                    <p className="mt-1">Actor <span className="font-mono">{shortId(event.actorUserId)}</span></p>
                  </div>
                  <div className="text-right text-[0.65rem] text-muted-foreground">
                    <p>{formatDateTime(event.occurredAt)}</p>
                    {event.reason ? <p className="mt-1 max-w-72 truncate" title={event.reason}>{event.reason}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {events && events.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">Trang {events.page}/{events.totalPages} · {events.total} event</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={events.page <= 1} onClick={() => updateFilters({ page: String(events.page - 1) })}><ChevronLeftIcon className="size-4" /></Button>
                <Button size="sm" variant="outline" disabled={events.page >= events.totalPages} onClick={() => updateFilters({ page: String(events.page + 1) })}><ChevronRightIcon className="size-4" /></Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canManageOutbox ? (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-brand" />
                <div>
                  <p className="text-sm font-black">Dead-letter outbox</p>
                  <p className="mt-1 text-xs text-muted-foreground">Mỗi lần gửi lại hoặc bỏ qua đều ghi lại người thao tác và không bị xử lý trùng.</p>
                </div>
              </div>
              {loadingOutbox ? <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" /> : null}
            </div>

            {!deadLetters?.items.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Không có dead-letter message.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {deadLetters.items.map((item) => (
                  <button
                    type="button"
                    key={item.messageId}
                    onClick={() => void openDeadLetter(item.messageId)}
                    className="grid w-full gap-2 px-3 py-3 text-left transition hover:bg-muted/35 lg:grid-cols-[1.2fr_1fr_0.8fr_auto] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black">{item.eventType}</p>
                      <p className="mt-1 font-mono text-[0.62rem] text-muted-foreground">{item.messageId}</p>
                    </div>
                    <div className="text-[0.65rem] text-muted-foreground">
                      <p>{item.aggregateType}</p>
                      <p className="mt-1 font-mono">{shortId(item.aggregateId)}</p>
                    </div>
                    <div className="text-[0.65rem]">
                      <p className="font-black text-destructive">{item.attemptCount} attempts</p>
                      <p className="mt-1 text-muted-foreground">{formatDateTime(item.deadLetteredAt)}</p>
                    </div>
                    <p className="text-right text-[0.68rem] font-black text-brand">Chi tiết →</p>
                  </button>
                ))}
              </div>
            )}

            {deadLetters && deadLetters.totalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">Trang {deadLetters.page}/{deadLetters.totalPages} · {deadLetters.total} message</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={deadPage <= 1} onClick={() => setDeadPage((value) => Math.max(1, value - 1))}><ChevronLeftIcon className="size-4" /></Button>
                  <Button size="sm" variant="outline" disabled={deadPage >= deadLetters.totalPages} onClick={() => setDeadPage((value) => value + 1)}><ChevronRightIcon className="size-4" /></Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl border bg-card shadow-2xl">
            <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-destructive">Dead-letter</p>
                <h2 className="mt-1 text-lg font-black">{selected.eventType}</h2>
                <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{selected.messageId}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelected(null)} disabled={mutating}><XIcon className="size-4" /></Button>
            </header>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Fact label="Aggregate" value={`${selected.aggregateType} · ${selected.aggregateId}`} />
                <Fact label="Attempts" value={String(selected.attemptCount)} />
                <Fact label="Occurred" value={formatDateTime(selected.occurredAt)} />
                <Fact label="Dead-lettered" value={formatDateTime(selected.deadLetteredAt)} />
              </div>
              {selected.lastError ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  <p className="text-xs font-black text-destructive">Last error</p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[0.68rem] leading-5">{selected.lastError}</pre>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-black">Payload</p>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border bg-muted/20 p-3 text-[0.65rem] leading-5">{prettyPayload(selected.payload)}</pre>
              </div>
              <label className="grid gap-2 text-xs font-black">
                Lý do discard
                <Input value={discardReason} onChange={(event) => setDiscardReason(event.target.value)} placeholder="Bắt buộc khi discard..." disabled={mutating} />
              </label>
            </div>
            <footer className="flex flex-wrap justify-end gap-2 border-t p-4 sm:p-5">
              <Button variant="outline" onClick={() => void retry()} disabled={mutating}>
                {mutating ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RotateCcwIcon className="size-4" />} Retry
              </Button>
              <Button variant="destructive" onClick={() => void discard()} disabled={mutating || !discardReason.trim()}>
                <Trash2Icon className="size-4" /> Discard
              </Button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, loading, danger = false }: { label: string; value?: number; loading: boolean; danger?: boolean }) {
  return (
    <Card>
      <CardContent>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
        <p className={danger ? "mt-2 text-2xl font-black text-destructive" : "mt-2 text-2xl font-black"}>{loading ? "…" : value ?? 0}</p>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/15 p-3">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-xs">{value}</p>
    </div>
  );
}

function prettyPayload(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
