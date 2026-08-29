"use client";

import {
  LoaderCircleIcon,
  RefreshCwIcon,
  SaveIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import {
  getCoverages,
  getProvinces,
  getServiceAreas,
  getWards,
} from "@/features/network/api";
import {
  coverageTierLabel,
  coverageTiers,
  type CoverageTier,
  type PageResponse,
  type Province,
  type ServiceArea,
  type ServiceAreaCoverage,
  type Ward,
} from "@/features/network/contracts";
import {
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  Pager,
  StatusBadge,
  selectClassName,
} from "@/features/network/ui";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 30;

type Draft = {
  serviceAreaId: string;
  provinceCode: string;
  wardCode: string;
  tier: CoverageTier;
};

const emptyDraft: Draft = {
  serviceAreaId: "",
  provinceCode: "",
  wardCode: "",
  tier: "STANDARD",
};

function draftFromCoverage(coverage: ServiceAreaCoverage): Draft {
  return {
    serviceAreaId: coverage.serviceAreaId,
    provinceCode: coverage.provinceCode,
    wardCode: coverage.wardCode ?? "",
    tier: coverage.tier,
  };
}

export function NetworkCoverage() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");

  const [result, setResult] = useState<PageResponse<ServiceAreaCoverage> | null>(null);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selected, setSelected] = useState<ServiceAreaCoverage | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [page, setPage] = useState(1);
  const [serviceAreaFilter, setServiceAreaFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      activeOnly: String(activeOnly),
    });
    if (serviceAreaFilter) value.set("serviceAreaId", serviceAreaFilter);
    if (provinceFilter) value.set("provinceCode", provinceFilter);
    return value;
  }, [activeOnly, page, provinceFilter, serviceAreaFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageResult, areaResult, provinceResult] = await Promise.all([
        getCoverages(params),
        getServiceAreas(new URLSearchParams({ page: "1", pageSize: "100" })),
        getProvinces(),
      ]);
      setResult(pageResult);
      setAreas(areaResult.items);
      setProvinces(provinceResult);
      setSelected((current) =>
        current
          ? pageResult.items.find((item) => item.id === current.id) ?? current
          : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải Coverage.",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!draft.provinceCode) return;

    let cancelled = false;
    void getWards(draft.provinceCode)
      .then((items) => {
        if (!cancelled) setWards(items);
      })
      .catch(() => {
        if (!cancelled) setWards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.provinceCode]);

  function edit(coverage: ServiceAreaCoverage) {
    setSelected(coverage);
    setWards([]);
    setLoadingWards(Boolean(coverage.provinceCode));
    setDraft(draftFromCoverage(coverage));
  }

  function createNew() {
    setSelected(null);
    setWards([]);
    setLoadingWards(false);
    setDraft(emptyDraft);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (!draft.serviceAreaId || !draft.provinceCode) {
      toast.error("Vui lòng chọn Service Area và tỉnh/thành.");
      return;
    }

    const payload = {
      serviceAreaId: draft.serviceAreaId,
      provinceCode: draft.provinceCode,
      wardCode: draft.wardCode || null,
      tier: draft.tier,
    };

    setSaving(true);
    try {
      const updated = (await apiRequest(
        selected
          ? `admin/network/coverages/${selected.id}`
          : "admin/network/coverages",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      )) as ServiceAreaCoverage;
      toast.success(selected ? "Đã cập nhật Coverage." : "Đã tạo Coverage.");
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể lưu Coverage.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(coverage: ServiceAreaCoverage) {
    if (!canManage) return;
    const active = !coverage.active;
    if (
      !active &&
      !window.confirm(
        "Ngừng Coverage này? Resolver sẽ bỏ qua mapping khi coverage inactive.",
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = (await apiRequest(
        `admin/network/coverages/${coverage.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ active }),
        },
      )) as ServiceAreaCoverage;
      toast.success(active ? "Đã kích hoạt Coverage." : "Đã ngừng Coverage.");
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Không thể đổi trạng thái Coverage.",
      );
    } finally {
      setSaving(false);
    }
  }

  const areaById = useMemo(
    () => new Map(areas.map((area) => [area.id, area])),
    [areas],
  );
  const provinceByCode = useMemo(
    () => new Map(provinces.map((province) => [province.code, province])),
    [provinces],
  );
  const rows = result?.items ?? [];

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Network foundation"
        title="Coverage"
        description="Coverage map Province/Ward vào Service Area. Ward là override cụ thể; khi không có Ward match, resolver fallback về Province coverage."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? <Button onClick={createNew}>Tạo Coverage</Button> : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-2 border-b md:grid-cols-[minmax(14rem,1fr)_minmax(14rem,1fr)_auto]">
          <select
            className={selectClassName}
            value={serviceAreaFilter}
            onChange={(event) => {
              setPage(1);
              setServiceAreaFilter(event.target.value);
            }}
          >
            <option value="">Tất cả Service Area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.code} · {area.name}
              </option>
            ))}
          </select>

          <select
            className={selectClassName}
            value={provinceFilter}
            onChange={(event) => {
              setPage(1);
              setProvinceFilter(event.target.value);
            }}
          >
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.fullName}
              </option>
            ))}
          </select>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-xs font-bold">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={activeOnly}
              onChange={(event) => {
                setPage(1);
                setActiveOnly(event.target.checked);
              }}
            />
            Chỉ ACTIVE
          </label>
        </CardContent>

        {loading && !result ? (
          <div className="grid min-h-56 place-items-center">
            <LoaderCircleIcon className="size-5 animate-spin text-brand" />
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="border-b bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-black">Location</th>
                  <th className="px-4 py-3 font-black">Service Area</th>
                  <th className="px-4 py-3 font-black">Tier</th>
                  <th className="px-4 py-3 font-black">Match</th>
                  <th className="px-4 py-3 font-black">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((coverage) => (
                  <tr key={coverage.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <p className="font-black">
                        {provinceByCode.get(coverage.provinceCode)?.fullName ??
                          coverage.provinceCode}
                      </p>
                      <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
                        {coverage.wardCode ?? "ALL_WARDS"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">
                        {areaById.get(coverage.serviceAreaId)?.name ??
                          coverage.serviceAreaId}
                      </p>
                      <p className="mt-1 font-mono text-[0.65rem] text-brand">
                        {areaById.get(coverage.serviceAreaId)?.code ?? ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {coverageTierLabel(coverage.tier)}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {coverage.wardCode ? "WARD override" : "PROVINCE fallback"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={coverage.active} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => edit(coverage)}
                      >
                        {canManage ? "Sửa" : "Xem"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có Coverage"
            description="Tạo Province fallback hoặc Ward override để resolver biết location thuộc Service Area nào."
          />
        )}

        <Pager
          page={result?.page ?? page}
          totalPages={result?.totalPages ?? 0}
          totalItems={result?.totalItems ?? 0}
          onPage={setPage}
        />
      </Card>

      <Card>
        <CardHeader>
          <p className="text-sm font-black">
            {selected ? "Chỉnh sửa Coverage" : "Tạo Coverage"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Để Ward trống = Province fallback. Chọn Ward = mapping cụ thể được ưu tiên trước Province.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Service Area">
                <select
                  className={selectClassName}
                  value={draft.serviceAreaId}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      serviceAreaId: event.target.value,
                    }))
                  }
                >
                  <option value="">Chọn Service Area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.code} · {area.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tỉnh / Thành phố">
                <select
                  className={selectClassName}
                  value={draft.provinceCode}
                  disabled={!canManage}
                  onChange={(event) => {
                    const nextProvinceCode = event.target.value;
                    setWards([]);
                    setLoadingWards(Boolean(nextProvinceCode));
                    setDraft((current) => ({
                      ...current,
                      provinceCode: nextProvinceCode,
                      wardCode: "",
                    }));
                  }}
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.fullName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Phường / Xã"
                hint="Không chọn = áp dụng cho toàn tỉnh/thành làm fallback."
              >
                <select
                  className={selectClassName}
                  value={draft.wardCode}
                  disabled={!canManage || !draft.provinceCode || loadingWards}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      wardCode: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    {loadingWards ? "Đang tải..." : "Toàn tỉnh / thành phố"}
                  </option>
                  {wards.map((ward) => (
                    <option key={ward.code} value={ward.code}>
                      {ward.fullName}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Coverage tier">
                <select
                  className={selectClassName}
                  value={draft.tier}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      tier: event.target.value as CoverageTier,
                    }))
                  }
                >
                  {coverageTiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {coverageTierLabel(tier)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  {selected ? "Lưu Coverage" : "Tạo Coverage"}
                </Button>
                {selected ? (
                  <Button
                    type="button"
                    variant={selected.active ? "destructive" : "outline"}
                    disabled={saving}
                    onClick={() => void toggleStatus(selected)}
                  >
                    {selected.active ? "Ngừng Coverage" : "Kích hoạt"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
