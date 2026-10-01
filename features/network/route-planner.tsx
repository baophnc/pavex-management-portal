"use client";

import {
  ArrowRightIcon,
  LoaderCircleIcon,
  MapPinIcon,
  RouteIcon,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getHubs,
  getProvinces,
  getWards,
  planRoute,
  resolveNetworkLocation,
} from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
import type {
  Hub,
  Province,
  RoutePlan,
  RoutePlanningMode,
  ServiceAreaResolution,
  Ward,
} from "@/features/network/contracts";
import {
  coverageTierLabel,
  planningModeLabel,
  planningModes,
  routeSourceLabel,
  transportModeLabel,
} from "@/features/network/contracts";
import {
  FormField,
  NetworkPageHeader,
  selectClassName,
} from "@/features/network/ui";
import { formatDateTime } from "@/lib/utils";

export function NetworkRoutePlanner() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [originProvince, setOriginProvince] = useState("");
  const [destinationProvince, setDestinationProvince] = useState("");
  const [originWards, setOriginWards] = useState<Ward[]>([]);
  const [destinationWards, setDestinationWards] = useState<Ward[]>([]);
  const [originWard, setOriginWard] = useState("");
  const [destinationWard, setDestinationWard] = useState("");
  const [mode, setMode] = useState<RoutePlanningMode>("PREFER_TEMPLATE");
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDestination, setLoadingDestination] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [originResolution, setOriginResolution] = useState<ServiceAreaResolution | null>(null);
  const [destinationResolution, setDestinationResolution] = useState<ServiceAreaResolution | null>(null);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void Promise.all([
        getProvinces(),
        getHubs(new URLSearchParams({ page: "1", pageSize: "100" })),
      ])
        .then(([provinceItems, hubPage]) => { setProvinces(provinceItems); setHubs(hubPage.items); })
        .catch((reason) => toast.error(networkErrorMessage(reason, "Không thể tải dữ liệu định tuyến.")));
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!originProvince) return;
    const code = originProvince;
    const task = window.setTimeout(() => {
      setLoadingOrigin(true);
      void getWards(code)
        .then(setOriginWards)
        .catch((reason) => toast.error(networkErrorMessage(reason, "Không thể tải phường/xã nguồn.")))
        .finally(() => setLoadingOrigin(false));
    }, 0);
    return () => window.clearTimeout(task);
  }, [originProvince]);

  useEffect(() => {
    if (!destinationProvince) return;
    const code = destinationProvince;
    const task = window.setTimeout(() => {
      setLoadingDestination(true);
      void getWards(code)
        .then(setDestinationWards)
        .catch((reason) => toast.error(networkErrorMessage(reason, "Không thể tải phường/xã đích.")))
        .finally(() => setLoadingDestination(false));
    }, 0);
    return () => window.clearTimeout(task);
  }, [destinationProvince]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const weight = Number(form.get("shipmentWeightKg"));
    if (!originProvince || !originWard || !destinationProvince || !destinationWard) {
      toast.error("Chọn đầy đủ địa chỉ nguồn và đích.");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Khối lượng phải lớn hơn 0 kg.");
      return;
    }
    const params = new URLSearchParams({
      originProvinceCode: originProvince,
      originWardCode: originWard,
      destinationProvinceCode: destinationProvince,
      destinationWardCode: destinationWard,
      shipmentWeightKg: String(weight),
      mode,
    });
    const readyAt = String(form.get("readyAt") ?? "").trim();
    if (readyAt) params.set("readyAt", new Date(readyAt).toISOString());

    setPlanning(true);
    setPlan(null);
    setOriginResolution(null);
    setDestinationResolution(null);
    try {
      const [nextPlan, origin, destination] = await Promise.all([
        planRoute(params),
        resolveNetworkLocation(originProvince, originWard),
        resolveNetworkLocation(destinationProvince, destinationWard),
      ]);
      setPlan(nextPlan);
      setOriginResolution(origin);
      setDestinationResolution(destination);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không tìm được tuyến phù hợp."));
    } finally {
      setPlanning(false);
    }
  }

  function hubName(id: string, fallback: string) {
    return hubs.find((hub) => hub.id === id)?.name ?? fallback;
  }

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Kiểm tra định tuyến"
        title="Tìm tuyến"
        description="Mô phỏng hành trình từ địa chỉ gửi đến địa chỉ nhận dựa trên lịch chạy, thời gian chờ và sức chứa hiện tại."
        help={{ description: "Dùng trang này để kiểm tra mạng lưới trước khi đưa vào sử dụng hoặc khi cần tìm nguyên nhân sự cố của vận đơn.", bullets: ["Chọn xã/phường gửi, nhận và khối lượng hàng.", "Chế độ ưu tiên hành trình đã cấu hình sẽ thử hành trình do vận hành thiết lập trước.", "Kết quả cho biết từng chặng, giờ đi, giờ đến, thời gian chờ và sức chứa còn lại."] }}
      />

      <div className="grid gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader><p className="text-sm font-black">Điều kiện tìm tuyến</p></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-black"><MapPinIcon className="size-4 text-brand" />Điểm gửi</div>
                <div className="grid gap-3">
                  <FormField label="Tỉnh / Thành"><select className={selectClassName} value={originProvince} onChange={(event) => { setOriginProvince(event.target.value); setOriginWard(""); setOriginWards([]); }}><option value="">Chọn tỉnh/thành</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.fullName}</option>)}</select></FormField>
                  <FormField label="Phường / Xã"><select className={selectClassName} value={originWard} disabled={!originProvince || loadingOrigin} onChange={(event) => setOriginWard(event.target.value)}><option value="">{loadingOrigin ? "Đang tải..." : "Chọn phường/xã"}</option>{originWards.map((ward) => <option key={ward.code} value={ward.code}>{ward.fullName}</option>)}</select></FormField>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-black"><MapPinIcon className="size-4 text-brand" />Điểm nhận</div>
                <div className="grid gap-3">
                  <FormField label="Tỉnh / Thành"><select className={selectClassName} value={destinationProvince} onChange={(event) => { setDestinationProvince(event.target.value); setDestinationWard(""); setDestinationWards([]); }}><option value="">Chọn tỉnh/thành</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.fullName}</option>)}</select></FormField>
                  <FormField label="Phường / Xã"><select className={selectClassName} value={destinationWard} disabled={!destinationProvince || loadingDestination} onChange={(event) => setDestinationWard(event.target.value)}><option value="">{loadingDestination ? "Đang tải..." : "Chọn phường/xã"}</option>{destinationWards.map((ward) => <option key={ward.code} value={ward.code}>{ward.fullName}</option>)}</select></FormField>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <FormField label="Khối lượng (kg)"><Input name="shipmentWeightKg" type="number" min="0.001" step="0.001" defaultValue="10" /></FormField>
                <FormField label="Sẵn sàng từ" hint="Để trống = thời điểm hiện tại."><Input name="readyAt" type="datetime-local" /></FormField>
              </div>
              <FormField label="Cách tìm tuyến"><select className={selectClassName} value={mode} onChange={(event) => setMode(event.target.value as RoutePlanningMode)}>{planningModes.map((item) => <option key={item} value={item}>{planningModeLabel(item)}</option>)}</select></FormField>
              <Button type="submit" disabled={planning}>{planning ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}Tìm tuyến</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between"><div><p className="text-sm font-black">Kết quả tìm tuyến</p><p className="mt-1 text-xs text-muted-foreground">Hệ thống tính cả thời gian chờ, thời gian chuyển tiếp và sức chứa còn lại.</p></div>{plan ? <span className="rounded-full border bg-brand/5 px-3 py-1 text-xs font-black text-brand">{routeSourceLabel(plan.source)}</span> : null}</CardHeader>
          {!plan ? (
            <div className="grid min-h-96 place-items-center p-6 text-center"><div><RouteIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-black">Chưa có kết quả</p><p className="mt-1 text-xs text-muted-foreground">Chọn điểm gửi, điểm nhận rồi bấm Tìm tuyến.</p></div></div>
          ) : (
            <CardContent className="space-y-5">
              {originResolution && destinationResolution ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Điểm gửi", originResolution],
                    ["Điểm nhận", destinationResolution],
                  ].map(([label, resolution]) => {
                    const item = resolution as ServiceAreaResolution;
                    return (
                      <div key={String(label)} className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-muted-foreground">{String(label)}</p>
                          <span className="rounded-full border px-2 py-1 text-[0.6rem] font-black">{coverageTierLabel(item.coverageTier)}</span>
                        </div>
                        <p className="mt-2 text-sm font-black">{item.serviceAreaName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.regionName} · {item.primaryHubName}</p>
                        <p className="mt-2 font-mono text-[0.62rem] text-muted-foreground">Khớp theo {item.matchedBy === "WARD" ? "phường/xã" : "tỉnh/thành"}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="grid overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-3"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Tuyến</p><p className="mt-1 text-sm font-black">{hubName(plan.originHubId, "Điểm gửi")} → {hubName(plan.destinationHubId, "Điểm nhận")}</p></div>
                <div className="border-t p-3 sm:border-l sm:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Tổng thời gian</p><p className="mt-1 text-sm font-black">{plan.totalJourneyMinutes.toLocaleString("vi-VN")} phút</p></div>
                <div className="border-t p-3 lg:border-l lg:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Dự kiến đến</p><p className="mt-1 text-sm font-black">{formatDateTime(plan.arrivalAt)}</p></div>
                <div className="border-t p-3 sm:border-l lg:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Tuyến ưu tiên</p><p className="mt-1 text-sm font-black">{plan.routeTemplateCode ? `Có dùng · phiên bản ${plan.routeTemplateRevision}` : "Không dùng"}</p></div>
              </div>

              {plan.legs.length ? <div className="space-y-3">{plan.legs.map((leg) => <div key={`${leg.sequence}-${leg.scheduleId}`} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-brand/10 text-[0.65rem] font-black text-brand">{leg.sequence}</span><span className="rounded-full border px-2 py-1 text-[0.6rem] font-black">{transportModeLabel(leg.transportMode)}</span></div><div className="mt-2 flex items-center gap-2 text-sm font-black"><span>{hubName(leg.fromHubId, "Điểm đi")}</span><ArrowRightIcon className="size-4 text-muted-foreground" /><span>{hubName(leg.toHubId, "Điểm đến")}</span></div></div><div className="text-right text-xs"><p className="font-black">{formatDateTime(leg.departureAt)}</p><p className="mt-1 text-muted-foreground">→ {formatDateTime(leg.arrivalAt)}</p></div></div><div className="mt-3 grid gap-2 rounded-lg bg-muted/25 p-3 text-xs sm:grid-cols-4"><div><p className="text-muted-foreground">Chờ</p><p className="font-black">{leg.waitMinutes}m</p></div><div><p className="text-muted-foreground">Di chuyển</p><p className="font-black">{leg.transitMinutes}m</p></div><div><p className="text-muted-foreground">Sức chứa còn</p><p className="font-black">{Number(leg.remainingCapacityKg).toLocaleString("vi-VN")} kg</p></div><div><p className="text-muted-foreground">Ngày chạy</p><p className="font-black">{leg.serviceDate}</p></div></div></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Điểm gửi và điểm nhận thuộc cùng một điểm trung chuyển nên không cần tuyến liên vùng.</div>}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
