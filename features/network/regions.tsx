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
import { createRegion, getRegions, updateRegion, updateRegionStatus } from "@/features/network/api";
import { networkErrorMessage } from "@/features/network/errors";
import type { NetworkRegion } from "@/features/network/contracts";
import {
  ActionPolicyNote,
  ConfirmActionDialog,
  EmptyState,
  FormField,
  NetworkError,
  NetworkPageHeader,
  StatusBadge,
} from "@/features/network/ui";
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
  const [pendingStatus, setPendingStatus] = useState<NetworkRegion | null>(null);

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
      setError(networkErrorMessage(reason, "Không thể tải danh sách vùng."));
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
      toast.error("Vui lòng nhập đủ mã kỹ thuật và tên vùng.");
      return;
    }

    setSaving(true);
    try {
      const updated = selected
        ? await updateRegion(selected.id, { name })
        : await createRegion({ code, name });

      toast.success(selected ? "Đã cập nhật vùng." : "Đã tạo vùng.");
      setCreating(false);
      await load();
      setSelected(updated);
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu vùng."));
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(region: NetworkRegion, reason: string) {
    if (!canManage) return;
    const active = region.status !== "ACTIVE";

    setSaving(true);
    try {
      await updateRegionStatus(region.id, { active, reason: reason || null });
      toast.success(active ? "Đã kích hoạt vùng." : "Đã ngừng hoạt động vùng.");
      setPendingStatus(null);
      await load();
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái vùng."));
    } finally {
      setSaving(false);
    }
  }

  const editorKey = selected?.id ?? (creating ? "new" : "none");

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Nền tảng mạng lưới"
        title="Vùng"
        description="Vùng dùng để nhóm các khu vực vận hành lớn như miền Bắc, miền Trung và miền Nam."
        help={{ description: "Trang này quản lý các vùng logic của mạng lưới.", bullets: ["Vùng được dùng để nhóm các vùng phục vụ.", "Có thể tạo thêm vùng mới mà không cần sửa backend.", "Ngừng hoạt động một vùng có thể bị chặn nếu vẫn còn vùng phục vụ đang hoạt động."] }}
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
                Tạo vùng
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
              <p className="text-sm font-black">Danh sách vùng</p>
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
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black">{region.name}</p><StatusBadge active={region.status === "ACTIVE"} /></div>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      Cập nhật {formatDateTime(region.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có vùng"
              description="Tạo vùng trước khi cấu hình Service Area."
            />
          )}
        </Card>

        <Card className="h-fit xl:sticky xl:top-32">
          <CardHeader>
            <p className="text-sm font-black">
              {selected ? selected.name : creating ? "Tạo vùng" : "Chi tiết vùng"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canManage
                ? "Mã kỹ thuật được giữ cố định sau khi tạo; thao tác hằng ngày chỉ cần dùng tên vùng."
                : "Bạn đang có quyền xem; cần quyền quản lý mạng lưới để thay đổi."}
            </p>
          </CardHeader>

          {!selected && !creating ? (
            <EmptyState
              title="Chọn một vùng"
              description="Chọn vùng ở danh sách bên trái hoặc tạo mới."
            />
          ) : (
            <CardContent>
              <form key={editorKey} className="grid gap-4" onSubmit={submit}>
                <details className="rounded-lg border bg-muted/15 p-3">
                  <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
                  <div className="mt-3">
                    <FormField label="Mã kỹ thuật" hint="Chỉ dùng nội bộ; không cần nhập mã này khi tìm kiếm.">
                      <Input name="code" defaultValue={selected?.code ?? ""} disabled={Boolean(selected) || !canManage} maxLength={50} placeholder="SOUTH" className="font-mono uppercase" />
                    </FormField>
                  </div>
                </details>

                <FormField label="Tên vùng">
                  <Input
                    name="name"
                    defaultValue={selected?.name ?? ""}
                    disabled={!canManage}
                    maxLength={160}
                    placeholder="Miền Nam"
                  />
                </FormField>

                {selected ? (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black">Trạng thái</p>
                        <p className="mt-1 text-[0.65rem] text-muted-foreground">
                          Ngừng hoạt động có thể bị chặn nếu vùng vẫn đang được sử dụng.
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
                      {selected ? "Lưu thay đổi" : "Tạo vùng"}
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
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-200">
                    <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
                    Chỉ đọc. Cần quyền quản lý mạng lưới để thay đổi.
                  </div>
                )}

                {selected ? (
                  <ActionPolicyNote>
                    Vùng không có thao tác xóa cứng trên backend. Nếu không còn sử dụng, hãy ngừng hoạt động để giữ nguyên lịch sử và các liên kết đã phát sinh.
                  </ActionPolicyNote>
                ) : null}
              </form>
            </CardContent>
          )}
        </Card>
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingStatus)}
        title={pendingStatus?.status === "ACTIVE" ? "Ngừng hoạt động vùng?" : "Kích hoạt vùng?"}
        description={
          pendingStatus?.status === "ACTIVE"
            ? `Vùng ${pendingStatus?.name ?? "này"} sẽ không còn được dùng cho cấu hình hoạt động mới. Backend sẽ từ chối nếu vẫn còn vùng phục vụ đang hoạt động.`
            : `Vùng ${pendingStatus?.name ?? "này"} sẽ được đưa trở lại trạng thái hoạt động.`
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
