"use client";

import { EyeIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { UserName } from "@/features/directory/names";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getPricingAudit, getPricingAuditEntry } from "@/features/pricing/api";
import type { PricingAuditEntityType, PricingAuditLog, PricingPageResponse } from "@/features/pricing/contracts";
import { auditActionLabel, auditEntityLabel } from "@/features/pricing/contracts";
import { pricingErrorMessage } from "@/features/pricing/errors";
import { dateTime, PricingError, PricingLoading, PricingPageHeader, selectClassName } from "@/features/pricing/ui";

function prettyJson(value: string | null) {
  if (!value) return "Không có dữ liệu";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function PricingAudit() {
  const [data, setData] = useState<PricingPageResponse<PricingAuditLog> | null>(null);
  const [entityType, setEntityType] = useState<PricingAuditEntityType | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detail, setDetail] = useState<PricingAuditLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (entityType) params.set("entityType", entityType);
    getPricingAudit(params)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((reason) => {
        if (active) setError(pricingErrorMessage(reason, "Không thể tải nhật ký giá cước."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [entityType, page, refreshKey]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      setDetail(await getPricingAuditEntry(id));
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể tải chi tiết nhật ký."));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Bảng giá & cước"
        title="Nhật ký thay đổi"
        description="Theo dõi lịch sử thay đổi bảng giá và quy tắc: ai thực hiện, lúc nào, trước/sau ra sao và lý do vận hành."
        help={{
          description: "Nhật ký giữ lại bằng chứng thay đổi bảng giá để đối chiếu, điều tra sai lệch và kiểm soát phiên bản.",
          bullets: ["Dữ liệu trước/sau được lưu tại thời điểm thao tác.", "Bộ lọc dùng loại đối tượng nghiệp vụ, không yêu cầu nhập ID kỹ thuật.", "Xóa bản nháp vẫn giữ lại nhật ký."],
        }}
        actions={<Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }}><RefreshCwIcon className="size-4" />Làm mới</Button>}
      />

      <Card className="grid gap-3 p-4 md:grid-cols-[minmax(0,20rem)_1fr] md:items-end">
        <label className="grid gap-1.5 text-xs font-bold"><span>Loại đối tượng</span><select className={selectClassName} value={entityType} onChange={(event) => { setPage(1); setEntityType(event.target.value as PricingAuditEntityType | ""); }}><option value="">Tất cả</option><option value="RATE_PLAN">Bảng giá</option><option value="RATE_RULE">Quy tắc giá</option></select></label>
        <p className="text-xs leading-5 text-muted-foreground">Chọn loại dữ liệu để thu hẹp lịch sử. Mã kỹ thuật vẫn có trong chi tiết nhật ký khi cần điều tra.</p>
      </Card>

      {loading ? <PricingLoading label="Đang tải nhật ký giá cước..." /> : error ? <PricingError message={error} onRetry={() => { setLoading(true); setRefreshKey((value) => value + 1); }} /> : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-muted/40 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground"><tr><th className="px-4 py-3">Thời điểm</th><th className="px-4 py-3">Đối tượng</th><th className="px-4 py-3">Thao tác</th><th className="px-4 py-3">Người thao tác</th><th className="px-4 py-3">Lý do</th><th className="px-4 py-3 text-right">Chi tiết</th></tr></thead>
              <tbody className="divide-y">
                {data?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-3">{dateTime(item.occurredAt)}</td><td className="px-4 py-3"><p className="font-black">{auditEntityLabel(item.entityType)}</p></td><td className="px-4 py-3 font-bold">{auditActionLabel(item.action)}</td><td className="px-4 py-3 font-bold"><UserName id={item.actorUserId} /></td><td className="max-w-72 px-4 py-3 text-muted-foreground">{item.reason || "—"}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" disabled={detailLoading} onClick={() => void openDetail(item.id)}><EyeIcon className="size-3.5" />Xem</Button></td></tr>
                ))}
                {!data?.items.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Chưa có nhật ký phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs"><span>Trang {data?.page ?? 1}/{Math.max(data?.totalPages ?? 1, 1)} · {data?.totalItems ?? 0} bản ghi</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={(data?.page ?? 1) <= 1} onClick={() => { setLoading(true); setPage((value) => Math.max(1, value - 1)); }}>Trước</Button><Button variant="outline" size="sm" disabled={(data?.page ?? 1) >= (data?.totalPages ?? 1)} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Sau</Button></div></div>
        </Card>
      )}

      {detail ? <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/45 p-4" role="presentation" onClick={() => setDetail(null)}><div className="my-6 w-full max-w-5xl rounded-2xl border bg-card shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b p-5"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-brand">{auditEntityLabel(detail.entityType)} · {auditActionLabel(detail.action)}</p><h2 className="mt-1 text-lg font-black">Chi tiết thay đổi</h2></div><Button variant="outline" size="sm" onClick={() => setDetail(null)}>Đóng</Button></div><div className="grid gap-4 p-5 lg:grid-cols-2"><div><p className="mb-2 text-xs font-black">Trước thay đổi</p><pre className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/25 p-3 text-[0.68rem] leading-5">{prettyJson(detail.beforeJson)}</pre></div><div><p className="mb-2 text-xs font-black">Sau thay đổi</p><pre className="max-h-[55vh] overflow-auto rounded-lg border bg-muted/25 p-3 text-[0.68rem] leading-5">{prettyJson(detail.afterJson)}</pre></div></div>{detail.reason ? <div className="border-t px-5 py-4 text-xs"><strong>Lý do:</strong> <span className="text-muted-foreground">{detail.reason}</span></div> : null}</div></div> : null}
    </div>
  );
}
