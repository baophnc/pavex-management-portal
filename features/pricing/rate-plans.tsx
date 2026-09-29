"use client";

import {
  ArchiveIcon,
  CopyPlusIcon,
  LoaderCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  Trash2Icon,
  Undo2Icon,
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
  RateRule,
  RateRulePayload,
  ServiceLevel,
} from "@/features/pricing/contracts";
import {
  pricingZoneLabel,
  ratePlanPhase,
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
  PricingMoneyInput,
  PricingPageHeader,
  PricingPercentInput,
  PricingStatusBadge,
  thousandHint,
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

const ruleColumns: Array<{ field: keyof RateRulePayload; label: string; money?: boolean; min?: number; step?: number }> = [
  { field: "baseFee", label: "Phí cơ bản", money: true },
  { field: "includedWeightKg", label: "Bao gồm đến (kg)", min: 0, step: 0.1 },
  { field: "additionalWeightStepKg", label: "Mỗi bước cân thêm (kg)", min: 0.01, step: 0.1 },
  { field: "additionalWeightStepFee", label: "Phí mỗi bước cân", money: true },
  { field: "estimatedMinDays", label: "Giao sớm nhất (ngày)", min: 0, step: 1 },
  { field: "estimatedMaxDays", label: "Giao chậm nhất (ngày)", min: 0, step: 1 },
];

const ruleSlots = serviceLevels.flatMap((level) => pricingZones.map((zone) => ({ level, zone, key: ruleKey(level, zone) })));

function rulePayload(rule: RateRule): RateRulePayload {
  return {
    baseFee: rule.baseFee,
    includedWeightKg: rule.includedWeightKg,
    additionalWeightStepKg: rule.additionalWeightStepKg,
    additionalWeightStepFee: rule.additionalWeightStepFee,
    estimatedMinDays: rule.estimatedMinDays,
    estimatedMaxDays: rule.estimatedMaxDays,
  };
}

function savedDrafts(plan: RatePlan): Record<string, RateRulePayload> {
  return Object.fromEntries(ruleSlots.map(({ level, zone, key }) => {
    const existing = ruleOf(plan, level, zone);
    return [key, existing ? rulePayload(existing) : emptyRule];
  }));
}

/** All 6 rules side by side, so a price change across zones is edited and saved in one go. */
function RuleTable({
  plan,
  canManage,
  onSaved,
}: {
  plan: RatePlan;
  canManage: boolean;
  onSaved: (plan: RatePlan) => void;
}) {
  const [drafts, setDrafts] = useState(() => savedDrafts(plan));
  // Missing rules only count as changed once edited, so untouched defaults are never saved as a price.
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const editable = canManage && plan.status === "DRAFT";

  const changed = ruleSlots.filter(({ level, zone, key }) => {
    const existing = ruleOf(plan, level, zone);
    return existing
      ? ruleColumns.some(({ field }) => existing[field] !== drafts[key][field])
      : touched.has(key);
  });

  const update = (key: string, field: keyof RateRulePayload, value: number) => {
    setDrafts((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
    setTouched((current) => new Set(current).add(key));
  };

  const saveAll = async () => {
    const backwards = changed.find(({ key }) => drafts[key].estimatedMaxDays < drafts[key].estimatedMinDays);
    if (backwards) {
      toast.error(`${serviceLevelLabel(backwards.level)} · ${pricingZoneLabel(backwards.zone)}: ngày giao chậm nhất phải lớn hơn hoặc bằng ngày giao sớm nhất.`);
      return;
    }
    const noStep = changed.find(({ key }) => !(drafts[key].additionalWeightStepKg > 0));
    if (noStep) {
      toast.error(`${serviceLevelLabel(noStep.level)} · ${pricingZoneLabel(noStep.zone)}: bước cân thêm phải lớn hơn 0 kg.`);
      return;
    }

    setSaving(true);
    let latest: RatePlan | null = null;
    let saved = 0;
    try {
      // One request per rule; stop at the first failure so the admin sees exactly what is left.
      for (const { level, zone, key } of changed) {
        latest = await upsertRateRule(plan.id, level, zone, drafts[key]);
        saved += 1;
      }
      setTouched(new Set());
      toast.success(`Đã lưu ${saved} quy tắc giá.`);
    } catch (reason) {
      const prefix = saved ? `Đã lưu ${saved}/${changed.length} quy tắc. ` : "";
      toast.error(prefix + pricingErrorMessage(reason, "Không thể lưu quy tắc giá."));
    } finally {
      if (latest) onSaved(latest);
      setSaving(false);
    }
  };

  const remove = async (level: ServiceLevel, zone: PricingZone, key: string) => {
    setSaving(true);
    try {
      onSaved(await deleteRateRule(plan.id, level, zone));
      setDrafts((current) => ({ ...current, [key]: emptyRule }));
      setTouched((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
      toast.success("Đã xóa quy tắc khỏi bản nháp.");
    } catch (reason) {
      toast.error(pricingErrorMessage(reason, "Không thể xóa quy tắc giá."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-xs">
          <thead className="bg-muted/35 text-left text-[0.62rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5">Dịch vụ · vùng</th>
              {ruleColumns.map((column) => <th key={column.field} className="px-2 py-2.5">{column.label}</th>)}
              {editable ? <th className="w-10 px-2 py-2.5"><span className="sr-only">Xóa</span></th> : null}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ruleSlots.map(({ level, zone, key }) => {
              const existing = ruleOf(plan, level, zone);
              const draft = drafts[key];
              const rowChanged = changed.some((item) => item.key === key);
              return (
                <tr key={key} className={cn(rowChanged && "bg-brand/[0.04]")}>
                  <td className="px-3 py-2.5 align-top">
                    <p className="font-black">{serviceLevelLabel(level)}</p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground">{pricingZoneLabel(zone)}</p>
                    <span className={cn(
                      "mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[0.58rem] font-black",
                      rowChanged ? "border-brand/25 bg-brand/10 text-brand"
                        : existing ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}>
                      {rowChanged ? "Chưa lưu" : existing ? "Đã cấu hình" : "Còn thiếu"}
                    </span>
                  </td>
                  {ruleColumns.map((column) => (
                    <td key={column.field} className="px-2 py-2.5 align-top">
                      {column.money ? (
                        <>
                          <PricingMoneyInput disabled={!editable || saving} value={draft[column.field]} onValueChange={(value) => update(key, column.field, value)} />
                          <div className="mt-1 text-[0.6rem] leading-4">{thousandHint(draft[column.field])}</div>
                        </>
                      ) : (
                        <Input
                          type="number"
                          min={column.min}
                          step={column.step}
                          disabled={!editable || saving}
                          value={draft[column.field]}
                          className="text-right tabular-nums"
                          onChange={(event) => update(key, column.field, Number(event.target.value))}
                        />
                      )}
                    </td>
                  ))}
                  {editable ? (
                    <td className="px-2 py-2.5 align-top">
                      {existing ? (
                        <Button variant="ghost" size="icon" title="Xóa quy tắc" aria-label={`Xóa quy tắc ${serviceLevelLabel(level)} · ${pricingZoneLabel(zone)}`} disabled={saving} onClick={() => void remove(level, zone, key)}>
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editable ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {changed.length ? `${changed.length} quy tắc có thay đổi chưa lưu.` : "Không có thay đổi chưa lưu."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!changed.length || saving} onClick={() => { setDrafts(savedDrafts(plan)); setTouched(new Set()); }}>
              <Undo2Icon className="size-3.5" />Hoàn tác
            </Button>
            <Button size="sm" disabled={!changed.length || saving} onClick={() => void saveAll()}>
              {saving ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
              {changed.length > 1 ? `Lưu ${changed.length} quy tắc` : "Lưu quy tắc"}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function PricingRatePlans() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("pricing.manage");
  const [now, setNow] = useState(0);
  const [activePlans, setActivePlans] = useState<RatePlan[] | null>(null);
  const [activePlansError, setActivePlansError] = useState<string | null>(null);
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
        setNow(Date.now());
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

  const openActivate = () => {
    setDialog("activate");
    setActivePlans(null);
    setActivePlansError(null);
    getRatePlans("ACTIVE")
      .then((items) => {
        setNow(Date.now());
        setActivePlans(items);
      })
      .catch((reason) => setActivePlansError(pricingErrorMessage(reason, "Không thể kiểm tra bảng giá đang áp dụng.")));
  };

  const handover = selected && activePlans ? planHandover(selected, activePlans, now) : null;
  // Activation uses the saved window, so an edited-but-unsaved start/end would surprise the admin.
  const unsavedWindow = Boolean(selected) && (
    !sameInstant(policy.effectiveFrom, selected?.effectiveFrom ?? null) ||
    !sameInstant(policy.effectiveTo, selected?.effectiveTo ?? null)
  );

  const runLifecycle = async (reason: string) => {
    if (!selected || !dialog) return;
    setSaving(true);
    try {
      if (dialog === "activate") {
        const replacing = Boolean(handover?.replaces.length);
        const next = await activateRatePlan(selected.id, reason, replacing);
        replacePlan(next);
        setNow(Date.now());
        // The replaced plan changed too; reload so its new end time and status show.
        if (replacing) setRefreshKey((value) => value + 1);
        toast.success(handover?.immediate === false
          ? `Đã lên lịch áp dụng lúc ${dateTime(next.effectiveFrom)}${replacing ? "; bảng giá cũ sẽ kết thúc đúng lúc đó" : ""}.`
          : replacing ? "Đã áp dụng bảng giá mới và thay thế bảng giá cũ." : "Bảng giá đã bắt đầu áp dụng.");
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
        eyebrow="Bảng giá & cước"
        title="Bảng giá & phiên bản"
        description="Quản lý chính sách giá theo phiên bản. Bảng giá đang áp dụng là bất biến; mọi thay đổi nên được chuẩn bị ở một bản nháp mới rồi mới kích hoạt."
        help={{
          description: "Một bảng giá chứa chính sách chung và 6 quy tắc giá. Chỉ bản nháp được sửa để mức cước đã tính trước đó không bị thay đổi ngược về sau.",
          bullets: ["Đủ 6 quy tắc trước khi kích hoạt.", "Đổi giá: tạo phiên bản mới rồi bấm “Bắt đầu áp dụng”. Bảng giá cũ tự kết thúc đúng lúc bảng giá mới bắt đầu, không cần ngừng trước.", "Đặt “Bắt đầu hiệu lực” ở tương lai để lên lịch đổi giá."],
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
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black">{plan.name}</p><p className="mt-1 text-[0.68rem] text-muted-foreground">Phiên bản {plan.revision} · cập nhật {dateTime(plan.updatedAt)}</p></div><PricingStatusBadge status={plan.status} phase={ratePlanPhase(plan, now)} /></div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-[0.68rem]"><span>{plan.ruleCount}/6 quy tắc</span><span className="text-muted-foreground">{plan.quoteTtlMinutes} phút hiệu lực</span></div>
              </button>
            )) : <Card className="p-5 text-sm text-muted-foreground">Chưa có bảng giá phù hợp bộ lọc.</Card>}
          </div>

          {selected ? (
            <div className="grid min-w-0 gap-4">
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b bg-muted/25 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{selected.name}</h2><PricingStatusBadge status={selected.status} phase={ratePlanPhase(selected, now)} /><span className="rounded-full border px-2 py-1 text-[0.62rem] font-black">Phiên bản {selected.revision}</span></div>
                    <p className="mt-2 text-xs text-muted-foreground">Hiệu lực: {dateTime(selected.effectiveFrom)} → {dateTime(selected.effectiveTo)}</p>
                  </div>
                  {canManage ? <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDialog("revision")}><CopyPlusIcon className="size-3.5" />Tạo phiên bản mới</Button>
                    {selected.status === "DRAFT" ? <Button size="sm" disabled={missingRules > 0} title={missingRules > 0 ? `Còn thiếu ${missingRules} quy tắc` : undefined} onClick={openActivate}>Bắt đầu áp dụng</Button> : null}
                    {selected.status === "ACTIVE" ? <Button variant="outline" size="sm" onClick={() => setDialog("retire")}><ArchiveIcon className="size-3.5" />Ngừng áp dụng</Button> : null}
                    {selected.status === "DRAFT" ? <Button variant="destructive" size="sm" onClick={() => setDialog("delete")}><Trash2Icon className="size-3.5" />Xóa bản nháp</Button> : null}
                  </div> : null}
                </div>
                {missingRules > 0 && selected.status === "DRAFT" ? <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs font-bold text-amber-800 dark:text-amber-200">Còn thiếu {missingRules}/6 quy tắc. Bảng giá chưa thể kích hoạt.</div> : null}
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  <PricingField label="Tên bảng giá"><Input disabled={!editable || saving} value={policy.name} onChange={(event) => setPolicy((value) => ({ ...value, name: event.target.value }))} /></PricingField>
                  <PricingField label="Bắt đầu hiệu lực"><Input type="datetime-local" disabled={!editable || saving} value={toLocalDateTime(policy.effectiveFrom)} onChange={(event) => setPolicy((value) => ({ ...value, effectiveFrom: fromLocalDateTime(event.target.value) }))} /></PricingField>
                  <PricingField label="Kết thúc hiệu lực"><Input type="datetime-local" disabled={!editable || saving} value={toLocalDateTime(policy.effectiveTo)} onChange={(event) => setPolicy((value) => ({ ...value, effectiveTo: fromLocalDateTime(event.target.value) }))} /></PricingField>
                  <PricingField label="Kết quả tính cước có hiệu lực (phút)"><Input type="number" min={1} max={240} disabled={!editable || saving} value={policy.quoteTtlMinutes} onChange={(event) => setPolicy((value) => ({ ...value, quoteTtlMinutes: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Hệ số khối lượng quy đổi"><Input type="number" min={100} step={100} disabled={!editable || saving} value={policy.volumetricDivisor} onChange={(event) => setPolicy((value) => ({ ...value, volumetricDivisor: Number(event.target.value) }))} /></PricingField>
                  <PricingField label="Phụ phí mỗi đầu vùng xa" hint={thousandHint(policy.remoteEndpointSurcharge)}><PricingMoneyInput disabled={!editable || saving} value={policy.remoteEndpointSurcharge} onValueChange={(value) => setPolicy((current) => ({ ...current, remoteEndpointSurcharge: value }))} /></PricingField>
                  <PricingField label="Phụ phí hải đảo" hint="Phần trăm cộng thêm trên cước vận chuyển."><PricingPercentInput disabled={!editable || saving} value={policy.islandTransportRate} onValueChange={(value) => setPolicy((current) => ({ ...current, islandTransportRate: value }))} /></PricingField>
                  <PricingField label="Miễn phí thu hộ đến"><PricingMoneyInput disabled={!editable || saving} value={policy.codFreeThreshold} onValueChange={(value) => setPolicy((current) => ({ ...current, codFreeThreshold: value }))} /></PricingField>
                  <PricingField label="Tỷ lệ phí thu hộ" hint="Phần trăm trên số tiền thu hộ vượt ngưỡng miễn phí."><PricingPercentInput disabled={!editable || saving} value={policy.codRate} onValueChange={(value) => setPolicy((current) => ({ ...current, codRate: value }))} /></PricingField>
                  <PricingField label="Phí thu hộ tối thiểu" hint={thousandHint(policy.codMinimumFee)}><PricingMoneyInput disabled={!editable || saving} value={policy.codMinimumFee} onValueChange={(value) => setPolicy((current) => ({ ...current, codMinimumFee: value }))} /></PricingField>
                  <PricingField label="Số tiền thu hộ tối đa"><PricingMoneyInput disabled={!editable || saving} value={policy.maximumCod} onValueChange={(value) => setPolicy((current) => ({ ...current, maximumCod: value }))} /></PricingField>
                  <PricingField label="Bảo hiểm miễn phí đến"><PricingMoneyInput disabled={!editable || saving} value={policy.insuranceFreeThreshold} onValueChange={(value) => setPolicy((current) => ({ ...current, insuranceFreeThreshold: value }))} /></PricingField>
                  <PricingField label="Tỷ lệ bảo hiểm" hint="Phần trăm trên giá trị khai báo vượt ngưỡng miễn phí."><PricingPercentInput disabled={!editable || saving} value={policy.insuranceRate} onValueChange={(value) => setPolicy((current) => ({ ...current, insuranceRate: value }))} /></PricingField>
                  <PricingField label="Giá trị khai báo tối đa"><PricingMoneyInput disabled={!editable || saving} value={policy.maximumDeclaredValue} onValueChange={(value) => setPolicy((current) => ({ ...current, maximumDeclaredValue: value }))} /></PricingField>
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
                <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-base font-black">6 quy tắc giá</h2><p className="mt-1 text-xs text-muted-foreground">Tiêu chuẩn/Nhanh cho nội tỉnh, nội miền và liên miền (tính theo tỉnh của người gửi và người nhận).</p></div><span className="text-xs font-black">{selected.ruleCount}/6</span></div>
                <RuleTable key={selected.id} plan={selected} canManage={canManage} onSaved={replacePlan} />
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
              <PricingField label="Mã bảng giá" hint="Mã định danh ổn định cho từng dòng bảng giá."><Input value={createForm.code} disabled={saving} placeholder="DOMESTIC-2026" onChange={(event) => setCreateForm((value) => ({ ...value, code: event.target.value.toUpperCase() }))} /></PricingField>
              <PricingField label="Tên bảng giá"><Input value={createForm.name} disabled={saving} placeholder="Bảng giá nội địa tháng 09/2026" onChange={(event) => setCreateForm((value) => ({ ...value, name: event.target.value }))} /></PricingField>
              <PricingField label="Phiên bản"><Input type="number" min={1} disabled={saving} value={createForm.revision} onChange={(event) => setCreateForm((value) => ({ ...value, revision: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Kết quả tính cước có hiệu lực (phút)"><Input type="number" min={1} max={240} disabled={saving} value={createForm.quoteTtlMinutes} onChange={(event) => setCreateForm((value) => ({ ...value, quoteTtlMinutes: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Bắt đầu hiệu lực"><Input type="datetime-local" disabled={saving} value={toLocalDateTime(createForm.effectiveFrom)} onChange={(event) => setCreateForm((value) => ({ ...value, effectiveFrom: fromLocalDateTime(event.target.value) }))} /></PricingField>
              <PricingField label="Kết thúc hiệu lực"><Input type="datetime-local" disabled={saving} value={toLocalDateTime(createForm.effectiveTo)} onChange={(event) => setCreateForm((value) => ({ ...value, effectiveTo: fromLocalDateTime(event.target.value) }))} /></PricingField>
              <PricingField label="Khối lượng tối đa mỗi kiện (kg)"><Input type="number" min={0.01} step={0.5} disabled={saving} value={createForm.maxParcelWeightKg} onChange={(event) => setCreateForm((value) => ({ ...value, maxParcelWeightKg: Number(event.target.value) }))} /></PricingField>
              <PricingField label="Khối lượng tính cước tối đa đơn (kg)"><Input type="number" min={0.01} step={0.5} disabled={saving} value={createForm.maxShipmentChargeableWeightKg} onChange={(event) => setCreateForm((value) => ({ ...value, maxShipmentChargeableWeightKg: Number(event.target.value) }))} /></PricingField>
            </div>
            <div className="flex justify-end gap-2 border-t p-4"><Button variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>Hủy</Button><Button disabled={saving} onClick={() => void create()}>{saving ? <LoaderCircleIcon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}Tạo bản nháp</Button></div>
          </div>
        </div>
      ) : null}

      <PricingConfirmDialog
        open={dialog === "activate"}
        title={handover?.replaces.length ? "Áp dụng và thay thế bảng giá?" : "Bắt đầu áp dụng bảng giá?"}
        description="Sau khi kích hoạt, bảng giá không còn chỉnh sửa trực tiếp. Các lần tính cước mới trong khoảng hiệu lực sẽ sử dụng phiên bản này."
        confirmLabel={handover?.replaces.length ? "Áp dụng và thay thế" : "Bắt đầu áp dụng"}
        loading={saving}
        confirmDisabled={!handover || handover.blocker !== null || unsavedWindow}
        reason
        onCancel={() => setDialog(null)}
        onConfirm={runLifecycle}
      >
        {unsavedWindow ? (
          <div role="alert" className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
            Bạn đã sửa thời điểm bắt đầu/kết thúc hiệu lực nhưng chưa lưu. Hãy bấm “Lưu chính sách” trước khi áp dụng.
          </div>
        ) : null}
        <HandoverPreview handover={handover} error={activePlansError} />
      </PricingConfirmDialog>
      <PricingConfirmDialog open={dialog === "retire"} title="Ngừng áp dụng bảng giá?" description="Các mức cước đã tính trước đó vẫn giữ dữ liệu cũ; lần tính cước mới sẽ không dùng bảng giá này nữa." confirmLabel="Ngừng áp dụng" loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle}>
        {selected && ratePlanPhase(selected, now) === "IN_EFFECT" ? (
          <div role="alert" className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">
            Đây là bảng giá đang dùng để tính cước. Sau khi ngừng, khách hàng sẽ <strong>không tính được cước và không tạo được vận đơn</strong> cho đến khi có bảng giá mới. Muốn đổi giá không gián đoạn, hãy mở bản nháp mới và bấm “Bắt đầu áp dụng” để thay thế bảng giá này.
          </div>
        ) : selected && ratePlanPhase(selected, now) === "SCHEDULED" ? (
          <div className="rounded-lg border bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
            Bảng giá này chưa bắt đầu nên việc ngừng sẽ hủy lịch áp dụng. Nếu nó được lên lịch để thay thế một bảng giá khác, bảng giá cũ vẫn kết thúc đúng lịch; hãy kiểm tra để không có khoảng thời gian thiếu bảng giá.
          </div>
        ) : null}
      </PricingConfirmDialog>
      <PricingConfirmDialog open={dialog === "delete"} title="Xóa bảng giá nháp?" description="Chỉ bản nháp được xóa. Hành động này không ảnh hưởng các mức cước đã được tính từ phiên bản khác." confirmLabel="Xóa bản nháp" destructive loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
      <PricingConfirmDialog open={dialog === "revision"} title="Tạo phiên bản mới?" description="Hệ thống sẽ sao chép chính sách và toàn bộ quy tắc từ phiên bản đang chọn sang một bản nháp mới với số phiên bản tăng tự động." confirmLabel="Tạo phiên bản mới" loading={saving} reason onCancel={() => setDialog(null)} onConfirm={runLifecycle} />
    </div>
  );
}

function sameInstant(left: string | null, right: string | null) {
  return left === right || (left !== null && right !== null && Date.parse(left) === Date.parse(right));
}

type Handover = {
  startsAt: number;
  immediate: boolean;
  replaces: RatePlan[];
  blocker: string | null;
};

/**
 * Mirrors RatePlanService.activate with replaceActivePlan: the hand-over happens at the draft's
 * start (never in the past), and every overlapping active plan ends exactly then.
 */
function planHandover(draft: RatePlan, activePlans: RatePlan[], now: number): Handover {
  const requested = draft.effectiveFrom ? Date.parse(draft.effectiveFrom) : now;
  const startsAt = Math.max(requested, now);
  const endsAt = draft.effectiveTo ? Date.parse(draft.effectiveTo) : null;
  const replaces = activePlans.filter((plan) =>
    plan.id !== draft.id &&
    (!plan.effectiveTo || Date.parse(plan.effectiveTo) > startsAt) &&
    (endsAt === null || !plan.effectiveFrom || Date.parse(plan.effectiveFrom) < endsAt));

  let blocker: string | null = null;
  const startsLater = replaces.find((plan) => plan.effectiveFrom && Date.parse(plan.effectiveFrom) >= startsAt);
  const outlasts = endsAt === null ? undefined : replaces.find((plan) => !plan.effectiveTo || Date.parse(plan.effectiveTo) > endsAt);
  if (endsAt !== null && endsAt <= startsAt) {
    blocker = "Thời điểm kết thúc hiệu lực của bản nháp đã qua. Hãy sửa lại khoảng hiệu lực rồi lưu chính sách.";
  } else if (startsLater) {
    blocker = `“${startsLater.name}” đã được lên lịch bắt đầu lúc ${dateTime(startsLater.effectiveFrom)}, sau thời điểm này nên không thể thay thế. Hãy ngừng bảng giá đó trước.`;
  } else if (outlasts) {
    blocker = `Bản nháp kết thúc lúc ${dateTime(draft.effectiveTo)}, sớm hơn “${outlasts.name}”, nên sau thời điểm đó sẽ không còn bảng giá nào. Hãy bỏ hoặc lùi ngày kết thúc của bản nháp.`;
  }

  return { startsAt, immediate: startsAt <= now, replaces, blocker };
}

function HandoverPreview({ handover, error }: { handover: Handover | null; error: string | null }) {
  if (error) {
    return <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{error}</div>;
  }
  if (!handover) {
    return <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircleIcon className="size-3.5 animate-spin" />Đang kiểm tra bảng giá đang áp dụng…</p>;
  }

  const when = handover.immediate ? "ngay khi xác nhận" : `lúc ${dateTime(new Date(handover.startsAt).toISOString())}`;
  return (
    <>
      <div className="rounded-lg border bg-muted/25 p-3 text-xs">
        <span className="text-muted-foreground">Bắt đầu áp dụng: </span>
        <strong>{when}</strong>
      </div>
      {handover.blocker ? (
        <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{handover.blocker}</div>
      ) : handover.replaces.length ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-xs leading-5">
          {handover.replaces.map((plan) => (
            <p key={plan.id}>
              <strong>{plan.name}</strong> (phiên bản {plan.revision}) sẽ kết thúc {when} và được thay bằng bảng giá này trong cùng một thao tác.
            </p>
          ))}
          <p className="mt-1 text-muted-foreground">Không có thời điểm nào thiếu bảng giá. Các kết quả tính cước đã phát hành vẫn giữ giá cũ đến khi hết hiệu lực.</p>
        </div>
      ) : null}
    </>
  );
}
