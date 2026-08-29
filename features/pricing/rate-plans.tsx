"use client";

import {
  ArchiveIcon,
  CopyPlusIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  activateRatePlan,
  createRatePlan,
  createRatePlanRevision,
  deleteRatePlan,
  deleteRateRule,
  getRatePlans,
  retireRatePlan,
  updateRatePlan,
  upsertRateRule,
} from "@/features/pricing/api";
import type {
  CreateRatePlanPayload,
  PricingZone,
  RatePlan,
  RatePlanPayload,
  RatePlanStatus,
  RateRulePayload,
  ServiceLevel,
} from "@/features/pricing/contracts";
import {
  pricingZoneLabel,
  serviceLevelLabel,
  pricingZones,
  serviceLevels,
} from "@/features/pricing/contracts";
import { pricingErrorMessage } from "@/features/pricing/errors";
import {
  dateTime,
  money,
  percent,
  PricingConfirmDialog,
  PricingError,
  PricingField,
  PricingLoading,
  PricingPageHeader,
  PricingStatusBadge,
} from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

const emptyPolicy: RatePlanPayload = {
  name: "",
  effectiveFrom: null,
  effectiveTo: null,
  quoteTtlMinutes: 30,
  volumetricDivisor: 5000,
  remoteEndpointSurcharge: 0,
  islandTransportRate: 0,
  codFreeThreshold: 0,
  codRate: 0,
  codMinimumFee: 0,
  maximumCod: 20_000_000,
  insuranceFreeThreshold: 0,
  insuranceRate: 0,
  maximumDeclaredValue: 20_000_000,
  maxParcelWeightKg: 30,
  maxShipmentChargeableWeightKg: 30,
  maxDimensionCm: 200,
};

const emptyRule: RateRulePayload = {
  baseFee: 0,
  includedWeightKg: 2,
  additionalWeightStepKg: 0.5,
  additionalWeightStepFee: 0,
  estimatedMinDays: 1,
  estimatedMaxDays: 2,
};

function policyOf(plan: RatePlan): RatePlanPayload {
  return {
    name: plan.name,
    effectiveFrom: plan.effectiveFrom,
    effectiveTo: plan.effectiveTo,
    quoteTtlMinutes: plan.quoteTtlMinutes,
    volumetricDivisor: plan.volumetricDivisor,
    remoteEndpointSurcharge: plan.remoteEndpointSurcharge,
    islandTransportRate: plan.islandTransportRate,
    codFreeThreshold: plan.codFreeThreshold,
    codRate: plan.codRate,
    codMinimumFee: plan.codMinimumFee,
    maximumCod: plan.maximumCod,
    insuranceFreeThreshold: plan.insuranceFreeThreshold,
    insuranceRate: plan.insuranceRate,
    maximumDeclaredValue: plan.maximumDeclaredValue,
    maxParcelWeightKg: plan.maxParcelWeightKg,
    maxShipmentChargeableWeightKg: plan.maxShipmentChargeableWeightKg,
    maxDimensionCm: plan.maxDimensionCm,
  };
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromLocalDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function ruleKey(level: ServiceLevel, zone: PricingZone) {
  return `${level}:${zone}`;
}

function ruleOf(plan: RatePlan, level: ServiceLevel, zone: PricingZone) {
  return plan.rules.find((rule) => rule.serviceLevel === level && rule.pricingZone === zone) ?? null;
}

function RuleEditor({
  plan,
  level,
  zone,
  canManage,
  onSaved,
}: {
  plan: RatePlan;
  level: ServiceLevel;
  zone: PricingZone;
  canManage: boolean;
  onSaved: (plan: RatePlan) => void;
}) {
  const existing = ruleOf(plan, level, zone);
  const [form, setForm] = useState<RateRulePayload>(() => existing ? {
    baseFee: existing.baseFee,
    includedWeightKg: existing.includedWeightKg,
    additionalWeightStepKg: existing.additionalWeightStepKg,
    additionalWeightStepFee: existing.additionalWeightStepFee,
    estimatedMinDays: existing.estimatedMinDays,
    estimatedMaxDays: existing.estimatedMaxDays,
  } : emptyRule);
  const [saving, setSaving] = useState(false);
  const editable = canManage && plan.status === "DRAFT";

  const save = async () => {
    if (form.estimatedMaxDays < form.estimatedMinDays) {
      toast.error("Ngày giao tối đa phải lớn hơn hoặc bằng ngày giao tối thiểu.");
      return;
    }
    setSaving(true);
    try {
      const next = await upsertRateRule(plan.id, level, zone, form);
      onSaved(next);
      toast.success(`Đã lưu ${serviceLevelLabel(level)} · ${pricingZoneLabel(zone)}.`);
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể lưu quy tắc giá."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing) return;
    setSaving(true);
    try {
      const next = await deleteRateRule(plan.id, level, zone);
      onSaved(next);
      setForm(emptyRule);
      toast.success("Đã xóa quy tắc khỏi bản nháp.");
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể xóa quy tắc giá."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden", !existing && "border-dashed")}>
      <div className="flex items-start justify-between gap-3 border-b bg-muted/25 px-4 py-3">
        <div>
          <p className="text-sm font-black">{serviceLevelLabel(level)}</p>
          <p className="mt-0.5 text-[0.68rem] text-muted-foreground">{pricingZoneLabel(zone)}</p>
        </div>
        <span className={cn("rounded-full border px-2 py-1 text-[0.6rem] font-black", existing ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{existing ? "Đã cấu hình" : "Còn thiếu"}</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <PricingField label="Phí cơ bản"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={form.baseFee} onChange={(event) => setForm((value) => ({ ...value, baseFee: Number(event.target.value) }))} /></PricingField>
        <PricingField label="Bao gồm đến (kg)"><Input type="number" min={0} step={0.1} disabled={!editable || saving} value={form.includedWeightKg} onChange={(event) => setForm((value) => ({ ...value, includedWeightKg: Number(event.target.value) }))} /></PricingField>
        <PricingField label="Mỗi bước cân thêm (kg)"><Input type="number" min={0.01} step={0.1} disabled={!editable || saving} value={form.additionalWeightStepKg} onChange={(event) => setForm((value) => ({ ...value, additionalWeightStepKg: Number(event.target.value) }))} /></PricingField>
        <PricingField label="Phí mỗi bước cân"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={form.additionalWeightStepFee} onChange={(event) => setForm((value) => ({ ...value, additionalWeightStepFee: Number(event.target.value) }))} /></PricingField>
        <PricingField label="SLA tối thiểu (ngày)"><Input type="number" min={0} step={1} disabled={!editable || saving} value={form.estimatedMinDays} onChange={(event) => setForm((value) => ({ ...value, estimatedMinDays: Number(event.target.value) }))} /></PricingField>
        <PricingField label="SLA tối đa (ngày)"><Input type="number" min={0} step={1} disabled={!editable || saving} value={form.estimatedMaxDays} onChange={(event) => setForm((value) => ({ ...value, estimatedMaxDays: Number(event.target.value) }))} /></PricingField>
      </div>
      {editable ? (
        <div className="flex justify-end gap-2 border-t px-4 py-3">
          {existing ? <Button variant="ghost" size="sm" disabled={saving} onClick={() => void remove()}><Trash2Icon className="size-3.5" />Xóa quy tắc</Button> : null}
          <Button size="sm" disabled={saving} onClick={() => void save()}>{saving ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}Lưu quy tắc</Button>
        </div>
      ) : null}
    </Card>
  );
}

export function PricingRatePlans() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("pricing.manage");
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [selected, setSelected] = useState<RatePlan | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const [policy, setPolicy] = useState<RatePlanPayload>(emptyPolicy);
  const [status, setStatus] = useState<RatePlanStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateRatePlanPayload>({ ...emptyPolicy, code: "", revision: 1 });
  const [dialog, setDialog] = useState<"activate" | "retire" | "delete" | "revision" | null>(null);

  useEffect(() => {
    let active = true;
    getRatePlans(status)
      .then((items) => {
        if (!active) return;
        setPlans(items);
        const selectedId = selectedIdRef.current;
        const next = selectedId
          ? items.find((item) => item.id === selectedId) ?? items[0] ?? null
          : items[0] ?? null;
        selectedIdRef.current = next?.id ?? null;
        setSelected(next);
        if (next) setPolicy(policyOf(next));
        setError(null);
      })
      .catch((reason) => {
        if (active) setError(pricingErrorMessage(reason, "Không thể tải danh sách bảng giá."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, refreshKey]);

  const selectPlan = (plan: RatePlan) => {
    selectedIdRef.current = plan.id;
    setSelected(plan);
    setPolicy(policyOf(plan));
  };

  const replacePlan = (next: RatePlan) => {
    selectedIdRef.current = next.id;
    setSelected(next);
    setPolicy(policyOf(next));
    setPlans((items) => items.some((item) => item.id === next.id)
      ? items.map((item) => item.id === next.id ? next : item)
      : [next, ...items]);
  };

  const savePolicy = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      replacePlan(await updateRatePlan(selected.id, policy));
      toast.success("Đã cập nhật chính sách bảng giá.");
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể cập nhật bảng giá."));
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    if (!createForm.code.trim() || !createForm.name.trim()) {
      toast.error("Vui lòng nhập mã và tên bảng giá.");
      return;
    }
    setSaving(true);
    try {
      const next = await createRatePlan(createForm);
      setCreateOpen(false);
      setCreateForm({ ...emptyPolicy, code: "", revision: 1 });
      setStatus("");
      replacePlan(next);
      toast.success("Đã tạo bảng giá nháp.");
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể tạo bảng giá."));
    } finally {
      setSaving(false);
    }
  };

  const runLifecycle = async (reason: string) => {
    if (!selected || !dialog) return;
    setSaving(true);
    try {
      if (dialog === "activate") {
        replacePlan(await activateRatePlan(selected.id, reason));
        toast.success("Bảng giá đã bắt đầu áp dụng.");
      } else if (dialog === "retire") {
        replacePlan(await retireRatePlan(selected.id, reason));
        toast.success("Đã ngừng áp dụng bảng giá.");
      } else if (dialog === "revision") {
        const next = await createRatePlanRevision(selected.id, { reason });
        setStatus("");
        replacePlan(next);
        toast.success(`Đã tạo phiên bản ${next.revision} ở trạng thái bản nháp.`);
      } else if (dialog === "delete") {
        await deleteRatePlan(selected.id, reason);
        const remaining = plans.filter((item) => item.id !== selected.id);
        setPlans(remaining);
        const next = remaining[0] ?? null;
        setSelected(next);
        if (next) setPolicy(policyOf(next));
        toast.success("Đã xóa bảng giá nháp.");
      }
      setDialog(null);
    } catch (reasonValue) {
      toast.error(pricingErrorMessage(reasonValue, "Không thể hoàn tất thao tác."));
    } finally {
      setSaving(false);
    }
  };

  const missingRules = useMemo(() => {
    if (!selected) return 6;
    return serviceLevels.flatMap((level) => pricingZones.map((zone) => ruleKey(level, zone)))
      .filter((key) => !selected.rules.some((rule) => ruleKey(rule.serviceLevel, rule.pricingZone) === key)).length;
  }, [selected]);

  const editable = Boolean(selected && selected.status === "DRAFT" && canManage);

  return (
    <div className="grid gap-4">
      <PricingPageHeader
        eyebrow="Pricing"
        title="Bảng giá & phiên bản"
        description="Quản lý chính sách giá theo phiên bản. Bảng giá đang áp dụng là bất biến; mọi thay đổi nên được chuẩn bị ở một bản nháp mới rồi mới kích hoạt."
        help={{
          description: "Một bảng giá chứa chính sách chung và 6 quy tắc giá. Chỉ DRAFT được sửa để quote đã phát hành không bị thay đổi giá ngược về sau.",
          bullets: ["Đủ 6 quy tắc trước khi kích hoạt.", "Không để hai bảng giá ACTIVE chồng lấn thời gian.", "Tạo phiên bản mới từ bảng giá cũ để thay đổi an toàn."],
        }}
        actions={<><Button variant="outline" onClick={() => { setLoading(true); setRefreshKey((value) => value + 1); }}><RefreshCwIcon className="size-4" />Làm mới</Button>{canManage ? <Button onClick={() => setCreateOpen(true)}><PlusIcon className="size-4" />Tạo bảng giá</Button> : null}</>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border bg-background px-3 text-xs font-bold" value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value as RatePlanStatus | ""); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang áp dụng</option>
          <option value="RETIRED">Đã ngừng áp dụng</option>
        </select>
        <span className="text-xs text-muted-foreground">{plans.length} phiên bản</span>
      </div>

      {loading ? <PricingLoading /> : error ? <PricingError message={error} onRetry={() => { setLoading(true); setRefreshKey((value) => value + 1); }} /> : (
        <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <div className="grid content-start gap-2">
            {plans.length ? plans.map((plan) => (
              <button key={plan.id} type="button" className={cn("w-full rounded-xl border bg-card p-4 text-left transition hover:border-brand/30", selected?.id === plan.id && "border-brand/40 ring-2 ring-brand/10")} onClick={() => selectPlan(plan)}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{plan.name}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">Phiên bản {plan.revision} · cập nhật {dateTime(plan.updatedAt)}</p></div><PricingStatusBadge status={plan.status} /></div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-[0.68rem]"><span>{plan.ruleCount}/6 quy tắc</span><span className="text-muted-foreground">{plan.quoteTtlMinutes} phút / quote</span></div>
              </button>
            )) : <Card className="p-5 text-sm text-muted-foreground">Chưa có bảng giá phù hợp bộ lọc.</Card>}
          </div>

          {selected ? (
            <div className="grid min-w-0 gap-4">
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b bg-muted/25 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{selected.name}</h2><PricingStatusBadge status={selected.status} /><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">Phiên bản {selected.revision}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">Hiệu lực: {dateTime(selected.effectiveFrom)} → {dateTime(selected.effectiveTo)}</p>
                  </div>
                  {canManage ? <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialog("revision")}><CopyPlusIcon className="size-3.5" />Tạo phiên bản mới</Button>
                    {selected.status === "DRAFT" ? <Button size="sm" disabled={missingRules > 0} title={missingRules > 0 ? `Còn thiếu ${missingRules} quy tắc` : undefined} onClick={() => setDialog("activate")}>Bắt đầu áp dụng</Button> : null}
                    {selected.status === "ACTIVE" ? <Button variant="outline" size="sm" onClick={() => setDialog("retire")}><ArchiveIcon className="size-3.5" />Ngừng áp dụng</Button> : null}
                    {selected.status === "DRAFT" ? <Button variant="destructive" size="sm" onClick={() => setDialog("delete")}><Trash2Icon className="size-3.5" />Xóa bản nháp</Button> : null}
                  </div> : null}
                </div>
                {missingRules > 0 && selected.status === "DRAFT" ? <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-200">Còn thiếu {missingRules}/6 quy tắc. Bảng giá chưa thể kích hoạt.</div> : null}
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <PricingField label="Tên bảng giá"><Input disabled={!editable || saving} value={policy.name} onChange={(event) => setPolicy((value) => ({ ...value, name: event.target.value }))} /></PricingField>
                  <PricingField label="Bắt đầu hiệu lực"><Input type="datetime-local" disabled={!editable || saving} value={toLocalDateTime(policy.effectiveFrom)} onChange={(event) => setPolicy((value) => ({ ...value, effectiveFrom: fromLocalDateTime(event.target.value) }))} /></PricingField>
                  <PricingField label="Kết thúc hiệu lực"><Input type="datetime-local" disabled={!editable || saving} value={toLocalDateTime(policy.effectiveTo)} onChange={(event) => setPolicy((value) => ({ ...value, effectiveTo: fromLocalDateTime(event.target.value) }))} /></PricingField>
                  <PricingField label="Quote hiệu lực (phút)"><Input type="number" min={1} max={240} disabled={!editable || saving} value={policy.quoteTtlMinutes} onChange={(event) => setPolicy((value) => ({ ...value, quoteTtlMinutes: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Hệ số khối lượng quy đổi"><Input type="number" min={100} step={100} disabled={!editable || saving} value={policy.volumetricDivisor} onChange={(event) => setPolicy((value) => ({ ...value, volumetricDivisor: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Phụ phí vùng xa / đầu"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.remoteEndpointSurcharge} onChange={(event) => setPolicy((value) => ({ ...value, remoteEndpointSurcharge: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Phụ phí hải đảo" hint="Nhập dạng 0.2 = 20%"><Input type="number" min={0} max={1} step={0.01} disabled={!editable || saving} value={policy.islandTransportRate} onChange={(event) => setPolicy((value) => ({ ...value, islandTransportRate: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="COD miễn phí đến"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.codFreeThreshold} onChange={(event) => setPolicy((value) => ({ ...value, codFreeThreshold: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Tỷ lệ phí COD" hint="Nhập dạng 0.005 = 0,5%"><Input type="number" min={0} max={1} step={0.001} disabled={!editable || saving} value={policy.codRate} onChange={(event) => setPolicy((value) => ({ ...value, codRate: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Phí COD tối thiểu"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.codMinimumFee} onChange={(event) => setPolicy((value) => ({ ...value, codMinimumFee: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="COD tối đa"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.maximumCod} onChange={(event) => setPolicy((value) => ({ ...value, maximumCod: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Bảo hiểm miễn phí đến"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.insuranceFreeThreshold} onChange={(event) => setPolicy((value) => ({ ...value, insuranceFreeThreshold: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Tỷ lệ bảo hiểm" hint="Nhập dạng 0.005 = 0,5%"><Input type="number" min={0} max={1} step={0.001} disabled={!editable || saving} value={policy.insuranceRate} onChange={(event) => setPolicy((value) => ({ ...value, insuranceRate: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Giá trị khai báo tối đa"><Input type="number" min={0} step={1000} disabled={!editable || saving} value={policy.maximumDeclaredValue} onChange={(event) => setPolicy((value) => ({ ...value, maximumDeclaredValue: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Tối đa mỗi kiện (kg)"><Input type="number" min={0.01} step={0.5} disabled={!editable || saving} value={policy.maxParcelWeightKg} onChange={(event) => setPolicy((value) => ({ ...value, maxParcelWeightKg: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Tổng khối lượng tính cước tối đa (kg)"><Input type="number" min={0.01} step={0.5} disabled={!editable || saving} value={policy.maxShipmentChargeableWeightKg} onChange={(event) => setPolicy((value) => ({ ...value, maxShipmentChargeableWeightKg: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Kích thước mỗi chiều tối đa (cm)"><Input type="number" min={1} step={1} disabled={!editable || saving} value={policy.maxDimensionCm} onChange={(event) => setPolicy((value) => ({ ...value, maxDimensionCm: Number(event.target.value) }))} /></PricingField>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                  <p className="text-[0.68rem] text-muted-foreground">Vùng xa {money(selected.remoteEndpointSurcharge)} / đầu · Hải đảo {percent(selected.islandTransportRate)}</p>
                  {editable ? <Button disabled={saving} onClick={() => void savePolicy()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}Lưu chính sách</Button> : <p className="text-xs font-bold text-muted-foreground">Bảng giá này chỉ đọc. Hãy tạo phiên bản mới để thay đổi.</p>}
                </div>
              </Card>

              <section>
                <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-base font-black">6 quy tắc giá</h2><p className="mt-1 text-xs text-muted-foreground">Tiêu chuẩn/Nhanh cho cùng vùng phục vụ, cùng vùng mạng lưới và khác vùng mạng lưới.</p></div><span className="text-xs font-black">{selected.ruleCount}/6</span></div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {serviceLevels.flatMap((level) => pricingZones.map((zone) => <RuleEditor key={`${selected.id}:${ruleKey(level, zone)}`} plan={selected} level={level} zone={zone} canManage={canManage} onSaved={replacePlan} />))}
                </div>
              </section>
            </div>
          ) : <Card className="grid min-h-72 place-items-center p-5 text-sm text-muted-foreground">Chọn hoặc tạo một bảng giá để bắt đầu.</Card>}
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/45 p-4" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="my-6 w-full max-w-3xl rounded-2xl border bg-card shadow-2xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="border-b p-5"><h2 className="text-lg font-black">Tạo bảng giá nháp</h2><p className="mt-1 text-xs text-muted-foreground">Tạo phần chính sách trước, sau đó cấu hình đủ 6 quy tắc giá.</p></div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <PricingField label="Mã kỹ thuật" hint="Chỉ dùng để định danh/versioning; UI vận hành sẽ ưu tiên tên."><Input value={createForm.code} disabled={saving} placeholder="DOMESTIC-2026" onChange={(event) => setCreateForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))} /></PricingField>
              <PricingField label="Tên bảng giá"><Input value={createForm.name} disabled={saving} placeholder="Bảng giá nội địa tháng 09/2026" onChange={(event) => setCreateForm((value) => ({ ...value, name: event.target.value }))} /></PricingField>
              <PricingField label="Phiên bản"><Input type="number" min={1} disabled={saving} value={createForm.revision} onChange={(event) => setCreateForm((value) => ({ ...value, revision: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Quote hiệu lực (phút)"><Input type="number" min={1} max={240} disabled={saving} value={createForm.quoteTtlMinutes} onChange={(event) => setCreateForm((value) => ({ ...value, quoteTtlMinutes: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Bắt đầu hiệu lực"><Input type="datetime-local" disabled={saving} value={toLocalDateTime(createForm.effectiveFrom)} onChange={(event) => setCreateForm((value) => ({ ...value, effectiveFrom: fromLocalDateTime(event.target.value) }))} /></PricingField>
              <PricingField label="Kết thúc hiệu lực"><Input type="datetime-local" disabled={saving} value={toLocalDateTime(createForm.effectiveTo)} onChange={(event) => setCreateForm((value) => ({ ...value, effectiveTo: fromLocalDateTime(event.target.value) }))} /></PricingField>
              <PricingField label="Khối lượng tối đa mỗi kiện (kg)"><Input type="number" min={0.01} step={0.5} disabled={saving} value={createForm.maxParcelWeightKg} onChange={(event) => setCreateForm((value) => ({ ...value, maxParcelWeightKg: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Khối lượng tính cước tối đa đơn (kg)"><Input type="number" min={0.01} step={0.5} disabled={saving} value={createForm.maxShipmentChargeableWeightKg} onChange={(event) => setCreateForm((value) => ({ ...value, maxShipmentChargeableWeightKg: Number(event.target.value) }))} /></PricingField>
            </div>
            <div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>Hủy</Button><Button disabled={saving} onClick={() => void create()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Tạo bản nháp</Button></div>
          </div>
        </div>
      ) : null}

      <PricingConfirmDialog open={dialog === "activate"} title="Bắt đầu áp dụng bảng giá?" description="Sau khi kích hoạt, bảng giá trở thành bất biến. Các quote mới trong khoảng hiệu lực sẽ sử dụng phiên bản này." confirmLabel="Bắt đầu áp dụng" loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
      <PricingConfirmDialog open={dialog === "retire"} title="Ngừng áp dụng bảng giá?" description="Quote đã phát hành vẫn giữ snapshot cũ; yêu cầu tính cước mới sẽ không dùng bảng giá này nữa." confirmLabel="Ngừng áp dụng" loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
      <PricingConfirmDialog open={dialog === "delete"} title="Xóa bảng giá nháp?" description="Chỉ DRAFT được xóa. Hành động này không ảnh hưởng các quote đã phát hành từ phiên bản khác." confirmLabel="Xóa bản nháp" destructive loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
      <PricingConfirmDialog open={dialog === "revision"} title="Tạo phiên bản mới?" description="Pricing sẽ sao chép chính sách và toàn bộ quy tắc từ phiên bản đang chọn sang một DRAFT mới với số phiên bản tăng tự động." confirmLabel="Tạo phiên bản mới" loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
    </div>
  );
}
