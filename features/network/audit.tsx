"use client";

import {
  HistoryIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAuditLogs } from "@/features/network/api";
import type {
  NetworkAuditAction,
  NetworkAuditLog,
  PageResponse,
} from "@/features/network/contracts";
import { auditActionLabel, auditEntityTypeLabel, auditEntityTypes } from "@/features/network/contracts";
import {
  EmptyState,
  NetworkError,
  NetworkPageHeader,
  Pager,
  selectClassName,
} from "@/features/network/ui";
import { cn, formatDateTime } from "@/lib/utils";

function prettyJson(value: string | null) {
  if (!value) return "—";
  try {
    return JSON.stringify(JSON.parse(value) as unknown, null, 2);
  } catch {
    return value;
  }
}

export function NetworkAudit() {
  const [result, setResult] = useState<PageResponse<NetworkAuditLog>>({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 });
  const [selected, setSelected] = useState<NetworkAuditLog | null>(null);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (entityType) params.set("entityType", entityType);
      if (entityId.trim()) params.set("entityId", entityId.trim());
      if (actorUserId.trim()) params.set("actorUserId", actorUserId.trim());
      const next = await getAuditLogs(params);
      setResult(next);
      setSelected((current) => current ? next.items.find((item) => item.id === current.id) ?? current : null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải nhật ký mạng lưới.");
    } finally {
      setLoading(false);
    }
  }, [actorUserId, entityId, entityType, page]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    result.items.forEach((item) => map.set(item.action, (map.get(item.action) ?? 0) + 1));
    return map;
  }, [result.items]);

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Theo dõi thay đổi"
        title="Nhật ký mạng lưới"
        description="Xem ai đã tạo, sửa, kích hoạt, ngừng hoặc thay đổi dữ liệu vận hành trong mạng lưới."
        help={{ description: "Nhật ký dùng để truy vết thay đổi và hỗ trợ xử lý sự cố.", bullets: ["Lọc theo loại dữ liệu, mã bản ghi hoặc người thao tác.", "Chọn một dòng để xem dữ liệu trước và sau thay đổi.", "Các mã UUID được giữ ở đây vì đây là màn hình kiểm tra kỹ thuật và audit."] }}
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Tải lại</Button>}
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-4">
          <select className={selectClassName} value={entityType} onChange={(event) => { setEntityType(event.target.value); setPage(1); }}><option value="">Mọi loại dữ liệu</option>{auditEntityTypes.map((item) => <option key={item} value={item}>{auditEntityTypeLabel(item)}</option>)}</select>
          <Input placeholder="Mã bản ghi (UUID)" value={entityId} onChange={(event) => { setEntityId(event.target.value); setPage(1); }} />
          <Input placeholder="Mã người thao tác (UUID)" value={actorUserId} onChange={(event) => { setActorUserId(event.target.value); setPage(1); }} />
          <div className="flex items-center justify-end gap-2 text-[0.65rem] font-bold text-muted-foreground">{[...counts.entries()].slice(0, 3).map(([action, count]) => <span key={action} className="rounded-full border px-2 py-1">{auditActionLabel(action as NetworkAuditAction)} {count}</span>)}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_30rem]">
        <Card className="h-fit overflow-hidden">
          <CardHeader><p className="text-sm font-black">Dòng sự kiện</p></CardHeader>
          {loading && !result.items.length ? <div className="grid min-h-56 place-items-center"><LoaderCircleIcon className="size-5 animate-spin text-brand" /></div> : result.items.length ? <div className="divide-y">{result.items.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className={cn("grid w-full gap-2 p-4 text-left transition hover:bg-muted/40 md:grid-cols-[10rem_9rem_minmax(0,1fr)_auto] md:items-center", selected?.id === item.id && "bg-brand/[0.055]")}><div><p className="text-[0.62rem] font-black text-muted-foreground">LOẠI DỮ LIỆU</p><p className="mt-1 text-xs font-black">{auditEntityTypeLabel(item.entityType)}</p></div><div><p className="text-[0.62rem] font-black text-muted-foreground">THAO TÁC</p><p className="mt-1 text-xs font-black text-brand">{auditActionLabel(item.action)}</p></div><div className="min-w-0"><p className="truncate font-mono text-[0.68rem]">{item.entityId}</p><p className="mt-1 truncate text-[0.65rem] text-muted-foreground">Người thao tác {item.actorUserId}</p></div><div className="text-xs font-bold text-muted-foreground">{formatDateTime(item.occurredAt)}</div></button>)}</div> : <EmptyState title="Chưa có nhật ký" description="Các thay đổi mạng lưới sẽ xuất hiện ở đây." />}
          <Pager page={result.page} totalPages={result.totalPages} totalItems={result.totalItems} onPage={setPage} />
        </Card>

        <Card className="h-fit 2xl:sticky 2xl:top-32">
          <CardHeader><div className="flex items-center gap-2"><HistoryIcon className="size-4 text-brand" /><p className="text-sm font-black">Chi tiết thay đổi</p></div></CardHeader>
          {!selected ? <EmptyState title="Chọn một sự kiện" description="Xem dữ liệu trước và sau của một thay đổi." /> : <CardContent className="space-y-4"><div className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs"><p><span className="font-black">{auditEntityTypeLabel(selected.entityType)}</span> · {auditActionLabel(selected.action)}</p><p className="break-all font-mono text-[0.68rem]">{selected.entityId}</p><p className="text-muted-foreground">Người thao tác: <span className="font-mono">{selected.actorUserId}</span></p><p className="text-muted-foreground">{formatDateTime(selected.occurredAt)}</p>{selected.reason ? <p className="rounded-md border bg-background p-2">Lý do: {selected.reason}</p> : null}</div><div><p className="mb-2 text-xs font-black">Trước thay đổi</p><pre className="max-h-72 overflow-auto rounded-lg border bg-slate-950 p-3 text-[0.68rem] leading-5 text-slate-100">{prettyJson(selected.beforeJson)}</pre></div><div><p className="mb-2 text-xs font-black">Sau thay đổi</p><pre className="max-h-72 overflow-auto rounded-lg border bg-slate-950 p-3 text-[0.68rem] leading-5 text-slate-100">{prettyJson(selected.afterJson)}</pre></div></CardContent>}
        </Card>
      </div>
    </div>
  );
}
