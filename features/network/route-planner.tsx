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
import { getProvinces, getWards, planRoute } from "@/features/network/api";
import type {
  Province,
  RoutePlan,
  RoutePlanningMode,
  Ward,
} from "@/features/network/contracts";
import {
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

  useEffect(() => {
    const task = window.setTimeout(() => {
      void getProvinces()
        .then(setProvinces)
        .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Không thể tải tỉnh/thành."));
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
        .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Không thể tải phường/xã nguồn."))
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
        .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Không thể tải phường/xã đích."))
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
    try {
      setPlan(await planRoute(params));
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Không tìm được tuyến phù hợp.");
    } finally {
      setPlanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Routing diagnostics"
        title="Route Planner"
        description="Mô phỏng tuyến thật từ Province/Ward, lịch chạy và capacity hiện tại. PREFER_TEMPLATE dùng preferred route trước rồi fallback Graph; GRAPH_ONLY và TEMPLATE_ONLY dùng cho debug cấu hình."
      />

      <div className="grid gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader><p className="text-sm font-black">Điều kiện routing</p></CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-black"><MapPinIcon className="size-4 text-brand" />Origin</div>
                <div className="grid gap-3">
                  <FormField label="Tỉnh / Thành"><select className={selectClassName} value={originProvince} onChange={(event) => { setOriginProvince(event.target.value); setOriginWard(""); setOriginWards([]); }}><option value="">Chọn tỉnh/thành</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.fullName}</option>)}</select></FormField>
                  <FormField label="Phường / Xã"><select className={selectClassName} value={originWard} disabled={!originProvince || loadingOrigin} onChange={(event) => setOriginWard(event.target.value)}><option value="">{loadingOrigin ? "Đang tải..." : "Chọn phường/xã"}</option>{originWards.map((ward) => <option key={ward.code} value={ward.code}>{ward.fullName}</option>)}</select></FormField>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-3 flex items-center gap-2 text-xs font-black"><MapPinIcon className="size-4 text-brand" />Destination</div>
                <div className="grid gap-3">
                  <FormField label="Tỉnh / Thành"><select className={selectClassName} value={destinationProvince} onChange={(event) => { setDestinationProvince(event.target.value); setDestinationWard(""); setDestinationWards([]); }}><option value="">Chọn tỉnh/thành</option>{provinces.map((province) => <option key={province.code} value={province.code}>{province.fullName}</option>)}</select></FormField>
                  <FormField label="Phường / Xã"><select className={selectClassName} value={destinationWard} disabled={!destinationProvince || loadingDestination} onChange={(event) => setDestinationWard(event.target.value)}><option value="">{loadingDestination ? "Đang tải..." : "Chọn phường/xã"}</option>{destinationWards.map((ward) => <option key={ward.code} value={ward.code}>{ward.fullName}</option>)}</select></FormField>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <FormField label="Khối lượng (kg)"><Input name="shipmentWeightKg" type="number" min="0.001" step="0.001" defaultValue="10" /></FormField>
                <FormField label="Ready at" hint="Để trống = thời điểm hiện tại."><Input name="readyAt" type="datetime-local" /></FormField>
              </div>
              <FormField label="Planning mode"><select className={selectClassName} value={mode} onChange={(event) => setMode(event.target.value as RoutePlanningMode)}>{planningModes.map((item) => <option key={item} value={item}>{planningModeLabel(item)}</option>)}</select></FormField>
              <Button type="submit" disabled={planning}>{planning ? <LoaderCircleIcon className="size-4 animate-spin" /> : <RouteIcon className="size-4" />}Tìm tuyến</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between"><div><p className="text-sm font-black">Kết quả planner</p><p className="mt-1 text-xs text-muted-foreground">Earliest arrival có tính wait time, transfer buffer và capacity.</p></div>{plan ? <span className="rounded-full border bg-brand/5 px-3 py-1 text-xs font-black text-brand">{routeSourceLabel(plan.source)}</span> : null}</CardHeader>
          {!plan ? (
            <div className="grid min-h-96 place-items-center p-6 text-center"><div><RouteIcon className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 text-sm font-black">Chưa có route plan</p><p className="mt-1 text-xs text-muted-foreground">Nhập hai đầu tuyến rồi chạy planner.</p></div></div>
          ) : (
            <CardContent className="space-y-5">
              <div className="grid overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-3"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Tuyến</p><p className="mt-1 text-sm font-black">{plan.originHubCode} → {plan.destinationHubCode}</p></div>
                <div className="border-t p-3 sm:border-l sm:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Journey</p><p className="mt-1 text-sm font-black">{plan.totalJourneyMinutes.toLocaleString("vi-VN")} phút</p></div>
                <div className="border-t p-3 lg:border-l lg:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Arrival</p><p className="mt-1 text-sm font-black">{formatDateTime(plan.arrivalAt)}</p></div>
                <div className="border-t p-3 sm:border-l lg:border-t-0"><p className="text-[0.6rem] font-black uppercase text-muted-foreground">Template</p><p className="mt-1 text-sm font-black">{plan.routeTemplateCode ? `${plan.routeTemplateCode} · rev ${plan.routeTemplateRevision}` : "Không dùng"}</p></div>
              </div>

              {plan.legs.length ? <div className="space-y-3">{plan.legs.map((leg) => <div key={`${leg.sequence}-${leg.scheduleId}`} className="rounded-xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-brand/10 text-[0.65rem] font-black text-brand">{leg.sequence}</span><span className="font-mono text-xs font-black">{leg.laneCode}</span><span className="rounded-full border px-2 py-1 text-[0.6rem] font-black">{transportModeLabel(leg.transportMode)}</span></div><div className="mt-2 flex items-center gap-2 text-sm font-black"><span>{leg.fromHubCode}</span><ArrowRightIcon className="size-4 text-muted-foreground" /><span>{leg.toHubCode}</span></div></div><div className="text-right text-xs"><p className="font-black">{formatDateTime(leg.departureAt)}</p><p className="mt-1 text-muted-foreground">→ {formatDateTime(leg.arrivalAt)}</p></div></div><div className="mt-3 grid gap-2 rounded-lg bg-muted/25 p-3 text-xs sm:grid-cols-4"><div><p className="text-muted-foreground">Wait</p><p className="font-black">{leg.waitMinutes}m</p></div><div><p className="text-muted-foreground">Transit</p><p className="font-black">{leg.transitMinutes}m</p></div><div><p className="text-muted-foreground">Capacity còn</p><p className="font-black">{Number(leg.remainingCapacityKg).toLocaleString("vi-VN")} kg</p></div><div><p className="text-muted-foreground">Service date</p><p className="font-black">{leg.serviceDate}</p></div></div></div>)}</div> : <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Origin và destination resolve về cùng một Hub; không cần inter-hub lane.</div>}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
