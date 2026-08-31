"use client";

import {
  Building2Icon,
  ChevronRightIcon,
  LoaderCircleIcon,
  MapPinIcon,
  PlusIcon,
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
import {
  createHub,
  getAllHubs,
  getProvinces,
  getWards,
  updateHub,
  updateHubStatus,
} from "@/features/network/api";
import {
  hubTypeLabel,
  hubTypes,
  type Hub,
  type HubStatus,
  type HubType,
  type Province,
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
import { cn } from "@/lib/utils";

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

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("vi");
}

export function NetworkHubs() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");

  const [hubs, setHubs] = useState<Hub[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selected, setSelected] = useState<Hub | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<HubDraft>(emptyDraft);

  const [provinceSearch, setProvinceSearch] = useState("");
  const [hubSearch, setHubSearch] = useState("");
  const [status, setStatus] = useState<HubStatus | "">("");
  const [type, setType] = useState<HubType | "">("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Hub | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hubResult, provinceResult] = await Promise.all([
        getAllHubs(),
        getProvinces(),
      ]);
      setHubs(hubResult);
      setProvinces(provinceResult);
      setSelectedProvinceCode((current) => {
        if (current && provinceResult.some((province) => province.code === current)) {
          return current;
        }
        const firstWithHub = provinceResult.find((province) =>
          hubResult.some((hub) => hub.provinceCode === province.code),
        );
        return firstWithHub?.code ?? provinceResult[0]?.code ?? "";
      });
      setSelected((current) =>
        current ? hubResult.find((hub) => hub.id === current.id) ?? null : null,
      );
    } catch (reason) {
      setError(networkErrorMessage(reason, "Không thể tải điểm trung chuyển."));
    } finally {
      setLoading(false);
    }
  }, []);

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

  const provinceNames = useMemo(
    () => new Map(provinces.map((province) => [province.code, province.fullName])),
    [provinces],
  );

  const hubNames = useMemo(
    () => new Map(hubs.map((hub) => [hub.id, hub.name])),
    [hubs],
  );

  const hubCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const hub of hubs) {
      counts.set(hub.provinceCode, (counts.get(hub.provinceCode) ?? 0) + 1);
    }
    return counts;
  }, [hubs]);

  const visibleProvinces = useMemo(() => {
    const query = normalizeSearch(provinceSearch);
    return [...provinces]
      .filter((province) => {
        if (!query) return true;
        return normalizeSearch(`${province.fullName} ${province.name}`).includes(query);
      })
      .sort((left, right) => {
        const leftHasHub = (hubCounts.get(left.code) ?? 0) > 0;
        const rightHasHub = (hubCounts.get(right.code) ?? 0) > 0;
        if (leftHasHub !== rightHasHub) return leftHasHub ? -1 : 1;
        return left.fullName.localeCompare(right.fullName, "vi");
      });
  }, [hubCounts, provinceSearch, provinces]);

  const provinceHubs = useMemo(
    () => hubs.filter((hub) => hub.provinceCode === selectedProvinceCode),
    [hubs, selectedProvinceCode],
  );

  const visibleHubs = useMemo(() => {
    const query = normalizeSearch(hubSearch);
    return provinceHubs.filter((hub) => {
      if (status && hub.status !== status) return false;
      if (type && hub.type !== type) return false;
      if (!query) return true;
      return normalizeSearch(
        `${hub.name} ${hub.publicName ?? ""} ${hub.addressLine}`,
      ).includes(query);
    });
  }, [hubSearch, provinceHubs, status, type]);

  const selectedProvinceName =
    provinceNames.get(selectedProvinceCode) ?? "Chọn tỉnh / thành phố";

  function selectProvince(code: string) {
    setSelectedProvinceCode(code);
    setSelected(null);
    setCreating(false);
    setDraft(emptyDraft);
    setWards([]);
    setHubSearch("");
    setStatus("");
    setType("");
  }

  function edit(hub: Hub) {
    setSelectedProvinceCode(hub.provinceCode);
    setSelected(hub);
    setCreating(false);
    setWards([]);
    setLoadingWards(Boolean(hub.provinceCode));
    setDraft(draftFromHub(hub));
  }

  function createNew() {
    setSelected(null);
    setCreating(true);
    setWards([]);
    setLoadingWards(Boolean(selectedProvinceCode));
    setDraft({
      ...emptyDraft,
      provinceCode: selectedProvinceCode,
    });
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
      setCreating(false);
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

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Mạng lưới vận hành"
        title="Điểm trung chuyển"
        description="Duyệt điểm trung chuyển theo tỉnh / thành phố thay vì phải đọc một bảng dài của toàn mạng lưới."
        help={{
          description: "Cột bên trái là tỉnh / thành phố; cột giữa chỉ hiển thị các điểm thuộc khu vực đang chọn.",
          bullets: [
            "Chọn Hồ Chí Minh, Hà Nội, Đà Nẵng... để thu hẹp dữ liệu theo khu vực.",
            "Chọn một điểm ở cột giữa để xem hoặc chỉnh sửa ở bên phải.",
            "Điểm cha chỉ phục vụ tổ chức quản trị, không ép luồng hàng phải đi theo cây cha-con.",
          ],
        }}
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? (
              <Button onClick={createNew}>
                <PlusIcon className="size-4" />
                Tạo điểm
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <div className="grid min-h-[40rem] xl:grid-cols-[17rem_22rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/[0.14] xl:border-r xl:border-b-0">
            <div className="border-b p-3.5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Tỉnh / Thành phố
              </p>
              <div className="relative mt-3">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={provinceSearch}
                  onChange={(event) => setProvinceSearch(event.target.value)}
                  placeholder="Tìm khu vực..."
                  className="h-9 pl-8 text-xs"
                />
              </div>
            </div>

            {loading && !provinces.length ? (
              <div className="grid min-h-44 place-items-center">
                <LoaderCircleIcon className="size-5 animate-spin text-brand" />
              </div>
            ) : visibleProvinces.length ? (
              <nav className="max-h-[28rem] overflow-y-auto p-2 xl:max-h-[calc(100vh-15rem)]">
                {visibleProvinces.map((province) => {
                  const count = hubCounts.get(province.code) ?? 0;
                  const active = selectedProvinceCode === province.code;
                  return (
                    <button
                      key={province.code}
                      type="button"
                      onClick={() => selectProvince(province.code)}
                      className={cn(
                        "mb-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left transition",
                        active
                          ? "bg-brand/10 text-foreground ring-1 ring-brand/15"
                          : "hover:bg-background/80",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black">{province.fullName}</p>
                        <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                          {count ? `${count} điểm trung chuyển` : "Chưa có điểm"}
                        </p>
                      </div>
                      <ChevronRightIcon
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground",
                          active && "text-brand",
                        )}
                      />
                    </button>
                  );
                })}
              </nav>
            ) : (
              <EmptyState
                title="Không tìm thấy khu vực"
                description="Thử tìm bằng tên tỉnh hoặc thành phố khác."
              />
            )}
          </aside>

          <section className="min-w-0 border-b xl:border-r xl:border-b-0">
            <div className="border-b p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{selectedProvinceName}</p>
                  <p className="mt-1 text-[0.65rem] text-muted-foreground">
                    {visibleHubs.length === provinceHubs.length
                      ? `${provinceHubs.length} điểm trung chuyển`
                      : `${visibleHubs.length}/${provinceHubs.length} điểm phù hợp`}
                  </p>
                </div>
                {canManage && selectedProvinceCode ? (
                  <Button size="sm" variant="outline" onClick={createNew}>
                    <PlusIcon className="size-3.5" />
                    Thêm
                  </Button>
                ) : null}
              </div>

              <div className="relative mt-3">
                <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={hubSearch}
                  onChange={(event) => setHubSearch(event.target.value)}
                  placeholder="Tìm điểm trong khu vực này..."
                  className="h-9 pl-8 text-xs"
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  className={selectClassName}
                  value={type}
                  onChange={(event) => setType(event.target.value as HubType | "")}
                >
                  <option value="">Mọi loại điểm</option>
                  {hubTypes.map((item) => (
                    <option key={item} value={item}>
                      {hubTypeLabel(item)}
                    </option>
                  ))}
                </select>
                <select
                  className={selectClassName}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as HubStatus | "")}
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                </select>
              </div>
            </div>

            {loading && !hubs.length ? (
              <div className="grid min-h-48 place-items-center">
                <LoaderCircleIcon className="size-5 animate-spin text-brand" />
              </div>
            ) : visibleHubs.length ? (
              <div className="max-h-[30rem] overflow-y-auto p-2 xl:max-h-[calc(100vh-19rem)]">
                {visibleHubs.map((hub) => {
                  const active = selected?.id === hub.id && !creating;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => edit(hub)}
                      className={cn(
                        "mb-2 w-full rounded-xl border p-3 text-left transition",
                        active
                          ? "border-brand/25 bg-brand/[0.06] shadow-sm"
                          : "bg-card hover:border-brand/20 hover:bg-muted/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">{hub.name}</p>
                          <p className="mt-1 text-[0.65rem] font-bold text-brand">
                            {hubTypeLabel(hub.type)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "mt-1 size-2 shrink-0 rounded-full",
                            hub.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400",
                          )}
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-[0.65rem] leading-5 text-muted-foreground">
                        {hub.addressLine}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6rem] font-bold text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-1">
                          {hub.publicVisible ? "Hiển thị công khai" : "Chỉ dùng nội bộ"}
                        </span>
                        {hub.parentHubId ? (
                          <span className="rounded-full bg-muted px-2 py-1">
                            Thuộc {hubNames.get(hub.parentHubId) ?? "điểm cha"}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Chưa có điểm phù hợp"
                description={
                  provinceHubs.length
                    ? "Thử bỏ bớt bộ lọc để xem các điểm trong khu vực này."
                    : "Khu vực này chưa có điểm trung chuyển."
                }
              />
            )}
          </section>

          <section className="min-w-0 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
            {!selected && !creating ? (
              <div className="grid min-h-[28rem] place-items-center p-6 text-center">
                <div className="max-w-sm">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl border bg-muted/30 text-brand">
                    <Building2Icon className="size-5" />
                  </span>
                  <p className="mt-4 text-sm font-black">Chọn một điểm trung chuyển</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Chọn khu vực ở cột trái, sau đó chọn một điểm để xem chi tiết. Không cần tải toàn bộ dữ liệu lên màn hình cùng lúc.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader className="border-b bg-muted/[0.08]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black">
                        {selected ? selected.name : "Tạo điểm trung chuyển"}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPinIcon className="size-3.5" />
                        <span>
                          {selected
                            ? provinceNames.get(selected.provinceCode) ?? selected.provinceCode
                            : provinceNames.get(draft.provinceCode) ?? "Chọn tỉnh / thành phố"}
                        </span>
                      </div>
                    </div>
                    {selected ? <StatusBadge active={selected.status === "ACTIVE"} /> : null}
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5">
                  <form className="grid gap-5" onSubmit={submit}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Tên điểm">
                        <Input
                          value={draft.name}
                          disabled={!canManage}
                          maxLength={200}
                          placeholder="Trung tâm Thủ Đức"
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
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
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
                          <option value="">Chọn tỉnh / thành phố</option>
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
                            {loadingWards ? "Đang tải..." : "Chọn phường / xã"}
                          </option>
                          {wards.map((ward) => (
                            <option key={ward.code} value={ward.code}>
                              {ward.fullName}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

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

                    <FormField
                      label="Điểm quản lý cấp trên"
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
                        <option value="">Không có điểm cấp trên</option>
                        {hubs
                          .filter((hub) => hub.id !== selected?.id)
                          .map((hub) => (
                            <option key={hub.id} value={hub.id}>
                              {hub.name} · {provinceNames.get(hub.provinceCode) ?? hub.provinceCode}
                            </option>
                          ))}
                      </select>
                    </FormField>

                    <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-[13rem_minmax(0,1fr)]">
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
                        Hiển thị công khai
                      </label>
                      <FormField
                        label="Tên hiển thị cho khách hàng"
                        hint="Để trống thì dùng tên điểm ở trên."
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

                    <details className="rounded-lg border bg-muted/15 p-3">
                      <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
                      <div className="mt-3 max-w-sm">
                        <FormField
                          label="Mã kỹ thuật"
                          hint="Chỉ dùng nội bộ và không thay đổi sau khi tạo."
                        >
                          <Input
                            value={draft.code}
                            disabled={Boolean(selected) || !canManage}
                            maxLength={50}
                            placeholder="HCM-THUDUC"
                            className="font-mono uppercase"
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                code: event.target.value,
                              }))
                            }
                          />
                        </FormField>
                      </div>
                    </details>

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
                        Điểm trung chuyển không xóa cứng. Nếu không còn sử dụng, hãy ngừng hoạt động. Hệ thống sẽ chặn nếu điểm vẫn là điểm chính của vùng phục vụ hoặc còn tuyến đang hoạt động.
                      </ActionPolicyNote>
                    ) : null}
                  </form>
                </CardContent>
              </>
            )}
          </section>
        </div>
      </Card>

      <ConfirmActionDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus?.status === "ACTIVE" ? "Ngừng điểm trung chuyển?" : "Kích hoạt điểm trung chuyển?"}
        description={
          pendingStatus?.status === "ACTIVE"
            ? `Điểm ${pendingStatus?.name ?? "này"} sẽ ngừng phục vụ. Hệ thống sẽ từ chối nếu điểm vẫn đang được vùng phục vụ hoặc tuyến vận chuyển sử dụng.`
            : `Điểm ${pendingStatus?.name ?? "này"} sẽ được đưa trở lại trạng thái hoạt động.`
        }
        confirmLabel={pendingStatus?.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}
        destructive={pendingStatus?.status === "ACTIVE"}
        loading={saving}
        reason
        onCancel={() => setPendingStatus(null)}
        onConfirm={(reason) => (pendingStatus ? applyStatus(pendingStatus, reason) : undefined)}
      />
    </div>
  );
}
