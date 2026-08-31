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
import { createHub, getHubs, getProvinces, getWards, updateHub, updateHubStatus } from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
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
  ActionPolicyNote,
  ConfirmActionDialog,
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  Pager,
  StatusBadge,
  selectClassName,
} from "@/features/network/ui";
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
  const [pendingStatus, setPendingStatus] = useState<Hub | null>(null);

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
      setError(networkErrorMessage(reason, "Không thể tải danh sách điểm trung chuyển."));
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
      toast.error("Vui lòng nhập đủ thông tin điểm trung chuyển.");
      return;
    }

    const payload = {
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
      const updated = selected
        ? await updateHub(selected.id, payload)
        : await createHub({ code: draft.code.trim().toUpperCase(), ...payload });
      toast.success(selected ? "Đã cập nhật điểm trung chuyển." : "Đã tạo điểm trung chuyển.");
      await load();
      edit(updated);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu điểm trung chuyển."));
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(hub: Hub, reason: string) {
    if (!canManage) return;
    const active = hub.status !== "ACTIVE";

    setSaving(true);
    try {
      const updated = await updateHubStatus(hub.id, {
        active,
        reason: reason || null,
      });
      toast.success(active ? "Đã kích hoạt điểm trung chuyển." : "Đã ngừng điểm trung chuyển.");
      setPendingStatus(null);
      await load();
      edit(updated);
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái điểm trung chuyển."));
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
        eyebrow="Nền tảng mạng lưới"
        title="Điểm trung chuyển"
        description="Quản lý các điểm nhận, gom, chia chọn và trung chuyển hàng trong mạng lưới."
        help={{ description: "Mỗi điểm trung chuyển là một nút vật lý để hệ thống gắn vùng phục vụ và nối các tuyến vận chuyển.", bullets: ["Điểm cha chỉ dùng cho tổ chức quản trị, không ép tuyến hàng phải đi theo cây cha-con.", "Tên địa danh là thông tin chính hiển thị cho người vận hành; mã kỹ thuật chỉ dùng nội bộ.", "Có thể lọc theo tên, loại điểm và tỉnh/thành."] }}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? <Button onClick={createNew}>Tạo điểm</Button> : null}
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
              placeholder="Tìm theo tên điểm trung chuyển..."
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
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
          <select
            className={selectClassName}
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value as HubType | "");
            }}
          >
            <option value="">Tất cả loại điểm</option>
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
                  <th className="px-4 py-3 font-black">Điểm trung chuyển</th>
                  <th className="px-4 py-3 font-black">Loại</th>
                  <th className="px-4 py-3 font-black">Địa điểm</th>
                  <th className="px-4 py-3 font-black">Hiển thị</th>
                  <th className="px-4 py-3 font-black">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-black">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((hub) => (
                  <tr key={hub.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3">
                      <p className="font-black">{hub.name}</p>
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
                      {hub.publicVisible ? "Công khai" : "Nội bộ"}
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
            description="Thử thay đổi bộ lọc hoặc tạo điểm trung chuyển đầu tiên."
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
            {selected ? selected.name : "Tạo điểm trung chuyển mới"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {selected
              ? "Bạn có thể cập nhật loại điểm, điểm cha, địa chỉ và thông tin hiển thị."
              : "Điểm mới sẽ ở trạng thái ngừng hoạt động; cấu hình xong rồi kích hoạt."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <details className="rounded-lg border bg-muted/15 p-3">
              <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
              <div className="mt-3 max-w-sm">
                <FormField label="Mã kỹ thuật" hint="Chỉ cần khi tạo mới; mã không dùng để tìm kiếm hằng ngày.">
                  <Input
                    value={draft.code}
                    disabled={Boolean(selected) || !canManage}
                    maxLength={50}
                    placeholder="HN-HOANKIEM"
                    className="font-mono uppercase"
                    onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                  />
                </FormField>
              </div>
            </details>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FormField label="Tên điểm">
                <Input
                  value={draft.name}
                  disabled={!canManage}
                  maxLength={200}
                  placeholder="Thủ Đức"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </FormField>

              <FormField label="Loại điểm">
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
                label="Điểm cha"
                hint="Chỉ dùng để tổ chức quản trị, không quyết định đường vận chuyển."
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
                  <option value="">Không có điểm cha</option>
                  {allHubs
                    .filter((hub) => hub.id !== selected?.id)
                    .map((hub) => (
                      <option key={hub.id} value={hub.id}>
                        {hub.name}
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
                Cho phép hiển thị công khai
              </label>
              <FormField
                label="Tên hiển thị công khai"
                hint="Để trống thì hệ thống dùng tên điểm ở trên."
              >
                <Input
                  value={draft.publicName}
                  disabled={!canManage || !draft.publicVisible}
                  maxLength={200}
                  placeholder="Thủ Đức"
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
                  {selected ? "Lưu thay đổi" : "Tạo điểm"}
                </Button>
                {selected ? (
                  <Button
                    type="button"
                    variant={selected.status === "ACTIVE" ? "destructive" : "outline"}
                    disabled={saving}
                    onClick={() => setPendingStatus(selected)}
                  >
                    {selected.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {selected ? (
              <ActionPolicyNote>
                Điểm trung chuyển không có API xóa cứng. Hãy ngừng hoạt động nếu không còn sử dụng. Backend sẽ chặn thao tác nếu điểm vẫn là điểm chính của vùng phục vụ hoặc còn tuyến vận chuyển đang hoạt động.
              </ActionPolicyNote>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus?.status === "ACTIVE" ? "Ngừng điểm trung chuyển?" : "Kích hoạt điểm trung chuyển?"}
        description={
          pendingStatus?.status === "ACTIVE"
            ? `Điểm ${pendingStatus?.name ?? "này"} sẽ ngừng phục vụ. Backend sẽ từ chối nếu điểm vẫn đang được vùng phục vụ hoặc tuyến vận chuyển sử dụng.`
            : `Điểm ${pendingStatus?.name ?? "này"} sẽ được đưa trở lại trạng thái hoạt động.`
        }
        confirmLabel={pendingStatus?.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
        destructive={pendingStatus?.status === "ACTIVE"}
        loading={saving}
        reason
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => pendingStatus ? applyStatus(pendingStatus, reason) : undefined}
      />
    </div>
  );
}
