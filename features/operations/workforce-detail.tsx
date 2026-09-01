"use client";

import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  Building2Icon,
  CheckCircle2Icon,
  HistoryIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserRoundCogIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getAllHubs } from "@/features/network/api";
import type { Hub } from "@/features/network/contracts";
import {
  assignWorkforceHub,
  getWorkforceAudit,
  getWorkforceMember,
  setWorkforceCapacity,
  setWorkforceStatus,
  unassignWorkforceHub,
} from "@/features/operations/api";
import type {
  WorkforceAudit,
  WorkforceHubMembership,
  WorkforceMember,
  WorkforceMemberStatus,
} from "@/features/operations/contracts";
import {
  availabilityLabel,
  workforceAuditLabel,
  workforceIdentityName,
  workforceKindLabel,
  workforceStatusLabel,
} from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function Fact({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/15 p-3.5">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <div className={cn("mt-1.5 break-words text-xs font-bold leading-5", mono && "font-mono text-[0.68rem]")}>{value || "—"}</div>
    </div>
  );
}

function statusTone(status: WorkforceMemberStatus) {
  if (status === "ACTIVE") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "SUSPENDED") return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
}

function HubCard({ membership, onRemove, removing }: { membership: WorkforceHubMembership; onRemove: () => void; removing: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3.5", !membership.isActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black">{membership.hubCode ?? membership.hubId}</p>
            {membership.isPrimary ? <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.58rem] font-black text-brand">PRIMARY</span> : null}
            <span className={cn("rounded-full px-2 py-0.5 text-[0.58rem] font-black", membership.isActive ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
              {membership.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <p className="mt-1 text-[0.68rem] text-muted-foreground">{membership.hubName ?? "Chưa có snapshot tên hub"}</p>
          <p className="mt-1 font-mono text-[0.58rem] text-muted-foreground">{membership.hubId}</p>
          <p className="mt-2 text-[0.62rem] text-muted-foreground">Gán {formatDateTime(membership.assignedAt)}{membership.unassignedAt ? ` · Gỡ ${formatDateTime(membership.unassignedAt)}` : ""}</p>
        </div>
        {membership.isActive ? (
          <Button type="button" size="sm" variant="outline" className="text-destructive" onClick={onRemove} disabled={removing}>
            {removing ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />} Gỡ
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function OperationsWorkforceDetail({ workforceId }: { workforceId: string }) {
  const { hasPermission, hasAnyPermission } = useAccess();
  const globalManager = hasPermission("operations.workforce.manage");
  const canReadNetwork = hasAnyPermission(["network.read", "network.manage"]);
  const [member, setMember] = useState<WorkforceMember | null>(null);
  const [audit, setAudit] = useState<WorkforceAudit[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState<WorkforceMemberStatus>("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [capacity, setCapacity] = useState("1");
  const [capacityReason, setCapacityReason] = useState("");
  const [hubId, setHubId] = useState("");
  const [hubPrimary, setHubPrimary] = useState(false);
  const [hubReason, setHubReason] = useState("");
  const [removeReason, setRemoveReason] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextMember, nextAudit] = await Promise.all([
        getWorkforceMember(workforceId),
        getWorkforceAudit(workforceId),
      ]);
      setMember(nextMember);
      setAudit(nextAudit);
      setStatus(nextMember.status);
      setCapacity(String(nextMember.availability?.maxConcurrentAssignments ?? 1));
    } catch (requestError) {
      setError(apiMessage(requestError, "Không thể tải chi tiết workforce."));
    } finally {
      setLoading(false);
    }
  }, [workforceId]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!canReadNetwork) return;
    void getAllHubs().then(setHubs).catch(() => setHubs([]));
  }, [canReadNetwork]);

  const activeMemberships = useMemo(() => member?.hubMemberships.filter((item) => item.isActive) ?? [], [member]);
  const inactiveMemberships = useMemo(() => member?.hubMemberships.filter((item) => !item.isActive) ?? [], [member]);

  const mutate = async (key: string, action: () => Promise<WorkforceMember>, success: string) => {
    setSaving(key);
    try {
      const next = await action();
      setMember(next);
      setStatus(next.status);
      setCapacity(String(next.availability?.maxConcurrentAssignments ?? 1));
      setAudit(await getWorkforceAudit(workforceId));
      toast.success(success);
    } catch (requestError) {
      toast.error(apiMessage(requestError, "Thao tác workforce thất bại."));
    } finally {
      setSaving(null);
    }
  };

  const saveStatus = () => {
    if (status !== "ACTIVE" && !statusReason.trim()) {
      toast.error("Backend yêu cầu lý do khi suspend/offboard workforce.");
      return;
    }
    void mutate("status", () => setWorkforceStatus(workforceId, { status, reason: statusReason.trim() || null }), "Đã cập nhật trạng thái workforce.");
  };

  const saveCapacity = () => {
    const value = Number(capacity);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      toast.error("Capacity phải là số nguyên từ 1 đến 100.");
      return;
    }
    void mutate("capacity", () => setWorkforceCapacity(workforceId, { maxConcurrentAssignments: value, reason: capacityReason.trim() || null }), "Đã cập nhật capacity.");
  };

  const assignHub = () => {
    if (!hubId.trim()) {
      toast.error("Chọn hoặc nhập Hub ID.");
      return;
    }
    void mutate("assign-hub", () => assignWorkforceHub(workforceId, { hubId: hubId.trim(), isPrimary: globalManager && hubPrimary, reason: hubReason.trim() || null }), "Đã gán hub cho workforce.").then(() => {
      setHubId(""); setHubPrimary(false); setHubReason("");
    });
  };

  const removeHub = (membership: WorkforceHubMembership) => {
    const reason = removeReason[membership.hubId]?.trim();
    void mutate(`remove-${membership.hubId}`, () => unassignWorkforceHub(workforceId, membership.hubId, reason), "Đã gỡ hub khỏi workforce.");
  };

  if (loading && !member) {
    return <div className="grid min-h-[55vh] place-items-center text-sm text-muted-foreground"><div className="flex items-center gap-2"><LoaderCircleIcon className="size-4 animate-spin" /> Đang tải workforce...</div></div>;
  }

  if (error || !member) {
    return (
      <div className="space-y-4">
        <Link href="/operations/workforce" className="inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-xs font-bold hover:bg-muted"><ArrowLeftIcon className="size-4" /> Quay lại Workforce</Link>
        <Card className="border-destructive/30"><CardContent className="flex gap-3 text-sm text-destructive"><AlertTriangleIcon className="size-4" /><div><p className="font-black">Không mở được workforce</p><p className="mt-1 text-xs">{error ?? "Không tìm thấy workforce."}</p></div></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div>
            <Link href="/operations/workforce" className="-ml-2 mb-2 inline-flex h-7 items-center gap-2 rounded-md px-2.5 text-[0.68rem] font-bold hover:bg-muted"><ArrowLeftIcon className="size-4" /> Workforce</Link>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand"><UserRoundCogIcon className="size-5" /></span>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-brand">{member.employeeCode}</p>
                <h1 className="mt-1 text-xl font-black sm:text-2xl">{workforceIdentityName(member.identity ?? {})}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{workforceKindLabel(member.kind)} · {member.identity?.email ?? member.userId}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full border px-3 py-1.5 text-[0.68rem] font-black", statusTone(member.status))}>{workforceStatusLabel(member.status)}</span>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} /> Làm mới</Button>
          </div>
        </div>
      </section>

      {!member.identityAccessValid ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-xs leading-5 text-destructive">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div><p className="font-black">Identity access không còn hợp lệ</p><p className="mt-1">Account có thể không ACTIVE hoặc role không còn tương thích với workforce kind. Planner sẽ không chọn member này.</p></div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader><div><p className="text-sm font-black">Identity & workforce</p><p className="mt-1 text-xs text-muted-foreground">Snapshot do Operations đọc từ Identity; Management không join database.</p></div></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="Employee code" value={member.employeeCode} mono />
              <Fact label="Workforce kind" value={workforceKindLabel(member.kind)} />
              <Fact label="Workforce status" value={workforceStatusLabel(member.status)} />
              <Fact label="Identity user ID" value={member.userId} mono />
              <Fact label="Account status" value={member.identity?.accountStatus ?? "Không đọc được"} />
              <Fact label="Profile status" value={member.identity?.profileStatus ?? "Không đọc được"} />
              <Fact label="Roles" value={member.identity?.roles.join(", ") || "—"} />
              <Fact label="Email verified" value={member.identity?.emailVerified ? "Đã xác minh" : "Chưa xác minh"} />
              <Fact label="Cập nhật" value={formatDateTime(member.updatedAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-2"><Building2Icon className="size-4 text-brand" /><p className="text-sm font-black">Hub memberships</p></div></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_auto]">
                <div>
                  {canReadNetwork && hubs.length ? (
                    <select value={hubId} onChange={(event) => setHubId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-xs font-bold">
                      <option value="">Chọn hub từ Network</option>
                      {hubs.filter((hub) => hub.status === "ACTIVE").map((hub) => <option key={hub.id} value={hub.id}>{hub.code} · {hub.name}</option>)}
                    </select>
                  ) : (
                    <Input value={hubId} onChange={(event) => setHubId(event.target.value)} placeholder="Hub UUID" className="font-mono text-xs" />
                  )}
                </div>
                <Button type="button" onClick={assignHub} disabled={saving === "assign-hub" || !hubId.trim()}>
                  {saving === "assign-hub" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <Building2Icon className="size-4" />} Gán hub
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-[auto_1fr] md:items-center">
                <label className={cn("flex items-center gap-2 text-xs font-bold", !globalManager && "opacity-60")}>
                  <input type="checkbox" checked={hubPrimary} disabled={!globalManager} onChange={(event) => setHubPrimary(event.target.checked)} /> Đặt primary hub
                </label>
                <Input value={hubReason} onChange={(event) => setHubReason(event.target.value)} placeholder="Lý do gán hub (tùy chọn)" />
              </div>
              {!globalManager ? <p className="text-[0.66rem] text-muted-foreground">Hub-scoped manager có thể gán member trong phạm vi backend cho phép nhưng không được đặt primary hub.</p> : null}

              <div className="grid gap-3 lg:grid-cols-2">
                {activeMemberships.map((membership) => (
                  <div key={membership.id} className="space-y-2">
                    <HubCard membership={membership} onRemove={() => removeHub(membership)} removing={saving === `remove-${membership.hubId}`} />
                    <Input value={removeReason[membership.hubId] ?? ""} onChange={(event) => setRemoveReason((value) => ({ ...value, [membership.hubId]: event.target.value }))} placeholder="Lý do gỡ hub (tùy chọn)" className="h-9 text-xs" />
                  </div>
                ))}
              </div>
              {!activeMemberships.length ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Member chưa thuộc hub nào trong phạm vi bạn có thể xem.</p> : null}

              {inactiveMemberships.length ? (
                <details className="rounded-lg border bg-muted/10 p-3">
                  <summary className="cursor-pointer text-xs font-black">Lịch sử hub đã gỡ ({inactiveMemberships.length})</summary>
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">{inactiveMemberships.map((membership) => <HubCard key={membership.id} membership={membership} onRemove={() => undefined} removing={false} />)}</div>
                </details>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><div className="flex items-center gap-2"><HistoryIcon className="size-4 text-brand" /><p className="text-sm font-black">Audit timeline</p></div></CardHeader>
            <CardContent>
              {audit.length ? (
                <div className="space-y-3">
                  {audit.map((item) => (
                    <div key={item.id} className="grid gap-2 rounded-lg border p-3.5 md:grid-cols-[150px_1fr]">
                      <div><p className="text-[0.64rem] font-black text-brand">{workforceAuditLabel(item.action)}</p><p className="mt-1 text-[0.62rem] text-muted-foreground">{formatDateTime(item.occurredAt)}</p></div>
                      <div className="text-xs leading-5"><p className="font-bold">{item.previousValue ?? "—"} → {item.newValue ?? "—"}</p>{item.reason ? <p className="mt-1 text-muted-foreground">{item.reason}</p> : null}<p className="mt-1 font-mono text-[0.58rem] text-muted-foreground">actor {item.actorUserId}{item.hubId ? ` · hub ${item.hubId}` : ""}</p></div>
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Chưa có audit event trong phạm vi hiện tại.</p>}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><div className="flex items-center gap-2"><ActivityIcon className="size-4 text-brand" /><p className="text-sm font-black">Availability & load</p></div></CardHeader>
            <CardContent className="space-y-3">
              {member.availability ? (
                <>
                  <Fact label="Availability" value={availabilityLabel(member.availability.status)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Fact label="Active" value={member.availability.activeAssignments} />
                    <Fact label="Maximum" value={member.availability.maxConcurrentAssignments} />
                    <Fact label="Còn lại" value={member.availability.remainingCapacity} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand" style={{ width: `${Math.min(100, member.availability.maxConcurrentAssignments ? member.availability.activeAssignments / member.availability.maxConcurrentAssignments * 100 : 0)}%` }} /></div>
                </>
              ) : <p className="text-xs text-muted-foreground">Availability chưa được cấu hình.</p>}
            </CardContent>
          </Card>

          {globalManager ? (
            <Card>
              <CardHeader><p className="text-sm font-black">Quản trị workforce</p></CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-black">Trạng thái</p>
                  <select value={status} disabled={member.status === "OFFBOARDED"} onChange={(event) => setStatus(event.target.value as WorkforceMemberStatus)} className="h-10 w-full rounded-md border bg-background px-3 text-xs font-bold">
                    <option value="ACTIVE">Đang hoạt động</option><option value="SUSPENDED">Tạm ngưng</option><option value="OFFBOARDED">Đã nghỉ</option>
                  </select>
                  <Input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Lý do (bắt buộc khi suspend/offboard)" />
                  <Button type="button" className="w-full" variant="outline" onClick={saveStatus} disabled={saving === "status" || member.status === "OFFBOARDED"}>
                    {saving === "status" ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />} Lưu trạng thái
                  </Button>
                </div>

                <div className="border-t pt-5">
                  <p className="text-xs font-black">Maximum concurrent assignments</p>
                  <div className="mt-2 flex gap-2"><Input type="number" min={1} max={100} value={capacity} onChange={(event) => setCapacity(event.target.value)} /><Button type="button" variant="outline" onClick={saveCapacity} disabled={saving === "capacity"}><SaveIcon className="size-4" /></Button></div>
                  <Input className="mt-2" value={capacityReason} onChange={(event) => setCapacityReason(event.target.value)} placeholder="Lý do thay đổi capacity (tùy chọn)" />
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[0.68rem] leading-5 text-amber-800 dark:text-amber-200">
                  <p className="font-black">Operational safety</p>
                  <p className="mt-1">Backend sẽ chặn suspend/offboard hoặc gỡ hub nếu member còn assignment IN_PROGRESS. Các assignment ASSIGNED/ACCEPTED có thể bị requeue.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-brand" /><p>Bạn đang ở hub scope. Các mutation global như đổi status/capacity được ẩn; quyền hub vẫn được backend enforce cho thao tác membership.</p></CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
