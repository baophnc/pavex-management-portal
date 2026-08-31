"use client";

import {
  Layers3Icon,
  LoaderCircleIcon,
  PlusIcon,
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
import type { NetworkRegion } from "@/features/network/contracts";
import { networkErrorMessage } from "@/features/network/errors";
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
        current ? result.find((item) => item.id === current.id) ?? current : null,
      );
    } catch (reason) {
      setError(networkErrorMessage(reason, "Không thể tải danh sách vùng mạng lưới."));
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

      toast.success(selected ? "Đã cập nhật vùng mạng lưới." : "Đã tạo vùng mạng lưới.");
      setCreating(false);
      setSelected(updated);
      await load();
    } catch (reason) {
      toast.error(networkErrorMessage(reason, "Không thể lưu vùng mạng lưới."));
    } finally {
      setSaving(false);
    }
  }

  async function applyStatus(region: NetworkRegion, reason: string) {
    if (!canManage) return;
    const active = region.status !== "ACTIVE";

    setSaving(true);
    try {
      const updated = await updateRegionStatus(region.id, {
        active,
        reason: reason || null,
      });
      toast.success(active ? "Đã kích hoạt vùng." : "Đã ngừng hoạt động vùng.");
      setPendingStatus(null);
      setSelected(updated);
      await load();
    } catch (reasonValue) {
      toast.error(networkErrorMessage(reasonValue, "Không thể đổi trạng thái vùng."));
    } finally {
      setSaving(false);
    }
  }

  function createNew() {
    setSelected(null);
    setCreating(true);
  }

  const editorKey = selected?.id ?? (creating ? "new" : "none");
  const activeCount = regions.filter((region) => region.status === "ACTIVE").length;

  return (
    <div className="space-y-4">
      <NetworkPageHeader
        eyebrow="Mạng lưới vận hành"
        title="Vùng mạng lưới"
        description="Tổ chức mạng lưới theo các vùng lớn để quản lý vùng phục vụ, điểm trung chuyển và luồng vận chuyển dễ hơn."
        help={{
          description: "Vùng mạng lưới là lớp tổ chức cấp cao, ví dụ Miền Bắc, Miền Trung và Miền Nam.",
          bullets: [
            "Chọn một vùng ở cột bên trái để xem hoặc chỉnh sửa.",
            "Vùng phục vụ sẽ được gắn vào một vùng mạng lưới ở bước cấu hình riêng.",
            "Nếu không còn sử dụng, hãy ngừng hoạt động thay vì xóa để giữ lịch sử.",
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
                Tạo vùng
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <NetworkError message={error} onRetry={() => void load()} /> : null}

      <Card className="overflow-hidden">
        <div className="grid min-h-[32rem] lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-b bg-muted/[0.14] lg:border-r lg:border-b-0">
            <div className="border-b p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg border bg-background text-brand">
                  <Layers3Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em]">Vùng mạng lưới</p>
                  <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                    {activeCount}/{regions.length} vùng đang hoạt động
                  </p>
                </div>
              </div>
            </div>

            {loading && !regions.length ? (
              <div className="grid min-h-44 place-items-center">
                <LoaderCircleIcon className="size-5 animate-spin text-brand" />
              </div>
            ) : regions.length ? (
              <nav className="max-h-[28rem] overflow-y-auto p-2 lg:max-h-[calc(100vh-16rem)]">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => {
                      setSelected(region);
                      setCreating(false);
                    }}
                    className={cn(
                      "mb-1 flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition",
                      selected?.id === region.id && !creating
                        ? "bg-brand/10 text-foreground ring-1 ring-brand/15"
                        : "hover:bg-background/80",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{region.name}</p>
                      <p className="mt-1 text-[0.62rem] text-muted-foreground">
                        Cập nhật {formatDateTime(region.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        region.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400",
                      )}
                      aria-label={region.status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động"}
                    />
                  </button>
                ))}
              </nav>
            ) : (
              <EmptyState
                title="Chưa có vùng mạng lưới"
                description="Tạo vùng đầu tiên trước khi cấu hình vùng phục vụ."
              />
            )}
          </aside>

          <section className="min-w-0">
            {!selected && !creating ? (
              <EmptyState
                title="Chọn một vùng"
                description="Chọn vùng ở cột bên trái để xem thông tin chi tiết."
              />
            ) : (
              <>
                <CardHeader className="border-b bg-muted/[0.08]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">
                        {selected ? selected.name : "Tạo vùng mạng lưới"}
                      </p>
                      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
                        {selected
                          ? "Thông tin của vùng đang chọn. Mã kỹ thuật được giữ cố định sau khi tạo."
                          : "Tạo một vùng lớn để nhóm các vùng phục vụ theo cơ cấu vận hành của Pavex."}
                      </p>
                    </div>
                    {selected ? <StatusBadge active={selected.status === "ACTIVE"} /> : null}
                  </div>
                </CardHeader>

                <CardContent className="max-w-3xl p-4 sm:p-6">
                  <form key={editorKey} className="grid gap-5" onSubmit={submit}>
                    <FormField label="Tên vùng">
                      <Input
                        name="name"
                        defaultValue={selected?.name ?? ""}
                        disabled={!canManage}
                        maxLength={160}
                        placeholder="Miền Nam"
                      />
                    </FormField>

                    <details className="rounded-lg border bg-muted/15 p-3">
                      <summary className="cursor-pointer text-xs font-black">Thông tin kỹ thuật</summary>
                      <div className="mt-3 max-w-sm">
                        <FormField
                          label="Mã kỹ thuật"
                          hint="Chỉ dùng nội bộ và không thay đổi sau khi tạo."
                        >
                          <Input
                            name="code"
                            defaultValue={selected?.code ?? ""}
                            disabled={Boolean(selected) || !canManage}
                            maxLength={50}
                            placeholder="SOUTH"
                            className="font-mono uppercase"
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
                        Bạn đang ở chế độ chỉ xem. Cần quyền quản lý mạng lưới để thay đổi.
                      </div>
                    )}

                    {selected ? (
                      <ActionPolicyNote>
                        Vùng mạng lưới không có thao tác xóa cứng. Khi không còn sử dụng, hãy ngừng hoạt động để giữ nguyên lịch sử và các liên kết đã phát sinh.
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
        title={pendingStatus?.status === "ACTIVE" ? "Ngừng hoạt động vùng?" : "Kích hoạt vùng?"}
        description={
          pendingStatus?.status === "ACTIVE"
            ? `Vùng ${pendingStatus?.name ?? "này"} sẽ không còn được dùng cho cấu hình hoạt động mới. Hệ thống sẽ từ chối nếu vẫn còn vùng phục vụ đang hoạt động.`
            : `Vùng ${pendingStatus?.name ?? "này"} sẽ được đưa trở lại trạng thái hoạt động.`
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
