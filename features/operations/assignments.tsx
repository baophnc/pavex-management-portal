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
import { getOperationalAssignments } from "@/features/operations/api";
import {
  operationalAssignmentStatuses,
  type OperationalAssignment,
  type OperationalAssignmentStatus,
} from "@/features/operations/contracts";
import {
  operationalAssignmentStatusLabel,
  operationalAssignmentTypeLabel,
  workforceKindLabel,
} from "@/features/operations/presentation";
import { ApiError } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

function apiMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function statusClass(status: OperationalAssignmentStatus) {
  switch (status) {
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shipmentId = searchParams.get("shipmentId") ?? "";
  const hubId = searchParams.get("hubId") ?? "";
  const status = (searchParams.get("status") ?? "") as OperationalAssignmentStatus | "";

  const [items, setItems] = useState<OperationalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState(shipmentId);
  const [hubDraft, setHubDraft] = useState(hubId);

  useEffect(() => setShipmentDraft(shipmentId), [shipmentId]);
  useEffect(() => setHubDraft(hubId), [hubId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (shipmentId) params.set("shipmentId", shipmentId);
      if (hubId) params.set("hubId", hubId);
      if (status) params.set("status", status);
      const response = await getOperationalAssignments(params);
      setItems(
        [...response].sort(
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
  }, [hubId, shipmentId, status]);

  useEffect(() => {
    void load();
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
    const pending = items.filter((item) => item.status === "PENDING" || item.status === "REJECTED").length;
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
          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_220px_auto]">
            <Input
              value={shipmentDraft}
              onChange={(event) => setShipmentDraft(event.target.value)}
              placeholder="Shipment UUID"
              className="font-mono text-xs"
            />
            <Input
              value={hubDraft}
              onChange={(event) => setHubDraft(event.target.value)}
              placeholder="Hub UUID"
              className="font-mono text-xs"
            />
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
              onClick={() => updateFilters({ shipmentId: shipmentDraft, hubId: hubDraft })}
            >
              <SearchIcon className="size-4" />
              Lọc
            </Button>
          </div>
          {(shipmentId || hubId || status) ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
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
                  href={`/operations/assignments/${item.id}?shipmentId=${encodeURIComponent(item.shipmentId)}`}
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
                    <p className="font-bold">Shipment {shortId(item.shipmentId)}</p>
                    <p className="mt-1 font-mono text-muted-foreground">Hub {shortId(item.hubId)}</p>
                  </div>
                  <div className="text-[0.68rem]">
                    <p className="font-bold">{workforceKindLabel(item.requiredKind)}</p>
                    <p className="mt-1 font-mono text-muted-foreground">Worker {shortId(item.assigneeWorkforceMemberId)}</p>
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
