"use client";

import {
  LoaderCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getHubs, getRegions, getServiceAreas } from "@/features/network/api";
import type {
  Hub,
  NetworkRegion,
  PageResponse,
  ServiceArea,
  ServiceAreaStatus,
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

const PAGE_SIZE = 20;

type Draft = {
  code: string;
  name: string;
  regionId: string;
  primaryHubId: string;
};

const emptyDraft: Draft = {
  code: "",
  name: "",
  regionId: "",
  primaryHubId: "",
};

function draftFromArea(area: ServiceArea): Draft {
  return {
    code: area.code,
    name: area.name,
    regionId: area.regionId,
    primaryHubId: area.primaryHubId,
  };
}

export function NetworkServiceAreas() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");

  const [result, setResult] = useState<PageResponse<ServiceArea> | null>(null);
  const [regions, setRegions] = useState<NetworkRegion[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [selected, setSelected] = useState<ServiceArea | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<ServiceAreaStatus | "">("");
  const [regionFilter, setRegionFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const value = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (appliedSearch) value.set("search", appliedSearch);
    if (status) value.set("status", status);
    if (regionFilter) value.set("regionId", regionFilter);
    return value;
  }, [appliedSearch, page, regionFilter, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageResult, regionResult, hubResult] = await Promise.all([
        getServiceAreas(params),
        getRegions(),
        getHubs(new URLSearchParams({ page: "1", pageSize: "100" })),
      ]);
      setResult(pageResult);
      setRegions(regionResult);
      setHubs(hubResult.items);
      setSelected((current) =>
        current
          ? pageResult.items.find((item) => item.id === current.id) ?? current
          : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải Service Area.",
      );
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  function edit(area: ServiceArea) {
    setSelected(area);
    setDraft(draftFromArea(area));
  }

  function createNew() {
    setSelected(null);
    setDraft(emptyDraft);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    if (
      !draft.name.trim() ||
      !draft.regionId ||
      !draft.primaryHubId ||
      (!selected && !draft.code.trim())
    ) {
      toast.error("Vui lòng nhập đủ thông tin Service Area.");
      return;
    }

    const payload = {
      ...(selected ? {} : { code: draft.code.trim().toUpperCase() }),
      name: draft.name.trim(),
      regionId: draft.regionId,
      primaryHubId: draft.primaryHubId,
    };

    setSaving(true);
    try {
      const updated = (await apiRequest(
        selected
          ? `admin/network/service-areas/${selected.id}`
          : "admin/network/service-areas",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      )) as ServiceArea;
      toast.success(
        selected ? "Đã cập nhật Service Area." : "Đã tạo Service Area.",
      );
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Không thể lưu Service Area.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(area: ServiceArea) {
    if (!canManage) return;
    const active = area.status !== "ACTIVE";
    if (
      !active &&
      !window.confirm(
        `Ngừng hoạt động vùng phục vụ ${area.name}? Phạm vi đã cấu hình vẫn được giữ nhưng sẽ không được dùng để định tuyến.`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = (await apiRequest(
        `admin/network/service-areas/${area.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ active }),
        },
      )) as ServiceArea;
      toast.success(
        active ? "Đã kích hoạt Service Area." : "Đã ngừng Service Area.",
      );
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Không thể đổi trạng thái Service Area.",
      );
    } finally {
      setSaving(false);
    }
  }

  const regionById = useMemo(
    () => new Map(regions.map((region) => [region.id, region])),
    [regions],
  );
  const hubById = useMemo(
    () => new Map(hubs.map((hub) => [hub.id, hub])),
    [hubs],
  );
  const rows = result?.items ?? [];

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Nền tảng mạng lưới"
        title="Vùng phục vụ"
        description="Gom nhiều xã/phường vào một vùng vận hành và chỉ định điểm trung chuyển chính phụ trách khu vực đó."
        help={{ description: "Vùng phục vụ là lớp nối giữa địa chỉ hành chính và điểm trung chuyển.", bullets: ["Mỗi vùng phục vụ thuộc một vùng lớn.", "Mỗi vùng có một điểm trung chuyển chính.", "Phạm vi xã/phường cụ thể được cấu hình ở trang Phạm vi phục vụ."] }}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? <Button onClick={createNew}>Tạo vùng phục vụ</Button> : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-2 border-b lg:grid-cols-[minmax(16rem,1fr)_14rem_12rem_auto]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên vùng phục vụ..."
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setPage(1);
                  setAppliedSearch(search.trim());
                }
              }}
            />
          </div>

          <select
            className={selectClassName}
            value={regionFilter}
            onChange={(event) => {
              setPage(1);
              setRegionFilter(event.target.value);
            }}
          >
            <option value="">Tất cả vùng</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>

          <select
            className={selectClassName}
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as ServiceAreaStatus | "");
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>

          <Button
            variant="outline"
            onClick={() => {
              setPage(1);
              setAppliedSearch(search.trim());
            }}
          >
            Tìm
          </Button>
        </CardContent>

        {loading && !result ? (
          <div className="grid min-h-56 place-items-center">
            <LoaderCircleIcon className="size-5 animate-spin text-brand" />
          </div>
        ) : rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-black">Vùng phục vụ</th>
                  <th className="px-4 py-3 font-black">Vùng</th>
                  <th className="px-4 py-3 font-black">Điểm chính</th>
                  <th className="px-4 py-3 font-black">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((area) => (
                  <tr key={area.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <p className="font-black">{area.name}</p>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {regionById.get(area.regionId)?.name ?? "Không xác định"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{hubById.get(area.primaryHubId)?.name ?? "Không xác định"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={area.status === "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => edit(area)}>
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
            title="Không có vùng phục vụ"
            description="Tạo vùng và điểm trung chuyển trước, sau đó tạo vùng phục vụ."
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
            {selected ? selected.name : "Tạo vùng phục vụ"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Điểm trung chuyển chính cần hoạt động khi kích hoạt vùng phục vụ.
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <details className="rounded-lg border bg-muted/15 p-3">
              <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
              <div className="mt-3 max-w-sm">
                <FormField label="Mã kỹ thuật" hint="Mã chỉ dùng nội bộ và được giữ cố định sau khi tạo.">
                  <Input value={draft.code} disabled={Boolean(selected) || !canManage} maxLength={50} className="font-mono uppercase" placeholder="HCM_EAST" onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} />
                </FormField>
              </div>
            </details>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Tên vùng phục vụ">
                <Input
                  value={draft.name}
                  disabled={!canManage}
                  maxLength={200}
                  placeholder="Phía Đông Hồ Chí Minh"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </FormField>

              <FormField label="Vùng">
                <select
                  className={selectClassName}
                  value={draft.regionId}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      regionId: event.target.value,
                    }))
                  }
                >
                  <option value="">Chọn vùng</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Điểm trung chuyển chính">
                <select
                  className={selectClassName}
                  value={draft.primaryHubId}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      primaryHubId: event.target.value,
                    }))
                  }
                >
                  <option value="">Chọn điểm trung chuyển</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name}
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
                  {selected ? "Lưu thay đổi" : "Tạo vùng phục vụ"}
                </Button>
                {selected ? (
                  <Button
                    type="button"
                    variant={selected.status === "ACTIVE" ? "destructive" : "outline"}
                    disabled={saving}
                    onClick={() => void toggleStatus(selected)}
                  >
                    {selected.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
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
