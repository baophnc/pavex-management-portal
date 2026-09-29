"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LoaderCircleIcon,
  MailIcon,
  PaperclipIcon,
  PhoneIcon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { StatusPill } from "@/features/finance/ui";
import {
  dateTime,
  money,
  PricingError,
  PricingLoading,
  PricingPageHeader,
  selectClassName,
  textareaClassName,
} from "@/features/pricing/ui";
import { type SupportFilters, supportApi, supportErrorMessage } from "@/features/support/api";
import {
  type SupportRequestDetail,
  type SupportRequestKind,
  type SupportRequestPage,
  type SupportRequestStatus,
  supportEventLabel,
  supportKindLabels,
  supportStatusLabels,
} from "@/features/support/contracts";
import { canAccessShipmentList } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

const statusTone: Record<SupportRequestStatus, "brand" | "warning" | "success" | "muted"> = {
  NEW: "brand",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "muted",
};

function StatusBadge({ status }: { status: SupportRequestStatus }) {
  return <StatusPill tone={statusTone[status] ?? "muted"}>{supportStatusLabels[status] ?? status}</StatusPill>;
}

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function SupportInbox() {
  const { user, hasPermission } = useAccess();
  const canManage = hasPermission("support.requests.manage");
  const [filters, setFilters] = useState<SupportFilters>({ page: 1, status: "NEW", kind: "", mine: false, search: "" });
  const [searchDraft, setSearchDraft] = useState("");
  const [result, setResult] = useState<SupportRequestPage | null>(null);
  const [counts, setCounts] = useState<{ new: number; inProgress: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState<SupportRequestDetail | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supportApi.list(filters)
      .then((page) => {
        if (!active) return;
        setResult(page);
        setError(null);
      })
      .catch((reason) => {
        if (active) setError(supportErrorMessage(reason, "Không thể tải danh sách yêu cầu."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [filters, refreshKey]);

  // Counts do not depend on the filters: reload them only on refresh or after a change.
  useEffect(() => {
    let active = true;
    supportApi.counts()
      .then((totals) => { if (active) setCounts(totals); })
      .catch(() => { if (active) setCounts(null); });
    return () => { active = false; };
  }, [refreshKey]);

  const applyFilters = (patch: Partial<SupportFilters>) => {
    setLoading(true);
    setFilters((current) => ({ ...current, page: 1, ...patch }));
  };
  const reload = () => { setLoading(true); setRefreshKey((value) => value + 1); };

  const open = (id: string) => {
    setDetailLoadingId(id);
    supportApi.get(id)
      .then(setDetail)
      .catch((reason) => toast.error(supportErrorMessage(reason, "Không thể mở yêu cầu.")))
      .finally(() => setDetailLoadingId(null));
  };

  const updated = (next: SupportRequestDetail) => {
    setDetail(next);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Chăm sóc khách hàng"
        title="Yêu cầu hỗ trợ"
        description="Yêu cầu liên hệ, hỗ trợ, khiếu nại và hồ sơ ứng tuyển khách gửi từ website Pavex."
        help={{
          description: "Mỗi yêu cầu có một mã (ví dụ YC260927-7K3QX) mà khách nhận qua email. Nhận xử lý để cả nhóm biết ai đang lo yêu cầu nào.",
          bullets: [
            "Khi đánh dấu đã xử lý hoặc đóng, ghi rõ đã làm gì để người khác đọc lại được.",
            "Khiếu nại luôn có mã vận đơn và ngày phát hiện; bằng chứng khách gửi nằm ở phần tệp đính kèm.",
          ],
        }}
        actions={<Button variant="outline" disabled={loading} onClick={reload}><RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />Làm mới</Button>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={cn(selectClassName, "w-auto")} value={filters.status} onChange={(event) => applyFilters({ status: event.target.value as SupportRequestStatus | "" })}>
          <option value="">Mọi trạng thái</option>
          {(Object.keys(supportStatusLabels) as SupportRequestStatus[]).map((value) => (
            <option key={value} value={value}>
              {supportStatusLabels[value]}
              {value === "NEW" && counts ? ` (${counts.new})` : value === "IN_PROGRESS" && counts ? ` (${counts.inProgress})` : ""}
            </option>
          ))}
        </select>
        <select className={cn(selectClassName, "w-auto")} value={filters.kind} onChange={(event) => applyFilters({ kind: event.target.value as SupportRequestKind | "" })}>
          <option value="">Mọi loại</option>
          {(Object.keys(supportKindLabels) as SupportRequestKind[]).map((value) => <option key={value} value={value}>{supportKindLabels[value]}</option>)}
        </select>
        <label className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold">
          <input type="checkbox" checked={filters.mine} onChange={(event) => applyFilters({ mine: event.target.checked })} />
          Tôi đang xử lý
        </label>
        <form
          className="flex min-w-60 flex-1 gap-2"
          role="search"
          onSubmit={(event) => { event.preventDefault(); applyFilters({ search: searchDraft }); }}
        >
          <Input value={searchDraft} placeholder="Mã yêu cầu, tên, email, SĐT, mã vận đơn" onChange={(event) => setSearchDraft(event.target.value)} />
          <Button type="submit" variant="outline"><SearchIcon className="size-4" />Tìm</Button>
        </form>
      </div>

      <div className={cn("grid gap-4", detail && "lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]")}>
        <div className={cn("grid content-start gap-2", detail && "max-lg:hidden")}>
          {loading && !result ? <PricingLoading label="Đang tải yêu cầu..." /> : error ? <PricingError message={error} onRetry={reload} /> : result && result.content.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">Không có yêu cầu nào phù hợp bộ lọc.</Card>
          ) : result ? (
            <>
              {result.content.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full rounded-xl border bg-card p-4 text-left transition hover:border-brand/30",
                    detail?.id === item.id && "border-brand/40 ring-2 ring-brand/10",
                  )}
                  onClick={() => open(item.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-black">{item.code} · {supportKindLabels[item.kind] ?? item.kind}</p>
                      <p className="mt-1 truncate text-sm font-black">{item.topic}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.fullName} · {item.email}{item.trackingCode ? ` · ${item.trackingCode}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {detailLoadingId === item.id ? <LoaderCircleIcon className="size-4 animate-spin" /> : null}
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-x-3 text-[0.68rem] text-muted-foreground">
                    <span>{dateTime(item.createdAt)}</span>
                    {item.attachmentCount ? <span className="inline-flex items-center gap-1"><PaperclipIcon className="size-3" />{item.attachmentCount} tệp</span> : null}
                    {item.assigneeUserId ? <span>{item.assigneeUserId === user?.userId ? "Bạn đang xử lý" : "Đã có người nhận"}</span> : null}
                  </p>
                </button>
              ))}
              {result.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <Button variant="outline" size="sm" disabled={filters.page <= 1 || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page - 1 })); }}><ChevronLeftIcon className="size-4" />Trước</Button>
                  <span className="text-muted-foreground">Trang {result.page}/{result.totalPages} · {result.totalElements} yêu cầu</span>
                  <Button variant="outline" size="sm" disabled={filters.page >= result.totalPages || loading} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: current.page + 1 })); }}>Sau<ChevronRightIcon className="size-4" /></Button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {detail ? (
          <RequestDetail
            key={`${detail.id}:${detail.version}`}
            detail={detail}
            currentUserId={user?.userId ?? null}
            canManage={canManage}
            canOpenShipment={canAccessShipmentList(user)}
            onClose={() => setDetail(null)}
            onUpdated={updated}
          />
        ) : null}
      </div>
    </div>
  );
}

function RequestDetail({
  detail,
  currentUserId,
  canManage,
  canOpenShipment,
  onClose,
  onUpdated,
}: {
  detail: SupportRequestDetail;
  currentUserId: string | null;
  canManage: boolean;
  canOpenShipment: boolean;
  onClose: () => void;
  onUpdated: (next: SupportRequestDetail) => void;
}) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const mine = detail.assigneeUserId !== null && detail.assigneeUserId === currentUserId;
  const finished = detail.status === "RESOLVED" || detail.status === "CLOSED";

  const run = async (action: () => Promise<SupportRequestDetail>, success: string) => {
    setSaving(true);
    try {
      onUpdated(await action());
      toast.success(success);
    } catch (reason) {
      toast.error(supportErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const finish = (status: "RESOLVED" | "CLOSED") => {
    if (!note.trim()) {
      toast.error(status === "RESOLVED" ? "Ghi rõ đã xử lý thế nào trước khi đánh dấu." : "Ghi lý do đóng (spam, trùng, ...) trước khi đóng.");
      return;
    }
    void run(() => supportApi.changeStatus(detail.id, status, note.trim()), status === "RESOLVED" ? "Đã đánh dấu đã xử lý." : "Đã đóng yêu cầu.");
  };

  return (
    <Card className="grid content-start gap-0 overflow-hidden lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/25 p-4">
        <div className="min-w-0">
          <p className="font-mono text-sm font-black">{detail.code}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill tone="muted">{supportKindLabels[detail.kind] ?? detail.kind}</StatusPill>
            <StatusBadge status={detail.status} />
            {detail.assigneeUserId ? <span className="text-[0.68rem] font-bold text-muted-foreground">{mine ? "Bạn đang xử lý" : "Người khác đang xử lý"}</span> : null}
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="Đóng chi tiết" onClick={onClose}><XIcon className="size-4" /></Button>
      </div>

      <div className="grid gap-4 p-4 text-sm">
        <section className="grid gap-1">
          <p className="font-black">{detail.fullName}</p>
          <a href={`mailto:${detail.email}?subject=${encodeURIComponent(`[Pavex] ${detail.code}`)}`} className="inline-flex w-fit items-center gap-1.5 text-brand underline-offset-4 hover:underline"><MailIcon className="size-3.5" />{detail.email}</a>
          {detail.phone ? <a href={`tel:${detail.phone}`} className="inline-flex w-fit items-center gap-1.5 text-brand underline-offset-4 hover:underline"><PhoneIcon className="size-3.5" />{detail.phone}</a> : null}
          <p className="text-xs text-muted-foreground">Gửi lúc {dateTime(detail.createdAt)}{detail.submittedByUserId ? " · khách đã đăng nhập" : " · khách chưa đăng nhập"}</p>
        </section>

        <dl className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-xs">
          <Row label="Chủ đề" value={detail.topic} />
          {detail.trackingCode ? (
            <Row label="Mã vận đơn" value={canOpenShipment ? <Link href={`/shipments/${encodeURIComponent(detail.trackingCode)}`} className="font-mono font-bold text-brand underline-offset-4 hover:underline">{detail.trackingCode}</Link> : <span className="font-mono">{detail.trackingCode}</span>} />
          ) : null}
          {detail.incidentDate ? <Row label="Ngày phát hiện" value={new Date(detail.incidentDate).toLocaleDateString("vi-VN")} /> : null}
          {detail.claimedAmount !== null ? <Row label="Đề nghị đối soát" value={money(detail.claimedAmount)} /> : null}
          {detail.portfolioUrl ? <Row label="Hồ sơ" value={<a href={detail.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand underline-offset-4 hover:underline">{detail.portfolioUrl}</a>} /> : null}
        </dl>

        <section>
          <p className="mb-1 text-xs font-black">Nội dung</p>
          <p className="whitespace-pre-wrap rounded-lg border p-3 leading-6">{detail.message}</p>
        </section>

        {detail.attachments.length ? (
          <section>
            <p className="mb-1 text-xs font-black">Tệp đính kèm ({detail.attachments.length})</p>
            <ul className="grid gap-1.5">
              {detail.attachments.map((file) => (
                <li key={file.id}>
                  <a href={supportApi.attachmentUrl(detail.id, file.id)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs hover:border-brand/30">
                    <span className="inline-flex min-w-0 items-center gap-1.5"><PaperclipIcon className="size-3.5 shrink-0" /><span className="truncate font-bold">{file.fileName}</span></span>
                    <span className="shrink-0 text-muted-foreground">{fileSize(file.sizeBytes)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {detail.resolutionNote && finished ? (
          <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs leading-5">
            <p className="font-black">{detail.status === "RESOLVED" ? "Kết quả xử lý" : "Lý do đóng"}</p>
            <p className="mt-1 whitespace-pre-wrap">{detail.resolutionNote}</p>
          </section>
        ) : null}

        {canManage ? (
          <section className="grid gap-2 border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {!finished && !mine ? (
                <Button size="sm" disabled={saving || !currentUserId} onClick={() => void run(() => supportApi.assign(detail.id, currentUserId), "Bạn đã nhận xử lý yêu cầu.")}>Nhận xử lý</Button>
              ) : null}
              {!finished && mine ? (
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void run(() => supportApi.assign(detail.id, null), "Đã trả yêu cầu về hàng chờ.")}>Trả lại hàng chờ</Button>
              ) : null}
              {finished ? (
                <Button size="sm" variant="outline" disabled={saving} onClick={() => void run(() => supportApi.changeStatus(detail.id, "IN_PROGRESS", note.trim()), "Đã mở lại yêu cầu.")}>Mở lại</Button>
              ) : null}
            </div>
            {!finished ? (
              <>
                <label className="grid gap-1.5 text-xs font-bold">
                  Ghi chú xử lý
                  <textarea value={note} maxLength={1000} disabled={saving} className={textareaClassName} placeholder="Đã gọi lại cho khách, đã hoàn tiền, đã chuyển bộ phận vận hành..." onChange={(event) => setNote(event.target.value)} />
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => finish("CLOSED")}>Đóng (spam/trùng)</Button>
                  <Button size="sm" disabled={saving} onClick={() => finish("RESOLVED")}>{saving ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : null}Đánh dấu đã xử lý</Button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        <section className="border-t pt-4">
          <p className="mb-2 text-xs font-black">Lịch sử</p>
          <ol className="grid gap-2 text-xs">
            {detail.events.map((event, index) => (
              <li key={`${event.createdAt}-${index}`} className="grid gap-0.5 border-l-2 pl-3">
                <span className="font-bold">{supportEventLabel(event)}</span>
                <span className="text-muted-foreground">{dateTime(event.createdAt)}{event.actorUserId ? (event.actorUserId === currentUserId ? " · bởi bạn" : " · bởi nhân viên") : ""}</span>
                {event.note ? <span className="whitespace-pre-wrap text-muted-foreground">“{event.note}”</span> : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-bold">{value}</dd>
    </div>
  );
}
