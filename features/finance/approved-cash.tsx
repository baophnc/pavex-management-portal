"use client";

import { DownloadIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { financeApi } from "@/features/finance/api";
import type { ApprovedCash } from "@/features/finance/contracts";
import { financeErrorMessage } from "@/features/finance/errors";
import { StatusPill } from "@/features/finance/ui";
import { dateTime, money, PricingError, PricingLoading, PricingMetric } from "@/features/pricing/ui";
import { downloadCsv } from "@/lib/csv";

function today() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
}

function monthStart() {
  return `${today().slice(0, 8)}01`;
}

/**
 * What finance has approved: the history stays after approval, with the period's revenue. Cash
 * fees and the fees merchants pay themselves are Pavex's; COD is only held for someone else.
 */
export function ApprovedCashView({ hubId, ready }: { hubId: string; ready: boolean }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ApprovedCash | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    try {
      setData(await financeApi.approved(from, to, hubId));
      setError(null);
    } catch (reason) {
      setError(financeErrorMessage(reason, "Không tải được tiền đã duyệt."));
    } finally {
      setLoading(false);
    }
  }, [from, hubId, ready, to]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const revenue = data ? data.feeRevenue + (data.merchantFeeRevenue ?? 0) : 0;

  function exportRows() {
    if (!data) return;
    downloadCsv(
      `tien-da-duyet-${data.from}-${data.to}.csv`,
      ["Mã vận đơn", "Nguồn", "Tổng tiền", "Cước", "Thu hộ", "Thu hộ trả cho", "Duyệt lúc"],
      data.items.map((item) => [
        item.trackingCode,
        item.source === "COUNTER" ? "Tại quầy" : "Bưu tá giao hàng",
        item.amount,
        item.feeAmount,
        item.codAmount,
        item.codAmount > 0 ? (item.codPayee === "SENDER" ? "Khách gửi tại quầy" : "Cửa hàng") : "",
        item.approvedAt ? dateTime(item.approvedAt) : "",
      ]),
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-bold">
          Từ ngày
          <Input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Đến ngày
          <Input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </label>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCwIcon className="size-4" /> Làm mới
        </Button>
        <Button variant="outline" disabled={!data?.items.length} onClick={exportRows}>
          <DownloadIcon className="size-4" /> Xuất CSV
        </Button>
      </div>

      {loading && !data ? (
        <PricingLoading label="Đang tải tiền đã duyệt..." />
      ) : error ? (
        <PricingError message={error} onRetry={() => void load()} />
      ) : data ? (
        <>
          <Card className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            <PricingMetric
              label="Doanh thu cước"
              value={money(revenue)}
              note={`Tiền mặt ${money(data.feeRevenue)}${data.merchantFeeRevenue !== null ? ` · cửa hàng tự trả ${money(data.merchantFeeRevenue)}` : ""}`}
            />
            <PricingMetric
              label="Tiền mặt đã nhận"
              value={money(data.totalAmount)}
              note={`${data.count} khoản · cước tại quầy ${money(data.counterFeeRevenue)} · cước người nhận trả ${money(data.deliveryFeeRevenue)}`}
            />
            <PricingMetric label="Thu hộ phải trả cửa hàng" value={money(data.codOwedToMerchants)} note="Trả qua kỳ đối soát" />
            <PricingMetric label="Thu hộ phải trả khách tại quầy" value={money(data.codOwedToSenders)} note="Trả tiền mặt tại bưu cục gửi" />
          </Card>
          <p className="text-[0.68rem] text-muted-foreground">
            Cước là doanh thu của Pavex. Tiền thu hộ chỉ là tiền giữ hộ, không tính vào doanh thu. Cước cửa hàng tự trả tính theo đơn
            đã kết thúc trong kỳ và được trừ vào tiền thu hộ khi đối soát.
          </p>

          <Card className="divide-y">
            {data.items.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">Chưa duyệt khoản tiền nào trong khoảng ngày này.</p>
            ) : (
              data.items.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <p className="font-mono font-black">
                      {item.trackingCode}
                      <span className="ml-2 font-sans">
                        <StatusPill tone={item.source === "COUNTER" ? "brand" : "muted"}>{item.source === "COUNTER" ? "Tại quầy" : "Bưu tá giao hàng"}</StatusPill>
                      </span>
                    </p>
                    <p className="mt-1 text-[0.68rem] text-muted-foreground">
                      Duyệt {dateTime(item.approvedAt)}
                      {item.feeAmount > 0 ? ` · cước ${money(item.feeAmount)}` : ""}
                      {item.codAmount > 0 ? ` · thu hộ ${money(item.codAmount)} trả ${item.codPayee === "SENDER" ? "khách tại quầy" : "cửa hàng"}` : ""}
                    </p>
                  </div>
                  <strong className="tabular-nums">{money(item.amount)}</strong>
                </div>
              ))
            )}
          </Card>
          {data.items.length >= 300 ? <p className="text-[0.68rem] text-muted-foreground">Chỉ hiện 300 khoản mới nhất; các ô tổng ở trên tính đủ cả kỳ.</p> : null}
        </>
      ) : null}
    </div>
  );
}
