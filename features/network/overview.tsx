"use client";

import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCoverages, getHubs, getLanes, getRegions, getRouteTemplates, getServiceAreas } from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
import type { Hub, HubLane, NetworkRegion, PageResponse, RouteTemplate, ServiceArea, ServiceAreaCoverage } from "@/features/network/contracts";
import {
  Metric,
  NetworkError,
  NetworkPageHeader,
  QuickLink,
} from "@/features/network/ui";

type Snapshot = {
  regions: NetworkRegion[];
  hubs: PageResponse<Hub>;
  areas: PageResponse<ServiceArea>;
  coverages: PageResponse<ServiceAreaCoverage>;
  lanes: PageResponse<HubLane>;
  templates: PageResponse<RouteTemplate>;
};

function firstPage(size = 1) {
  return new URLSearchParams({ page: "1", pageSize: String(size) });
}

export function NetworkOverview() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [regions, hubs, areas, coverages, lanes, templates] = await Promise.all([
        getRegions(),
        getHubs(firstPage()),
        getServiceAreas(firstPage()),
        getCoverages(firstPage()),
        getLanes(firstPage()),
        getRouteTemplates(firstPage()),
      ]);
      setSnapshot({ regions, hubs, areas, coverages, lanes, templates });
    } catch (reason) {
      setError(networkErrorMessage(reason, "Không thể tải tổng quan mạng lưới."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const activeRegions =
    snapshot?.regions.filter((region) => region.status === "ACTIVE").length ?? 0;

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Điều hành mạng lưới"
        title="Tổng quan mạng lưới"
        description="Theo dõi cấu hình vùng, điểm trung chuyển, tuyến vận chuyển, lịch chạy và sức chứa trên một màn hình."
        help={{ description: "Đây là trang tổng quan để kiểm tra nhanh mạng lưới đã được cấu hình đến đâu trước khi vận hành vận đơn.", bullets: ["Xem số lượng vùng mạng lưới, điểm trung chuyển, vùng phục vụ và địa bàn đã phủ.", "Đi nhanh đến tuyến vận chuyển, hành trình ưu tiên, tìm tuyến và sức chứa.", "Nếu một chỉ số bằng 0, hãy cấu hình tầng đó trước khi kiểm tra tìm tuyến."] }}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCwIcon className={loading ? "size-4 animate-spin" : "size-4"} />
            Tải lại
          </Button>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <Metric
            label="Vùng mạng lưới"
            value={loading && !snapshot ? "…" : snapshot?.regions.length ?? 0}
            note={`${activeRegions} đang hoạt động`}
          />
          <Metric
            label="Điểm trung chuyển"
            value={loading && !snapshot ? "…" : snapshot?.hubs.totalItems ?? 0}
            note="Điểm vật lý trong mạng"
          />
          <Metric
            label="Vùng phục vụ"
            value={loading && !snapshot ? "…" : snapshot?.areas.totalItems ?? 0}
            note="Vùng phục vụ theo cấu hình"
          />
          <Metric
            label="Địa bàn đã phủ"
            value={loading && !snapshot ? "…" : snapshot?.coverages.totalItems ?? 0}
            note="Tỉnh/thành và phường/xã"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          <Metric label="Tuyến vận chuyển" value={loading && !snapshot ? "…" : snapshot?.lanes.totalItems ?? 0} note="Các tuyến đang cấu hình" />
          <Metric label="Hành trình ưu tiên" value={loading && !snapshot ? "…" : snapshot?.templates.totalItems ?? 0} note="Chuỗi chặng được ưu tiên" />
          <Metric label="Tìm tuyến" value="Sẵn sàng" note="Tính thời gian đến sớm nhất" />
          <Metric label="Sức chứa" value="Sẵn sàng" note="Theo từng chuyến" />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <QuickLink
          href="/network/regions"
          title="Vùng mạng lưới"
          description="Tổ chức các miền/vùng vận hành dùng chung cho toàn mạng lưới."
        />
        <QuickLink
          href="/network/hubs"
          title="Điểm trung chuyển"
          description="Quản lý trung tâm vùng, điểm tỉnh/thành và điểm địa phương theo khu vực."
        />
        <QuickLink
          href="/network/service-areas"
          title="Vùng phục vụ"
          description="Chọn điểm trung chuyển chính và quản lý phường/xã, mức phục vụ ngay trong từng vùng."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink href="/network/routes" title="Tuyến vận chuyển" description="Quản lý chặng trực tiếp, lịch chạy và hành trình ưu tiên trong cùng một màn hình." />
        <QuickLink href="/network/route-planner" title="Tìm tuyến" description="Kiểm tra hành trình theo địa chỉ, thời gian, lịch chạy và sức chứa thật." />
        <QuickLink href="/network/capacity" title="Sức chứa" description="Theo dõi tải đã giữ và còn lại trên từng chuyến." />
        <QuickLink href="/network/audit" title="Nhật ký" description="Xem lịch sử thay đổi cấu hình và giữ chỗ tải." />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-black">Thứ tự cấu hình nên dùng</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["01", "Vùng mạng lưới", "Xác định miền/vùng vận hành."],
              ["02", "Điểm trung chuyển", "Tạo các điểm vật lý trong mạng."],
              ["03", "Vùng phục vụ", "Chọn điểm chính rồi gắn tỉnh/thành, phường/xã và mức phục vụ."],
            ].map(([step, title, description]) => (
              <div key={step} className="rounded-lg border bg-muted/20 p-3.5">
                <p className="font-mono text-[0.62rem] font-black text-brand">{step}</p>
                <p className="mt-1 text-sm font-black">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
