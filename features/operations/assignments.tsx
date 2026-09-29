"use client";

import {
  AlertTriangleIcon,
  ClipboardListIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getScopedHubs } from "@/features/operations/hub-scope";
import type { Hub } from "@/features/network/contracts";
import { useAccess } from "@/features/auth/access-context";
import { getOperationalAssignments, getWorkforce } from "@/features/operations/api";
import {
  operationalAssignmentStatuses,
  type OperationalAssignment,
  type OperationalAssignmentStatus,
} from "@/features/operations/contracts";
import {
  operationalAssignmentStatusLabel,
  operationalAssignmentTypeLabel,
  workforceIdentityName,
  workforceKindLabel,
} from "@/features/operations/presentation";
import { getAdminShipment, getAdminShipments } from "@/features/shipments/api";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function statusClass(status: OperationalAssignmentStatus) {
  switch (status) {
    case "BLOCKED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "READY":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "PENDING":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "ASSIGNED":
      return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "ACCEPTED":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";
    case "REJECTED":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "IN_PROGRESS":
      return "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "COMPLETED":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "CANCELLED":
      return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
}

function shortId(value: string | null) {
  return value ? `${value.slice(0, 8)}…` : "—";
}

export function OperationsAssignments() {
  const { hasAnyPermission } = useAccess();
  const canReadGlobalShipments = hasAnyPermission(["shipments.admin.read", "shipments.read-hub"]);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assignmentCode = searchParams.get("assignmentCode") ?? "";
  const trackingCode = searchParams.get("trackingCode") ?? "";
  const hubCode = searchParams.get("hubCode") ?? "";
  const status = (searchParams.get("status") ?? "") as OperationalAssignmentStatus | "";

  const [items, setItems] = useState<OperationalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState(assignmentCode);
  const [shipmentDraft, setShipmentDraft] = useState(trackingCode);
  const [hubDraft, setHubDraft] = useState(hubCode);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [shipmentLabels, setShipmentLabels] = useState<Record<string, string>>({});
  const [hubLabels, setHubLabels] = useState<Record<string, string>>({});
  const [workerLabels, setWorkerLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const task = window.setTimeout(() => setAssignmentDraft(assignmentCode), 0);
    return () => window.clearTimeout(task);
  }, [assignmentCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setShipmentDraft(trackingCode), 0);
    return () => window.clearTimeout(task);
  }, [trackingCode]);
  useEffect(() => {
    const task = window.setTimeout(() => setHubDraft(hubCode), 0);
    return () => window.clearTimeout(task);
  }, [hubCode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [networkHubs, workforcePage, shipmentPage] = await Promise.all([
        getScopedHubs().catch(() => []),
        getWorkforce(new URLSearchParams({ page: "1", pageSize: "100" })).catch(() => null),
        canReadGlobalShipments
          ? getAdminShipments(new URLSearchParams({ limit: "100" })).catch(() => null)
          : Promise.resolve(null),
      ]);
      const fallbackHubs = new Map<string, Hub>();
      workforcePage?.items.forEach((member) => member.hubMemberships.forEach((membership) => {
        if (!membership.isActive) return;
        fallbackHubs.set(membership.hubId, {
          id: membership.hubId,
          code: membership.hubCode || membership.hubId.slice(0, 8),
          name: membership.hubName || "Bưu cục được phân quyền",
          type: (membership.hubType as Hub["type"]) || "LOCAL",
          status: (membership.hubStatus as Hub["status"]) || "ACTIVE",
          addressLine: membership.addressLine || "",
          provinceCode: membership.provinceCode || "",
          wardCode: membership.wardCode || "",
          parentHubId: membership.parentHubId,
          publicVisible: false,
          publicName: null,
          createdAt: membership.assignedAt,
          updatedAt: membership.updatedAt,
        });
      }));
      const visibleHubs = networkHubs.length ? networkHubs : [...fallbackHubs.values()];
      setHubs(visibleHubs.filter((hub) => hub.status === "ACTIVE"));
      setHubLabels(Object.fromEntries(visibleHubs.map((hub) => [hub.id, `${hub.code} · ${hub.name}`])));
      setWorkerLabels(Object.fromEntries((workforcePage?.items ?? []).map((member) => [
        member.id,
        `${workforceIdentityName(member.identity ?? {})} · ${member.employeeCode}`,
      ])));

      const params = new URLSearchParams();
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
      if (hubCode) {
        const hub = visibleHubs.find((item) => item.code === hubCode);
        if (!hub) throw new Error("Bưu cục không còn nằm trong phạm vi truy cập.");
        params.set("hubId", hub.id);
      }
      if (status) params.set("status", status);
      const response = await getOperationalAssignments(params);
      setShipmentLabels(nextShipmentLabels);
      const visibleAssignments = assignmentCode
        ? response.filter((item) => item.code === assignmentCode.trim().toUpperCase())
        : response;
      setItems(
        [...visibleAssignments].sort(
          (left, right) =>
            right.priority - left.priority ||
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      );
    } catch (cause) {
      const message = apiMessage(cause, "Không thể tải assignment vận hành.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [assignmentCode, canReadGlobalShipments, hubCode, status, trackingCode]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const updateFilters = (next: Record<string, string>) => {
    const query = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value.trim()) query.set(key, value.trim());
      else query.delete(key);
    });
    const serialized = query.toString();
    router.push(serialized ? `${pathname}?${serialized}` : pathname);
  };

  const counts = useMemo(() => {
    const pending = items.filter((item) => ["BLOCKED", "READY", "PENDING", "REJECTED"].includes(item.status)).length;
    const active = items.filter((item) => ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"].includes(item.status)).length;
    const completed = items.filter((item) => item.status === "COMPLETED").length;
    return { pending, active, completed };
  }, [items]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-3 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">Operations assignments</p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Phân công vận hành</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Theo dõi hàng đợi theo shipment/hub, trạng thái thực thi và mở detail để phân công hoặc hủy công việc.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            Làm mới
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Chờ điều phối", counts.pending],
          ["Đang hoạt động", counts.active],
          ["Đã hoàn tất", counts.completed],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-black">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className={cn(
            "grid gap-2",
            canReadGlobalShipments
              ? "lg:grid-cols-[1fr_1fr_1fr_220px_auto]"
              : "lg:grid-cols-[1fr_1fr_220px_auto]",
          )}>
            <Input
              value={assignmentDraft}
              onChange={(event) => setAssignmentDraft(event.target.value)}
              placeholder="Mã assignment, ví dụ OA-..."
              className="font-mono text-xs uppercase"
            />
            {canReadGlobalShipments ? <Input
              value={shipmentDraft}
              onChange={(event) => setShipmentDraft(event.target.value)}
              placeholder="Mã vận đơn, ví dụ PAVEX..."
              className="font-mono text-xs uppercase"
            /> : null}
            <select
              value={hubDraft}
              onChange={(event) => setHubDraft(event.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-xs font-bold"
            >
              <option value="">Tất cả bưu cục trong phạm vi</option>
              {hubs.map((hub) => <option key={hub.id} value={hub.code}>{hub.code} · {hub.name}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => updateFilters({ status: event.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              {operationalAssignmentStatuses.map((item) => (
                <option key={item} value={item}>{operationalAssignmentStatusLabel(item)}</option>
              ))}
            </select>
            <Button
              type="button"
              onClick={() => updateFilters({
                assignmentCode: assignmentDraft.toUpperCase(),
                trackingCode: canReadGlobalShipments ? shipmentDraft.toUpperCase() : "",
                hubCode: hubDraft,
              })}
            >
              <SearchIcon className="size-4" />
              Lọc
            </Button>
          </div>
          {(assignmentCode || trackingCode || hubCode || status) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAssignmentDraft("");
                setShipmentDraft("");
                setHubDraft("");
                router.push(pathname);
              }}
            >
              Xóa bộ lọc
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid min-h-52 place-items-center text-sm text-muted-foreground">
              <LoaderCircleIcon className="mr-2 inline size-4 animate-spin" /> Đang tải assignment...
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-52 place-items-center px-4 text-center text-sm text-muted-foreground">
              Không có assignment phù hợp phạm vi và bộ lọc hiện tại.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/operations/assignments/${item.id}`}
                  className="grid gap-3 px-4 py-3 transition hover:bg-muted/35 lg:grid-cols-[1.1fr_1.1fr_1fr_0.9fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ClipboardListIcon className="size-4 shrink-0 text-brand" />
                      <p className="truncate text-xs font-black">{item.code}</p>
                    </div>
                    <p className="mt-1 text-[0.68rem] text-muted-foreground">{operationalAssignmentTypeLabel(item.type)}</p>
                  </div>
                  <div className="min-w-0 text-[0.68rem]">
                    <p className="font-bold">{shipmentLabels[item.shipmentId] || `Vận đơn ${shortId(item.shipmentId)}`}</p>
                    <p className="mt-1 text-muted-foreground">{hubLabels[item.hubId] || "Bưu cục trong phạm vi"}</p>
                  </div>
                  <div className="text-[0.68rem]">
                    <p className="font-bold">{workforceKindLabel(item.requiredKind)}</p>
                    <p className="mt-1 text-muted-foreground">{item.assigneeWorkforceMemberId ? workerLabels[item.assigneeWorkforceMemberId] || "Nhân sự đã phân công" : "Chưa phân công"}</p>
                  </div>
                  <div className="text-[0.68rem]">
                    <span className={cn("inline-flex rounded-full border px-2 py-1 font-black", statusClass(item.status))}>
                      {operationalAssignmentStatusLabel(item.status)}
                    </span>
                    <p className="mt-1 text-muted-foreground">Ưu tiên {item.priority}</p>
                  </div>
                  <div className="text-right text-[0.65rem] text-muted-foreground">
                    <p>{formatDateTime(item.updatedAt)}</p>
                    <p className="mt-1 font-black text-brand">Mở →</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
