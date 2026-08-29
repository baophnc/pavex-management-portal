"use client";

import {
  LoaderCircleIcon,
  RefreshCwIcon,
  SaveIcon,
  ShieldAlertIcon,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/features/auth/access-context";
import { getRegions } from "@/features/network/api";
import type { NetworkRegion } from "@/features/network/contracts";
import {
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  StatusBadge,
} from "@/features/network/ui";
import { apiRequest } from "@/lib/api/client";
import { cn, formatDateTime } from "@/lib/utils";

export function NetworkRegions() {
  const { hasPermission } = useAccess();
  const canManage = hasPermission("network.manage");
  const [regions, setRegions] = useState<NetworkRegion[]>([]);
  const [selected, setSelected] = useState<NetworkRegion | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRegions();
      setRegions(result);
      setSelected((current) =>
        current ? result.find((item) => item.id === current.id) ?? null : null,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải Region.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const code = String(form.get("code") ?? "").trim().toUpperCase();

    if (!name || (!selected && !code)) {
      toast.error("Vui lòng nhập đủ mã và tên Region.");
      return;
    }

    setSaving(true);
    try {
      const updated = (await apiRequest(
        selected ? `admin/network/regions/${selected.id}` : "admin/network/regions",
        {
          method: selected ? "PUT" : "POST",
          body: JSON.stringify(selected ? { name } : { code, name }),
        },
      )) as NetworkRegion;

      toast.success(selected ? "Đã cập nhật Region." : "Đã tạo Region.");
      setCreating(false);
      await load();
      setSelected(updated);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Không thể lưu Region.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(region: NetworkRegion) {
    if (!canManage) return;
    const active = region.status !== "ACTIVE";
    if (
      !active &&
      !window.confirm(
        `Ngừng Region ${region.code}? Backend sẽ chặn nếu còn Service Area ACTIVE.`,
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      await apiRequest(`admin/network/regions/${region.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      toast.success(active ? "Đã kích hoạt Region." : "Đã ngừng Region.");
      await load();
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Không thể đổi trạng thái Region.",
      );
    } finally {
      setSaving(false);
    }
  }

  const editorKey = selected?.id ?? (creating ? "new" : "none");

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Network foundation"
        title="Regions"
        description="Region là dữ liệu vận hành động. NORTH / CENTRAL / SOUTH chỉ là seed mặc định; bạn có thể tạo HCM_CORE, MEKONG, SOUTH_EAST… mà không phải sửa source backend."
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
              Tải lại
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setSelected(null);
                  setCreating(true);
                }}
              >
                Tạo Region
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="h-fit overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <p className="text-sm font-black">Danh sách Region</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {regions.length} vùng vận hành
              </p>
            </div>
          </CardHeader>

          {loading && !regions.length ? (
            <div className="grid min-h-52 place-items-center">
              <LoaderCircleIcon className="size-5 animate-spin text-brand" />
            </div>
          ) : regions.length ? (
            <div className="divide-y">
              {regions.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => {
                    setSelected(region);
                    setCreating(false);
                  }}
                  className={cn(
                    "flex w-full items-start justify-between gap-4 p-4 text-left transition hover:bg-muted/45",
                    selected?.id === region.id && "bg-brand/[0.055]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-xs font-black text-brand">
                        {region.code}
                      </p>
                      <StatusBadge active={region.status === "ACTIVE"} />
                    </div>
                    <p className="mt-1 text-sm font-black">{region.name}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      Cập nhật {formatDateTime(region.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có Region"
              description="Tạo Region trước khi cấu hình Service Area."
            />
          )}
        </Card>

        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader>
            <p className="text-sm font-black">
              {selected ? `Chỉnh sửa ${selected.code}` : creating ? "Tạo Region" : "Chi tiết Region"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canManage
                ? "Code được khóa sau khi tạo để giữ identifier ổn định."
                : "Bạn đang có quyền xem; cần network.manage để thay đổi."}
            </p>
          </CardHeader>

          {!selected && !creating ? (
            <EmptyState
              title="Chọn một Region"
              description="Chọn Region ở danh sách bên trái hoặc tạo mới."
            />
          ) : (
            <CardContent>
              <form key={editorKey} className="grid gap-4" onSubmit={submit}>
                <FormField label="Code">
                  <Input
                    name="code"
                    defaultValue={selected?.code ?? ""}
                    disabled={Boolean(selected) || !canManage}
                    maxLength={50}
                    placeholder="HCM_CORE"
                    className="font-mono uppercase"
                  />
                </FormField>

                <FormField label="Tên Region">
                  <Input
                    name="name"
                    defaultValue={selected?.name ?? ""}
                    disabled={!canManage}
                    maxLength={160}
                    placeholder="Hồ Chí Minh Core"
                  />
                </FormField>

                {selected ? (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black">Trạng thái</p>
                        <p className="mt-1 text-[0.65rem] text-muted-foreground">
                          Deactivate có thể bị backend chặn nếu Region đang được sử dụng.
                        </p>
                      </div>
                      <StatusBadge active={selected.status === "ACTIVE"} />
                    </div>
                  </div>
                ) : null}

                {canManage ? (
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : (
                        <SaveIcon className="size-4" />
                      )}
                      {selected ? "Lưu thay đổi" : "Tạo Region"}
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
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
                    Chỉ đọc. Permission cần thiết: network.manage
                  </div>
                )}
              </form>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
