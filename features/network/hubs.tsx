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
import { getHubs, getProvinces, getWards } from "@/features/network/api";
import {
  hubTypeLabel,
  hubTypes,
  type Hub,
  type HubStatus,
  type HubType,
  type PageResponse,
  type Province,
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

const PAGE_SIZE = 20;

type HubDraft = {
  code: string;
  name: string;
  type: HubType;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
  parentHubId: string;
  publicVisible: boolean;
  publicName: string;
};

const emptyDraft: HubDraft = {
  code: "",
  name: "",
  type: "LOCAL",
  addressLine: "",
  provinceCode: "",
  wardCode: "",
  parentHubId: "",
  publicVisible: false,
  publicName: "",
};

function draftFromHub(hub: Hub): HubDraft {
  return {
    code: hub.code,
    name: hub.name,
    type: hub.type,
    addressLine: hub.addressLine,
    provinceCode: hub.provinceCode,
    wardCode: hub.wardCode,
    parentHubId: hub.parentHubId ?? "",
    publicVisible: hub.publicVisible,
    publicName: hub.publicName ?? "",
  };
}

export function NetworkHubs() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");

  const [result, setResult] = useState<PageResponse<Hub> | null>(null);
  const [allHubs, setAllHubs] = useState<Hub[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [draft, setDraft] = useState<HubDraft>(emptyDraft);
  const [selected, setSelected] = useState<Hub | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<HubStatus | "">("");
  const [type, setType] = useState<HubType | "">("");
  const [provinceCode, setProvinceCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpointParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (appliedSearch) params.set("search", appliedSearch);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (provinceCode) params.set("provinceCode", provinceCode);
    return params;
  }, [appliedSearch, page, provinceCode, status, type]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageResult, lookupResult, provinceResult] = await Promise.all([
        getHubs(endpointParams),
        getHubs(new URLSearchParams({ page: "1", pageSize: "100" })),
        getProvinces(),
      ]);
      setResult(pageResult);
      setAllHubs(lookupResult.items);
      setProvinces(provinceResult);
      setSelected((current) =>
        current
          ? pageResult.items.find((item) => item.id === current.id) ??
            lookupResult.items.find((item) => item.id === current.id) ??
            current
          : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải danh sách Hub.",
      );
    } finally {
      setLoading(false);
    }
  }, [endpointParams]);

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

  function edit(hub: Hub) {
    setSelected(hub);
    setWards([]);
    setLoadingWards(Boolean(hub.provinceCode));
    setDraft(draftFromHub(hub));
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

    if (
      !draft.name.trim() ||
      !draft.addressLine.trim() ||
      !draft.provinceCode ||
      !draft.wardCode ||
      (!selected && !draft.code.trim())
    ) {
      toast.error("Vui lòng nhập đủ thông tin Hub.");
      return;
    }

    const payload = {
      ...(selected ? {} : { code: draft.code.trim().toUpperCase() }),
      name: draft.name.trim(),
      type: draft.type,
      addressLine: draft.addressLine.trim(),
      provinceCode: draft.provinceCode,
      wardCode: draft.wardCode,
      parentHubId: draft.parentHubId || null,
      publicVisible: draft.publicVisible,
      publicName: draft.publicName.trim() || null,
    };

    setSaving(true);
    try {
      const updated = (await apiRequest(
        selected ? `admin/network/hubs/${selected.id}` : "admin/network/hubs",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      )) as Hub;
      toast.success(selected ? "Đã cập nhật Hub." : "Đã tạo Hub.");
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể lưu Hub.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(hub: Hub) {
    if (!canManage) return;
    const active = hub.status !== "ACTIVE";
    if (
      !active &&
      !window.confirm(
        `Ngừng Hub ${hub.code}? Backend sẽ chặn nếu Hub còn Service Area hoặc Lane ACTIVE.`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = (await apiRequest(`admin/network/hubs/${hub.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      })) as Hub;
      toast.success(active ? "Đã kích hoạt Hub." : "Đã ngừng Hub.");
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể đổi trạng thái Hub.",
      );
    } finally {
      setSaving(false);
    }
  }

  const rows = result?.items ?? [];
  const provinceNames = useMemo(
    () => new Map(provinces.map((province) => [province.code, province.fullName])),
    [provinces],
  );

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Network foundation"
        title="Hubs"
        description="Hub là điểm vật lý của mạng. Parent Hub chỉ biểu diễn hierarchy quản trị; routing ở tầng Lane sẽ không bị ép phải đi theo cây parent."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? <Button onClick={createNew}>Tạo Hub</Button> : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-2 border-b lg:grid-cols-[minmax(16rem,1fr)_11rem_11rem_13rem_auto]">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã hoặc tên Hub..."
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
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as HubStatus | "");
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <select
            className={selectClassName}
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value as HubType | "");
            }}
          >
            <option value="">Tất cả loại Hub</option>
            {hubTypes.map((item) => (
              <option key={item} value={item}>
                {hubTypeLabel(item)}
              </option>
            ))}
          </select>
          <select
            className={selectClassName}
            value={provinceCode}
            onChange={(event) => {
              setPage(1);
              setProvinceCode(event.target.value);
            }}
          >
            <option value="">Tất cả tỉnh/thành</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code}>
                {province.fullName}
              </option>
            ))}
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
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="border-b bg-muted/35 text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-black">Hub</th>
                  <th className="px-4 py-3 font-black">Loại</th>
                  <th className="px-4 py-3 font-black">Địa điểm</th>
                  <th className="px-4 py-3 font-black">Public</th>
                  <th className="px-4 py-3 font-black">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((hub) => (
                  <tr key={hub.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <p className="font-black">{hub.name}</p>
                      <p className="mt-1 font-mono text-[0.65rem] text-brand">
                        {hub.code}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">{hubTypeLabel(hub.type)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold">
                        {provinceNames.get(hub.provinceCode) ?? hub.provinceCode}
                      </p>
                      <p className="mt-1 max-w-64 truncate text-[0.65rem] text-muted-foreground">
                        {hub.addressLine}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {hub.publicVisible ? "Hiển thị" : "Nội bộ"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge active={hub.status === "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => edit(hub)}>
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
            title="Không có Hub phù hợp"
            description="Thử thay đổi bộ lọc hoặc tạo Hub đầu tiên."
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
            {selected ? `Hub · ${selected.code}` : "Tạo Hub mới"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected
              ? "Code được giữ cố định. Bạn có thể đổi hierarchy, địa chỉ và public visibility."
              : "Hub tạo mới sẽ ở INACTIVE; cấu hình xong rồi kích hoạt."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Code">
                <Input
                  value={draft.code}
                  disabled={Boolean(selected) || !canManage}
                  maxLength={50}
                  placeholder="HCM-TD-01"
                  className="font-mono uppercase"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, code: event.target.value }))
                  }
                />
              </FormField>

              <FormField label="Tên Hub">
                <Input
                  value={draft.name}
                  disabled={!canManage}
                  maxLength={200}
                  placeholder="PAVEX Thủ Đức"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </FormField>

              <FormField label="Loại Hub">
                <select
                  className={selectClassName}
                  value={draft.type}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as HubType,
                    }))
                  }
                >
                  {hubTypes.map((item) => (
                    <option key={item} value={item}>
                      {hubTypeLabel(item)}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Parent Hub"
                hint="Chỉ phục vụ hierarchy quản trị, không quyết định transport route."
              >
                <select
                  className={selectClassName}
                  value={draft.parentHubId}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      parentHubId: event.target.value,
                    }))
                  }
                >
                  <option value="">Không có parent</option>
                  {allHubs
                    .filter((hub) => hub.id !== selected?.id)
                    .map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.code} · {hub.name}
                      </option>
                    ))}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

              <FormField label="Phường / Xã">
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
                    {loadingWards ? "Đang tải..." : "Chọn phường/xã"}
                  </option>
                  {wards.map((ward) => (
                    <option key={ward.code} value={ward.code}>
                      {ward.fullName}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Địa chỉ chi tiết">
                  <Input
                    value={draft.addressLine}
                    disabled={!canManage}
                    maxLength={500}
                    placeholder="Số nhà, tên đường..."
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        addressLine: event.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>
            </div>

            <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-[14rem_minmax(0,1fr)]">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-black">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={draft.publicVisible}
                  disabled={!canManage}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      publicVisible: event.target.checked,
                    }))
                  }
                />
                Hiển thị Hub cho public
              </label>
              <FormField
                label="Tên public"
                hint="Để trống thì public API dùng tên nội bộ của Hub."
              >
                <Input
                  value={draft.publicName}
                  disabled={!canManage || !draft.publicVisible}
                  maxLength={200}
                  placeholder="PAVEX Thủ Đức"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      publicName: event.target.value,
                    }))
                  }
                />
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
                  {selected ? "Lưu Hub" : "Tạo Hub"}
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
