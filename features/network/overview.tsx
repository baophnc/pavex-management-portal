"use client";

import { RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCoverages, getHubs, getLanes, getRegions, getRouteTemplates, getServiceAreas } from "@/features/network/api";
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
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải tổng quan Network.",
      );
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
        eyebrow="Network control"
        title="Cấu hình mạng lưới"
        description="Quản trị toàn bộ Network từ vùng phục vụ đến transport graph, Route Template, planner và capacity. Foundation xác định điểm vào/ra; routing layer quyết định hàng đi chuyến nào và còn tải hay không."
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
            label="Region"
            value={loading && !snapshot ? "…" : snapshot?.regions.length ?? 0}
            note={`${activeRegions} đang hoạt động`}
          />
          <Metric
            label="Hub"
            value={loading && !snapshot ? "…" : snapshot?.hubs.totalItems ?? 0}
            note="Điểm vật lý trong mạng"
          />
          <Metric
            label="Service area"
            value={loading && !snapshot ? "…" : snapshot?.areas.totalItems ?? 0}
            note="Vùng phục vụ logic"
          />
          <Metric
            label="Coverage"
            value={loading && !snapshot ? "…" : snapshot?.coverages.totalItems ?? 0}
            note="Province / Ward mapping"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          <Metric label="Lane" value={loading && !snapshot ? "…" : snapshot?.lanes.totalItems ?? 0} note="Transport graph edges" />
          <Metric label="Route template" value={loading && !snapshot ? "…" : snapshot?.templates.totalItems ?? 0} note="Preferred routes" />
          <Metric label="Planner" value="LIVE" note="Earliest arrival" />
          <Metric label="Capacity" value="LIVE" note="Per departure" />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QuickLink
          href="/network/regions"
          title="Regions"
          description="Tổ chức vùng vận hành động thay vì hard-code province → miền."
        />
        <QuickLink
          href="/network/hubs"
          title="Hubs"
          description="Tạo Gateway, Hub tỉnh và Hub địa phương; hierarchy chỉ phục vụ quản trị."
        />
        <QuickLink
          href="/network/service-areas"
          title="Service Areas"
          description="Gắn một vùng phục vụ với Region và Primary Hub đang vận hành."
        />
        <QuickLink
          href="/network/coverage"
          title="Coverage"
          description="Map Province/Ward vào Service Area với tier Standard, Remote hoặc Island."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <QuickLink href="/network/lanes" title="Lanes & Schedules" description="Nối Hub bằng ROAD/AIR/RAIL/SEA và cấu hình nhiều chuyến theo ngày." />
        <QuickLink href="/network/route-templates" title="Route Templates" description="Định nghĩa preferred route có priority và revision." />
        <QuickLink href="/network/route-planner" title="Route Planner" description="Test tuyến theo Ward, thời gian, lịch chạy và capacity thật." />
        <QuickLink href="/network/capacity" title="Capacity" description="Theo dõi tải đã cấp và còn lại trên từng departure." />
        <QuickLink href="/network/audit" title="Audit" description="Xem lịch sử thay đổi cấu hình và capacity reservation." />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-black">Thứ tự cấu hình nên dùng</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["01", "Region", "Xác định miền/vùng vận hành."],
              ["02", "Hub", "Tạo các điểm vật lý trong mạng."],
              ["03", "Service Area", "Chọn Primary Hub cho vùng phục vụ."],
              ["04", "Coverage", "Gắn Province/Ward vào Service Area."],
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
