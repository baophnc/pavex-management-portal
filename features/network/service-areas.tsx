"use client";

import {
  ChevronRightIcon,
  Layers3Icon,
  LoaderCircleIcon,
  MapPinIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import {
  createCoverage,
  createServiceArea,
  getAllCoveragesForServiceArea,
  getAllHubs,
  getAllServiceAreas,
  getProvinces,
  getRegions,
  getWards,
  updateCoverage,
  updateCoverageStatus,
  updateServiceArea,
  updateServiceAreaStatus,
} from "@/features/network/api";
import {
  coverageTierLabel,
  coverageTiers,
  type CoverageTier,
  type Hub,
  type NetworkRegion,
  type Province,
  type ServiceArea,
  type ServiceAreaCoverage,
  type ServiceAreaStatus,
  type Ward,
} from "@/features/network/contracts";
import { networkErrorMessage } from "@/features/network/errors";
import {
  ActionPolicyNote,
  ConfirmActionDialog,
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  StatusBadge,
  selectClassName,
} from "@/features/network/ui";
import { cn, formatDateTime } from "@/lib/utils";

type AreaDraft = {
  code: string;
  name: string;
  regionId: string;
  primaryHubId: string;
};

type CoverageDraft = {
  provinceCode: string;
  wardCode: string;
  tier: CoverageTier;
};

const emptyAreaDraft: AreaDraft = {
  code: "",
  name: "",
  regionId: "",
  primaryHubId: "",
};

const emptyCoverageDraft: CoverageDraft = {
  provinceCode: "",
  wardCode: "",
  tier: "STANDARD",
};

function areaDraftFrom(area: ServiceArea): AreaDraft {
  return {
    code: area.code,
    name: area.name,
    regionId: area.regionId,
    primaryHubId: area.primaryHubId,
  };
}

function coverageDraftFrom(coverage: ServiceAreaCoverage): CoverageDraft {
  return {
    provinceCode: coverage.provinceCode,
    wardCode: coverage.wardCode ?? "",
    tier: coverage.tier,
  };
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

function coverageScopeLabel(coverage: ServiceAreaCoverage, wardNames: Map<string, string>) {
  if (!coverage.wardCode) return "Toàn tỉnh / thành phố";
  return wardNames.get(coverage.wardCode) ?? "Phường / xã cụ thể";
}

export function NetworkServiceAreas() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");

  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [regions, setRegions] = useState<NetworkRegion[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedArea, setSelectedArea] = useState<ServiceArea | null>(null);
  const [creatingArea, setCreatingArea] = useState(false);
  const [areaDraft, setAreaDraft] = useState<AreaDraft>(emptyAreaDraft);

  const [provinceSearch, setProvinceSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServiceAreaStatus | "">("");

  const [coverages, setCoverages] = useState<ServiceAreaCoverage[]>([]);
  const [coverageWardNames, setCoverageWardNames] = useState<Map<string, string>>(new Map());
  const [selectedCoverage, setSelectedCoverage] = useState<ServiceAreaCoverage | null>(null);
  const [creatingCoverage, setCreatingCoverage] = useState(false);
  const [coverageDraft, setCoverageDraft] = useState<CoverageDraft>(emptyCoverageDraft);
  const [editorWards, setEditorWards] = useState<Ward[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [savingArea, setSavingArea] = useState(false);
  const [savingCoverage, setSavingCoverage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);
  const [pendingAreaStatus, setPendingAreaStatus] = useState<ServiceArea | null>(null);
  const [pendingCoverageStatus, setPendingCoverageStatus] = useState<ServiceAreaCoverage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [areaResult, regionResult, hubResult, provinceResult] = await Promise.all([
        getAllServiceAreas(),
        getRegions(),
        getAllHubs(),
        getProvinces(),
      ]);

      setAreas(areaResult);
      setRegions(regionResult);
      setHubs(hubResult);
      setProvinces(provinceResult);

      setSelectedProvinceCode((current) => {
        if (current && provinceResult.some((province) => province.code === current)) {
          return current;
        }

        const firstWithArea = provinceResult.find((province) =>
          areaResult.some((area) =>
            hubResult.some(
              (hub) => hub.id === area.primaryHubId && hub.provinceCode === province.code,
            ),
          ),
        );

        return firstWithArea?.code ?? provinceResult[0]?.code ?? "";
      });

      setSelectedArea((current) =>
        current ? areaResult.find((area) => area.id === current.id) ?? null : null,
      );
    } catch (reason) {
      setError(networkErrorMessage(reason, "Không thể tải vùng phục vụ."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const loadCoverage = useCallback(async (serviceAreaId: string) => {
    setLoadingCoverage(true);
    setCoverageError(null);

    try {
      const items = await getAllCoveragesForServiceArea(serviceAreaId);
      setCoverages(items);
      setSelectedCoverage((current) =>
        current ? items.find((coverage) => coverage.id === current.id) ?? null : null,
      );

      const provinceCodes = [
        ...new Set(
          items
            .filter((coverage) => Boolean(coverage.wardCode))
            .map((coverage) => coverage.provinceCode),
        ),
      ];

      const wardGroups = await Promise.all(
        provinceCodes.map(async (provinceCode) => ({
          provinceCode,
          wards: await getWards(provinceCode),
        })),
      );

      const nextWardNames = new Map<string, string>();
      for (const group of wardGroups) {
        for (const ward of group.wards) {
          nextWardNames.set(ward.code, ward.fullName);
        }
      }
      setCoverageWardNames(nextWardNames);
    } catch (reason) {
      setCoverages([]);
      setCoverageWardNames(new Map());
      setCoverageError(
        networkErrorMessage(reason, "Không thể tải địa bàn của vùng phục vụ."),
      );
    } finally {
      setLoadingCoverage(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedArea?.id) return;
    const serviceAreaId = selectedArea.id;
    const task = window.setTimeout(() => void loadCoverage(serviceAreaId), 0);
    return () => window.clearTimeout(task);
  }, [loadCoverage, selectedArea?.id]);

  useEffect(() => {
    if (!coverageDraft.provinceCode) return;

    let cancelled = false;

    void getWards(coverageDraft.provinceCode)
      .then((items) => {
        if (!cancelled) setEditorWards(items);
      })
      .catch(() => {
        if (!cancelled) setEditorWards([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coverageDraft.provinceCode]);

  const provinceNames = useMemo(
    () => new Map(provinces.map((province) => [province.code, province.fullName])),
    [provinces],
  );

  const regionById = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [regions],
  );

  const hubById = useMemo(
    () => new Map(hubs.map((hub) => [hub.id, hub])),
    [hubs],
  );

  const areaProvinceCode = useCallback(
    (area: ServiceArea) => hubById.get(area.primaryHubId)?.provinceCode ?? "",
    [hubById],
  );

  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const area of areas) {
      const provinceCode = areaProvinceCode(area);
      if (!provinceCode) continue;
      counts.set(provinceCode, (counts.get(provinceCode) ?? 0) + 1);
    }
    return counts;
  }, [areaProvinceCode, areas]);

  const visibleProvinces = useMemo(() => {
    const query = normalizeSearch(provinceSearch);
    return [...provinces]
      .filter((province) => {
        if (!query) return true;
        return normalizeSearch(`${province.fullName} ${province.name}`).includes(query);
      })
      .sort((left, right) => {
        const leftCount = areaCounts.get(left.code) ?? 0;
        const rightCount = areaCounts.get(right.code) ?? 0;
        if (Boolean(leftCount) !== Boolean(rightCount)) return leftCount ? -1 : 1;
        return left.fullName.localeCompare(right.fullName, "vi");
      });
  }, [areaCounts, provinceSearch, provinces]);

  const provinceAreas = useMemo(
    () => areas.filter((area) => areaProvinceCode(area) === selectedProvinceCode),
    [areaProvinceCode, areas, selectedProvinceCode],
  );

  const visibleAreas = useMemo(() => {
    const query = normalizeSearch(areaSearch);
    return provinceAreas.filter((area) => {
      if (statusFilter && area.status !== statusFilter) return false;
      if (!query) return true;

      const hub = hubById.get(area.primaryHubId);
      const region = regionById.get(area.regionId);
      return normalizeSearch(`${area.name} ${hub?.name ?? ""} ${region?.name ?? ""}`).includes(
        query,
      );
    });
  }, [areaSearch, hubById, provinceAreas, regionById, statusFilter]);

  const eligibleHubs = useMemo(() => {
    return hubs.filter(
      (hub) =>
        hub.provinceCode === selectedProvinceCode || hub.id === areaDraft.primaryHubId,
    );
  }, [areaDraft.primaryHubId, hubs, selectedProvinceCode]);

  const coverageGroups = useMemo(() => {
    const groups = new Map<string, ServiceAreaCoverage[]>();
    for (const coverage of coverages) {
      const items = groups.get(coverage.provinceCode) ?? [];
      items.push(coverage);
      groups.set(coverage.provinceCode, items);
    }

    return [...groups.entries()]
      .map(([provinceCode, items]) => ({
        provinceCode,
        provinceName: provinceNames.get(provinceCode) ?? provinceCode,
        items: [...items].sort((left, right) => {
          if (!left.wardCode && right.wardCode) return -1;
          if (left.wardCode && !right.wardCode) return 1;
          return coverageScopeLabel(left, coverageWardNames).localeCompare(
            coverageScopeLabel(right, coverageWardNames),
            "vi",
          );
        }),
      }))
      .sort((left, right) => left.provinceName.localeCompare(right.provinceName, "vi"));
  }, [coverageWardNames, coverages, provinceNames]);

  const coverageTierCounts = useMemo(() => {
    const counts: Record<CoverageTier, number> = {
      STANDARD: 0,
      REMOTE: 0,
      ISLAND: 0,
    };
    for (const coverage of coverages) {
      if (coverage.active) counts[coverage.tier] += 1;
    }
    return counts;
  }, [coverages]);

  const selectedProvinceName =
    provinceNames.get(selectedProvinceCode) ?? "Chọn tỉnh / thành phố";

  function selectProvince(code: string) {
    setSelectedProvinceCode(code);
    setSelectedArea(null);
    setCreatingArea(false);
    setAreaDraft(emptyAreaDraft);
    setAreaSearch("");
    setStatusFilter("");
    setSelectedCoverage(null);
    setCreatingCoverage(false);
    setCoverageDraft(emptyCoverageDraft);
    setEditorWards([]);
  }

  function selectArea(area: ServiceArea) {
    const provinceCode = areaProvinceCode(area);
    if (provinceCode) setSelectedProvinceCode(provinceCode);
    setSelectedArea(area);
    setCreatingArea(false);
    setAreaDraft(areaDraftFrom(area));
    setSelectedCoverage(null);
    setCreatingCoverage(false);
    setCoverageDraft(emptyCoverageDraft);
    setEditorWards([]);
  }

  function createArea() {
    setSelectedArea(null);
    setCreatingArea(true);
    setAreaDraft(emptyAreaDraft);
    setSelectedCoverage(null);
    setCreatingCoverage(false);
    setCoverageDraft(emptyCoverageDraft);
  }

  function editCoverage(coverage: ServiceAreaCoverage) {
    setSelectedCoverage(coverage);
    setCreatingCoverage(false);
    setEditorWards([]);
    setLoadingWards(Boolean(coverage.provinceCode));
    setCoverageDraft(coverageDraftFrom(coverage));
  }

  function createCoverageMapping() {
    if (!selectedArea) return;
    setSelectedCoverage(null);
    setCreatingCoverage(true);
    setEditorWards([]);
    setLoadingWards(Boolean(selectedProvinceCode));
    setCoverageDraft({
      ...emptyCoverageDraft,
      provinceCode: selectedProvinceCode,
    });
  }

  async function submitArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    if (
      !areaDraft.name.trim() ||
      !areaDraft.regionId ||
      !areaDraft.primaryHubId ||
      (!selectedArea && !areaDraft.code.trim())
    ) {
      toast.error("Vui lòng nhập đủ thông tin vùng phục vụ.");
      return;
    }

    const payload = {
      name: areaDraft.name.trim(),
      regionId: areaDraft.regionId,
      primaryHubId: areaDraft.primaryHubId,
    };

    setSavingArea(true);
    try {
      const updated = selectedArea
        ? await updateServiceArea(selectedArea.id, payload)
        : await createServiceArea({
            code: areaDraft.code.trim().toUpperCase(),
            ...payload,
          });

      toast.success(
        selectedArea ? "Đã cập nhật vùng phục vụ." : "Đã tạo vùng phục vụ.",
      );
      setCreatingArea(false);
      await load();
      selectArea(updated);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu vùng phục vụ."));
    } finally {
      setSavingArea(false);
    }
  }

  async function applyAreaStatus(area: ServiceArea, reason: string) {
    if (!canManage) return;
    const active = area.status !== "ACTIVE";

    setSavingArea(true);
    try {
      const updated = await updateServiceAreaStatus(area.id, {
        active,
        reason: reason || null,
      });
      toast.success(active ? "Đã kích hoạt vùng phục vụ." : "Đã ngừng vùng phục vụ.");
      setPendingAreaStatus(null);
      await load();
      selectArea(updated);
    } catch (reasonValue) {
      toast.error(
        networkErrorMessage(reasonValue, "Không thể đổi trạng thái vùng phục vụ."),
      );
    } finally {
      setSavingArea(false);
    }
  }

  async function submitCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !selectedArea) return;

    if (!coverageDraft.provinceCode) {
      toast.error("Vui lòng chọn tỉnh / thành phố cho địa bàn phục vụ.");
      return;
    }

    const payload = {
      serviceAreaId: selectedArea.id,
      provinceCode: coverageDraft.provinceCode,
      wardCode: coverageDraft.wardCode || null,
      tier: coverageDraft.tier,
    };

    setSavingCoverage(true);
    try {
      const updated = selectedCoverage
        ? await updateCoverage(selectedCoverage.id, payload)
        : await createCoverage(payload);

      toast.success(
        selectedCoverage ? "Đã cập nhật địa bàn phục vụ." : "Đã thêm địa bàn phục vụ.",
      );
      setCreatingCoverage(false);
      await loadCoverage(selectedArea.id);
      editCoverage(updated);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu địa bàn phục vụ."));
    } finally {
      setSavingCoverage(false);
    }
  }

  async function applyCoverageStatus(coverage: ServiceAreaCoverage, reason: string) {
    if (!canManage || !selectedArea) return;

    setSavingCoverage(true);
    try {
      const updated = await updateCoverageStatus(coverage.id, {
        active: !coverage.active,
        reason: reason || null,
      });
      toast.success(
        coverage.active ? "Đã ngừng địa bàn phục vụ." : "Đã kích hoạt địa bàn phục vụ.",
      );
      setPendingCoverageStatus(null);
      await loadCoverage(selectedArea.id);
      editCoverage(updated);
    } catch (reasonValue) {
      toast.error(
        networkErrorMessage(reasonValue, "Không thể đổi trạng thái địa bàn phục vụ."),
      );
    } finally {
      setSavingCoverage(false);
    }
  }

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Nền tảng mạng lưới"
        title="Vùng phục vụ"
        description="Quản lý vùng phục vụ theo tỉnh/thành, điểm trung chuyển phụ trách và các phường/xã thực tế được phục vụ trên cùng một màn hình."
        help={{
          description:
            "Một vùng phục vụ nối địa chỉ của khách hàng với vùng mạng lưới và điểm trung chuyển chính. Địa bàn phường/xã được cấu hình ngay bên trong vùng đang chọn.",
          bullets: [
            "Chọn tỉnh/thành ở cột trái để chỉ xem các vùng do điểm trung chuyển tại khu vực đó phụ trách.",
            "Chọn một vùng ở cột giữa để xem điểm trung chuyển chính và toàn bộ địa bàn phục vụ.",
            "Mức Tiêu chuẩn, Vùng xa và Hải đảo được gắn trực tiếp cho từng địa bàn.",
          ],
        }}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? (
              <Button onClick={createArea}>
                <PlusIcon className="size-4" />
                Tạo vùng phục vụ
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <div className="grid min-h-[38rem] xl:grid-cols-[17rem_20rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/[0.14] xl:border-r xl:border-b-0">
            <div className="border-b p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg border bg-background text-brand">
                  <MapPinIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em]">
                    Tỉnh / Thành phố
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    Chọn khu vực cần quản lý
                  </p>
                </div>
              </div>
              <div className="relative mt-3">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={provinceSearch}
                  onChange={(event) => setProvinceSearch(event.target.value)}
                  placeholder="Tìm tỉnh / thành..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>

            {loading && !provinces.length ? (
              <div className="grid min-h-48 place-items-center">
                <LoaderCircleIcon className="size-5 animate-spin text-brand" />
              </div>
            ) : visibleProvinces.length ? (
              <nav className="max-h-[30rem] overflow-y-auto p-2 xl:max-h-[calc(100vh-17rem)]">
                {visibleProvinces.map((province) => {
                  const count = areaCounts.get(province.code) ?? 0;
                  const active = selectedProvinceCode === province.code;
                  return (
                    <button
                      key={province.code}
                      type="button"
                      onClick={() => selectProvince(province.code)}
                      className={cn(
                        "mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition",
                        active
                          ? "bg-brand/10 text-foreground ring-1 ring-brand/15"
                          : "hover:bg-background/80",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">{province.fullName}</p>
                        <p className="mt-1 text-[0.62rem] text-muted-foreground">
                          {count ? `${count} vùng phục vụ` : "Chưa có vùng phục vụ"}
                        </p>
                      </div>
                      <ChevronRightIcon
                        className={cn(
                          "size-4 shrink-0",
                          active ? "text-brand" : "text-muted-foreground",
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
            ) : (
              <EmptyState
                title="Không tìm thấy khu vực"
                description="Thử tên tỉnh hoặc thành phố khác."
              />
            )}
          </aside>

          <aside className="border-b bg-background xl:border-r xl:border-b-0">
            <div className="border-b p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-brand">
                    Vùng phục vụ
                  </p>
                  <p className="mt-1 text-sm font-black">{selectedProvinceName}</p>
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    {provinceAreas.length} vùng trong khu vực
                  </p>
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={createArea}>
                    <PlusIcon className="size-3.5" />
                    Thêm
                  </Button>
                ) : null}
              </div>

              <div className="relative mt-3">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={areaSearch}
                  onChange={(event) => setAreaSearch(event.target.value)}
                  placeholder="Tìm vùng phục vụ..."
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <select
                className={cn(selectClassName, "mt-2 h-9")}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as ServiceAreaStatus | "")
                }
              >
                <option value="">Mọi trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngừng hoạt động</option>
              </select>
            </div>

            {loading && !areas.length ? (
              <div className="grid min-h-48 place-items-center">
                <LoaderCircleIcon className="size-5 animate-spin text-brand" />
              </div>
            ) : visibleAreas.length ? (
              <div className="max-h-[30rem] overflow-y-auto p-2 xl:max-h-[calc(100vh-18rem)]">
                {visibleAreas.map((area) => {
                  const hub = hubById.get(area.primaryHubId);
                  const region = regionById.get(area.regionId);
                  const active = selectedArea?.id === area.id && !creatingArea;
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => selectArea(area)}
                      className={cn(
                        "mb-2 w-full rounded-xl border p-3 text-left transition",
                        active
                          ? "border-brand/25 bg-brand/[0.07] shadow-sm"
                          : "bg-card hover:bg-muted/25",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{area.name}</p>
                          <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">
                            {hub?.name ?? "Chưa xác định điểm trung chuyển"}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            area.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400",
                          )}
                          aria-label={
                            area.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"
                          }
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2 text-[0.62rem] text-muted-foreground">
                        <span className="truncate">{region?.name ?? "Chưa xác định vùng mạng lưới"}</span>
                        <ChevronRightIcon className="size-3.5 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Chưa có vùng phục vụ"
                description="Khu vực này chưa có vùng phục vụ phù hợp với bộ lọc hiện tại."
              />
            )}
          </aside>

          <section className="min-w-0">
            {!selectedArea && !creatingArea ? (
              <EmptyState
                title="Chọn một vùng phục vụ"
                description="Chọn tỉnh/thành rồi chọn vùng ở cột bên cạnh để xem điểm trung chuyển và địa bàn được phục vụ."
              />
            ) : (
              <div className="divide-y">
                <div>
                  <CardHeader className="bg-muted/[0.08]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">
                          {selectedArea ? selectedArea.name : "Tạo vùng phục vụ"}
                        </p>
                        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                          {selectedArea
                            ? `${selectedProvinceName} · Điểm trung chuyển chính ${hubById.get(selectedArea.primaryHubId)?.name ?? "chưa xác định"}`
                            : `Tạo vùng phục vụ mới cho ${selectedProvinceName}.`}
                        </p>
                      </div>
                      {selectedArea ? (
                        <StatusBadge active={selectedArea.status === "ACTIVE"} />
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6">
                    <form className="grid gap-5" onSubmit={submitArea}>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <FormField label="Tên vùng phục vụ">
                          <Input
                            value={areaDraft.name}
                            disabled={!canManage}
                            maxLength={200}
                            placeholder="Thủ Đức"
                            onChange={(event) =>
                              setAreaDraft((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </FormField>

                        <FormField label="Vùng mạng lưới">
                          <select
                            className={selectClassName}
                            value={areaDraft.regionId}
                            disabled={!canManage}
                            onChange={(event) =>
                              setAreaDraft((current) => ({
                                ...current,
                                regionId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Chọn vùng mạng lưới</option>
                            {regions.map((region) => (
                              <option key={region.id} value={region.id}>
                                {region.name}
                                {region.status !== "ACTIVE" ? " · Ngừng hoạt động" : ""}
                              </option>
                            ))}
                          </select>
                        </FormField>

                        <FormField
                          label="Điểm trung chuyển chính"
                          hint={`Ưu tiên các điểm thuộc ${selectedProvinceName}.`}
                        >
                          <select
                            className={selectClassName}
                            value={areaDraft.primaryHubId}
                            disabled={!canManage}
                            onChange={(event) =>
                              setAreaDraft((current) => ({
                                ...current,
                                primaryHubId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Chọn điểm trung chuyển</option>
                            {eligibleHubs.map((hub) => (
                              <option key={hub.id} value={hub.id}>
                                {hub.name}
                                {hub.status !== "ACTIVE" ? " · Ngừng hoạt động" : ""}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      </div>

                      {selectedArea ? (
                        <details className="rounded-lg border bg-muted/15 p-3">
                          <summary className="cursor-pointer text-xs font-black">
                            Thông tin kỹ thuật
                          </summary>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border bg-background p-3 text-[0.68rem] text-muted-foreground">
                              <p className="font-black text-foreground">Mã vùng</p>
                              <p className="mt-1 break-all font-mono">{selectedArea.code}</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3 text-[0.68rem] text-muted-foreground">
                              <p className="font-black text-foreground">ID vùng phục vụ</p>
                              <p className="mt-1 break-all font-mono">{selectedArea.id}</p>
                              <p className="mt-3">
                                Cập nhật {formatDateTime(selectedArea.updatedAt)}
                              </p>
                            </div>
                          </div>
                        </details>
                      ) : (
                        <div className="max-w-sm">
                          <FormField
                            label="Mã vùng"
                            hint="Chỉ cần nhập khi tạo mới; sau khi tạo mã được giữ cố định và ẩn khỏi giao diện chính."
                          >
                            <Input
                              value={areaDraft.code}
                              disabled={!canManage}
                              maxLength={50}
                              className="font-mono uppercase"
                              placeholder="HCM_THU_DUC"
                              onChange={(event) =>
                                setAreaDraft((current) => ({
                                  ...current,
                                  code: event.target.value,
                                }))
                              }
                            />
                          </FormField>
                        </div>
                      )}

                      {canManage ? (
                        <div className="flex flex-wrap gap-2 border-t pt-4">
                          <Button type="submit" disabled={savingArea}>
                            {savingArea ? (
                              <LoaderCircleIcon className="size-4 animate-spin" />
                            ) : (
                              <SaveIcon className="size-4" />
                            )}
                            {selectedArea ? "Lưu thay đổi" : "Tạo vùng phục vụ"}
                          </Button>
                          {selectedArea ? (
                            <Button
                              type="button"
                              variant={
                                selectedArea.status === "ACTIVE" ? "destructive" : "outline"
                              }
                              disabled={savingArea}
                              onClick={() => setPendingAreaStatus(selectedArea)}
                            >
                              {selectedArea.status === "ACTIVE"
                                ? "Ngừng hoạt động"
                                : "Kích hoạt"}
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
                          Bạn đang ở chế độ chỉ xem. Cần quyền quản lý mạng lưới để thay đổi.
                        </div>
                      )}

                      {selectedArea ? (
                        <ActionPolicyNote>
                          Vùng phục vụ không có thao tác xóa cứng. Khi không còn sử dụng, hãy ngừng hoạt động để giữ lịch sử cấu hình và các địa bàn đã liên kết.
                        </ActionPolicyNote>
                      ) : null}
                    </form>
                  </CardContent>
                </div>

                {selectedArea && !creatingArea ? (
                  <div>
                    <CardHeader className="bg-muted/[0.05]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Layers3Icon className="size-4 text-brand" />
                            <p className="text-sm font-black">Địa bàn được phục vụ</p>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Các tỉnh/thành, phường/xã và mức phục vụ thuộc vùng {selectedArea.name}.
                          </p>
                        </div>
                        {canManage ? (
                          <Button size="sm" variant="outline" onClick={createCoverageMapping}>
                            <PlusIcon className="size-3.5" />
                            Thêm địa bàn
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] font-bold">
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          {coverages.filter((coverage) => coverage.active).length} đang hoạt động
                        </span>
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          Tiêu chuẩn {coverageTierCounts.STANDARD}
                        </span>
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          Vùng xa {coverageTierCounts.REMOTE}
                        </span>
                        <span className="rounded-full border bg-background px-2.5 py-1">
                          Hải đảo {coverageTierCounts.ISLAND}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="grid gap-4 p-4 sm:p-6">
                      {coverageError ? (
                        <NetworkError
                          message={coverageError}
                          onRetry={() => void loadCoverage(selectedArea.id)}
                        />
                      ) : null}

                      {loadingCoverage ? (
                        <div className="grid min-h-32 place-items-center rounded-xl border border-dashed">
                          <LoaderCircleIcon className="size-5 animate-spin text-brand" />
                        </div>
                      ) : coverageGroups.length ? (
                        <div className="grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
                          {coverageGroups.map((group) => (
                            <section key={group.provinceCode} className="rounded-xl border">
                              <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-3 py-2.5">
                                <div>
                                  <p className="text-xs font-black">{group.provinceName}</p>
                                  <p className="mt-0.5 text-[0.62rem] text-muted-foreground">
                                    {group.items.length} địa bàn
                                  </p>
                                </div>
                                <MapPinIcon className="size-4 text-muted-foreground" />
                              </div>
                              <div className="divide-y">
                                {group.items.map((coverage) => (
                                  <button
                                    key={coverage.id}
                                    type="button"
                                    onClick={() => editCoverage(coverage)}
                                    className={cn(
                                      "flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-muted/20",
                                      selectedCoverage?.id === coverage.id &&
                                        !creatingCoverage &&
                                        "bg-brand/[0.06]",
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-black">
                                        {coverageScopeLabel(coverage, coverageWardNames)}
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.62rem] text-muted-foreground">
                                        <span>{coverageTierLabel(coverage.tier)}</span>
                                        <span>•</span>
                                        <span>
                                          {coverage.active ? "Đang hoạt động" : "Ngừng hoạt động"}
                                        </span>
                                      </div>
                                    </div>
                                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                                  </button>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="Chưa có địa bàn phục vụ"
                          description="Thêm toàn tỉnh/thành hoặc từng phường/xã để hệ thống có thể xác định vùng phục vụ cho địa chỉ khách hàng."
                        />
                      )}

                      {creatingCoverage || selectedCoverage ? (
                        <form
                          className="rounded-xl border bg-muted/[0.08] p-4"
                          onSubmit={submitCoverage}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black">
                                {selectedCoverage ? "Chỉnh sửa địa bàn" : "Thêm địa bàn"}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Vùng phục vụ: {selectedArea.name}
                              </p>
                            </div>
                            {selectedCoverage ? (
                              <StatusBadge active={selectedCoverage.active} />
                            ) : null}
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <FormField label="Tỉnh / Thành phố">
                              <select
                                className={selectClassName}
                                value={coverageDraft.provinceCode}
                                disabled={!canManage}
                                onChange={(event) => {
                                  const provinceCode = event.target.value;
                                  setEditorWards([]);
                                  setLoadingWards(Boolean(provinceCode));
                                  setCoverageDraft((current) => ({
                                    ...current,
                                    provinceCode,
                                    wardCode: "",
                                  }));
                                }}
                              >
                                <option value="">Chọn tỉnh / thành phố</option>
                                {provinces.map((province) => (
                                  <option key={province.code} value={province.code}>
                                    {province.fullName}
                                  </option>
                                ))}
                              </select>
                            </FormField>

                            <FormField
                              label="Phường / Xã"
                              hint="Để trống nếu vùng này là phương án mặc định cho toàn tỉnh/thành."
                            >
                              <select
                                className={selectClassName}
                                value={coverageDraft.wardCode}
                                disabled={
                                  !canManage || !coverageDraft.provinceCode || loadingWards
                                }
                                onChange={(event) =>
                                  setCoverageDraft((current) => ({
                                    ...current,
                                    wardCode: event.target.value,
                                  }))
                                }
                              >
                                <option value="">
                                  {loadingWards
                                    ? "Đang tải phường / xã..."
                                    : "Toàn tỉnh / thành phố"}
                                </option>
                                {editorWards.map((ward) => (
                                  <option key={ward.code} value={ward.code}>
                                    {ward.fullName}
                                  </option>
                                ))}
                              </select>
                            </FormField>

                            <FormField label="Mức phục vụ">
                              <select
                                className={selectClassName}
                                value={coverageDraft.tier}
                                disabled={!canManage}
                                onChange={(event) =>
                                  setCoverageDraft((current) => ({
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
                            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                              <Button type="submit" disabled={savingCoverage}>
                                {savingCoverage ? (
                                  <LoaderCircleIcon className="size-4 animate-spin" />
                                ) : (
                                  <SaveIcon className="size-4" />
                                )}
                                {selectedCoverage ? "Lưu địa bàn" : "Thêm địa bàn"}
                              </Button>
                              {selectedCoverage ? (
                                <Button
                                  type="button"
                                  variant={selectedCoverage.active ? "destructive" : "outline"}
                                  disabled={savingCoverage}
                                  onClick={() => setPendingCoverageStatus(selectedCoverage)}
                                >
                                  {selectedCoverage.active ? "Ngừng hoạt động" : "Kích hoạt"}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={savingCoverage}
                                onClick={() => {
                                  setSelectedCoverage(null);
                                  setCreatingCoverage(false);
                                  setCoverageDraft(emptyCoverageDraft);
                                }}
                              >
                                Đóng
                              </Button>
                            </div>
                          ) : null}

                          {selectedCoverage ? (
                            <ActionPolicyNote>
                              Địa bàn phục vụ không có thao tác xóa cứng. Khi ngừng hoạt động, hệ thống giữ mapping để đối soát nhưng không dùng nó khi xác định tuyến mới.
                            </ActionPolicyNote>
                          ) : null}
                        </form>
                      ) : null}
                    </CardContent>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </Card>

      <ConfirmActionDialog
        open={Boolean(pendingAreaStatus)}
        title={
          pendingAreaStatus?.status === "ACTIVE"
            ? "Ngừng vùng phục vụ?"
            : "Kích hoạt vùng phục vụ?"
        }
        description={
          pendingAreaStatus?.status === "ACTIVE"
            ? `Vùng ${pendingAreaStatus?.name ?? "này"} sẽ không còn được dùng để xác định địa chỉ cho tuyến mới. Các địa bàn đã cấu hình vẫn được giữ.`
            : `Vùng ${pendingAreaStatus?.name ?? "này"} sẽ được đưa trở lại sử dụng. Vùng mạng lưới và điểm trung chuyển chính phải đang hoạt động.`
        }
        confirmLabel={
          pendingAreaStatus?.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"
        }
        destructive={pendingAreaStatus?.status === "ACTIVE"}
        loading={savingArea}
        reason
        onCancel={() => setPendingAreaStatus(null)}
        onConfirm={(reason) =>
          pendingAreaStatus ? applyAreaStatus(pendingAreaStatus, reason) : undefined
        }
      />

      <ConfirmActionDialog
        open={Boolean(pendingCoverageStatus)}
        title={
          pendingCoverageStatus?.active
            ? "Ngừng địa bàn phục vụ?"
            : "Kích hoạt địa bàn phục vụ?"
        }
        description={
          pendingCoverageStatus?.active
            ? "Địa bàn này sẽ không còn được dùng để xác định vùng phục vụ cho tuyến mới. Dữ liệu vẫn được giữ để đối soát."
            : "Địa bàn này sẽ được dùng lại khi hệ thống xác định vùng phục vụ từ địa chỉ khách hàng."
        }
        confirmLabel={
          pendingCoverageStatus?.active ? "Ngừng hoạt động" : "Kích hoạt"
        }
        destructive={Boolean(pendingCoverageStatus?.active)}
        loading={savingCoverage}
        reason
        onCancel={() => setPendingCoverageStatus(null)}
        onConfirm={(reason) =>
          pendingCoverageStatus
            ? applyCoverageStatus(pendingCoverageStatus, reason)
            : undefined
        }
      />
    </div>
  );
}
