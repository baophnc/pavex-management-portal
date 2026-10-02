"use client";

import {
  ArrowLeftIcon,
  Building2Icon,
  CheckCircle2Icon,
  CircleHelpIcon,
  Clock3Icon,
  ExternalLinkIcon,
  HistoryIcon,
  LoaderCircleIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  StoreIcon,
  UserRoundIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import { getUser } from "@/features/identity/api";
import type { UserDetail } from "@/features/identity/contracts";
import {
  accountLabels,
  isMerchantIdentityEligible,
  profileLabels,
  rolePresentation,
} from "@/features/identity/presentation";
import {
  merchantReasonLabel,
  merchantStatusLabel,
  merchantStatusReasons,
  orderRestrictionLabel,
  type AdminMerchantResponse,
  type MerchantReadiness,
  type MerchantStatus,
  type MerchantStatusReason,
} from "@/features/partners/contracts";
import { changeMerchantStatus, getMerchant, getMerchantReadiness } from "@/features/partners/api";
import { ApiError } from "@/lib/api/client";
import { HubName, UserName } from "@/features/directory/names";
import { cn, formatDateTime } from "@/lib/utils";

type Decision = {
  status: MerchantStatus;
  label: string;
  description: string;
  requiresReason: boolean;
  destructive?: boolean;
};

type DetailView = "overview" | "readiness" | "review" | "history";

const views: Array<{ value: DetailView; label: string }> = [
  { value: "overview", label: "Tổng quan" },
  { value: "readiness", label: "Sẵn sàng tạo đơn" },
  { value: "review", label: "Xét duyệt" },
  { value: "history", label: "Lịch sử" },
];

function detailView(value: string | null): DetailView {
  return value === "readiness" || value === "review" || value === "history"
    ? value
    : "overview";
}

function statusClass(status: MerchantStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "PENDING_VERIFICATION":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "SUSPENDED":
      return "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:text-slate-300";
    case "REJECTED":
      return "border-destructive/20 bg-destructive/10 text-destructive";
  }
}

function statusDescription(status: MerchantStatus) {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Hồ sơ đang chờ quản trị viên kiểm tra trước khi kích hoạt quyền cửa hàng.";
    case "ACTIVE":
      return "Cửa hàng đã được xác minh và được tạo vận đơn khi đủ điều kiện ở tab “Sẵn sàng tạo đơn”.";
    case "SUSPENDED":
      return "Cửa hàng đang tạm ngưng nên không tạo được vận đơn mới. Tài khoản đăng nhập của họ vẫn hoạt động bình thường.";
    case "REJECTED":
      return "Hồ sơ đã bị từ chối. Cửa hàng có thể sửa và gửi lại hồ sơ; khi đó hồ sơ quay về “Chờ xét duyệt”.";
  }
}

function decisionsFor(status: MerchantStatus): Decision[] {
  switch (status) {
    case "PENDING_VERIFICATION":
      return [
        {
          status: "ACTIVE",
          label: "Phê duyệt cửa hàng",
          description:
            "Xác nhận hồ sơ hợp lệ. Tài khoản được cấp quyền cửa hàng tự động.",
          requiresReason: false,
        },
        {
          status: "REJECTED",
          label: "Từ chối hồ sơ",
          description:
            "Từ chối hồ sơ hiện tại. Cửa hàng thấy lý do và có thể sửa rồi gửi lại.",
          requiresReason: true,
          destructive: true,
        },
      ];
    case "ACTIVE":
      return [
        {
          status: "SUSPENDED",
          label: "Tạm ngưng cửa hàng",
          description:
            "Chặn tạo vận đơn mới. Các vận đơn đang giao vẫn tiếp tục; quyền cửa hàng được gỡ tự động.",
          requiresReason: true,
          destructive: true,
        },
      ];
    case "SUSPENDED":
      return [
        {
          status: "ACTIVE",
          label: "Kích hoạt lại",
          description:
            "Cho phép cửa hàng tạo vận đơn trở lại. Quyền cửa hàng được cấp lại tự động.",
          requiresReason: false,
        },
        {
          status: "REJECTED",
          label: "Từ chối cửa hàng",
          description:
            "Chuyển cửa hàng sang “Đã từ chối”. Cửa hàng có thể sửa và gửi lại hồ sơ.",
          requiresReason: true,
          destructive: true,
        },
      ];
    case "REJECTED":
      return [];
  }
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3.5">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1.5 break-words text-xs font-bold leading-5",
          mono && "font-mono text-[0.68rem]",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: MerchantStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[0.65rem] font-black",
        statusClass(status),
      )}
    >
      {merchantStatusLabel(status)}
    </span>
  );
}

function ReadinessRow({
  state,
  title,
  detail,
}: {
  state: "ok" | "blocked" | "pending" | "unknown";
  title: string;
  detail: string;
}) {
  const icon =
    state === "ok" ? (
      <CheckCircle2Icon className="size-4" />
    ) : state === "blocked" ? (
      <XCircleIcon className="size-4" />
    ) : state === "pending" ? (
      <RefreshCwIcon className="size-4" />
    ) : (
      <CircleHelpIcon className="size-4" />
    );

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/10 p-3.5">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          state === "ok" &&
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          state === "blocked" && "bg-destructive/10 text-destructive",
          state === "pending" &&
            "bg-amber-500/10 text-amber-700 dark:text-amber-300",
          state === "unknown" && "bg-muted text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black">{title}</p>
        <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

function ReadinessVerdict({
  readiness,
  error,
}: {
  readiness: MerchantReadiness | null;
  error: string | null;
}) {
  if (!readiness) {
    return error ? (
      <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
        {error}
      </p>
    ) : null;
  }
  if (readiness.canCreateOrder === null) {
    return (
      <p className="rounded-lg border bg-muted/30 p-3 text-xs font-bold leading-5">
        Chưa kết luận được: các điều kiện khác đều đạt nhưng chưa kiểm tra được tài khoản đăng nhập.
      </p>
    );
  }
  return readiness.canCreateOrder ? (
    <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-xs font-bold leading-5 text-emerald-800 dark:text-emerald-200">
      Cửa hàng đang tạo được vận đơn.
    </p>
  ) : (
    <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
      <p className="font-bold">Cửa hàng chưa tạo được vận đơn vì:</p>
      <ul className="mt-1 list-disc pl-4">
        {readiness.restrictions.map((code) => (
          <li key={code}>{orderRestrictionLabel(code)}</li>
        ))}
      </ul>
    </div>
  );
}

export function MerchantDetail({ merchantId }: { merchantId: string }) {
  const { hasPermission } = useAccess();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = detailView(searchParams.get("view"));
  const canManageStatus = hasPermission("partners.merchants.manage-status");
  const canReadIdentity = hasPermission("identity.users.read");

  const [detail, setDetail] = useState<AdminMerchantResponse | null>(null);
  const [identityUser, setIdentityUser] = useState<UserDetail | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<MerchantReadiness | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reasonCode, setReasonCode] = useState<MerchantStatusReason | "">("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const decisionDialogRef = useRef<HTMLElement>(null);
  const decisionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const savingRef = useRef(false);

  const loadIdentity = useCallback(
    async (userId: string) => {
      if (!canReadIdentity) {
        setIdentityUser(null);
        setIdentityError(null);
        return;
      }

      setIdentityLoading(true);
      setIdentityError(null);
      try {
        setIdentityUser(await getUser(userId));
      } catch (reason) {
        setIdentityUser(null);
        setIdentityError(
          reason instanceof Error
            ? reason.message
            : "Không thể tải trạng thái tài khoản của cửa hàng.",
        );
      } finally {
        setIdentityLoading(false);
      }
    },
    [canReadIdentity],
  );

  const loadReadiness = useCallback(async () => {
    setReadinessError(null);
    try {
      setReadiness(await getMerchantReadiness(merchantId));
    } catch (reason) {
      setReadiness(null);
      setReadinessError(
        reason instanceof Error
          ? reason.message
          : "Không thể kiểm tra điều kiện tạo vận đơn.",
      );
    }
  }, [merchantId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMerchant(merchantId);
      setDetail(result);
      await Promise.all([loadIdentity(result.merchant.userId), loadReadiness()]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải hồ sơ cửa hàng.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadIdentity, loadReadiness, merchantId]);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  useEffect(() => {
    if (!decision) return;

    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'button:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    const frame = window.requestAnimationFrame(() => {
      decisionDialogRef.current
        ?.querySelector<HTMLElement>("[data-dialog-autofocus]")
        ?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (savingRef.current) return;
        event.preventDefault();
        setDecision(null);
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        decisionDialogRef.current?.querySelectorAll<HTMLElement>(
          focusableSelector,
        ) ?? [],
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      decisionTriggerRef.current?.focus();
    };
  }, [decision]);

  const merchant = detail?.merchant ?? null;
  const history = detail?.history ?? [];
  const decisions = useMemo(
    () => (merchant ? decisionsFor(merchant.status) : []),
    [merchant],
  );
  const identityEligible = identityUser
    ? isMerchantIdentityEligible(identityUser)
    : null;
  const merchantRolePresent = identityUser
    ? identityUser.roles.includes("MERCHANT")
    : null;
  const merchantRoleExpected = merchant?.status === "ACTIVE";
  const roleSyncHealthy =
    merchantRolePresent === null || merchantRoleExpected === merchantRolePresent;
  // Partners retries on its own; after a failed attempt the wait is no longer "a few seconds".
  const roleSyncFailing = (readiness?.roleSync?.attempts ?? 0) > 0;
  const defaultPickup = readiness?.pickupAddresses.find(
    (address) => address.id === readiness.defaultPickupAddressId,
  ) ?? null;

  function setView(view: DetailView) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "overview") params.delete("view");
    else params.set("view", view);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function openDecision(event: React.MouseEvent<HTMLButtonElement>, item: Decision) {
    decisionTriggerRef.current = event.currentTarget;
    setDecision(item);
    setReasonCode("");
    setReasonDetail("");
  }

  async function submitDecision() {
    if (!merchant || !decision || !canManageStatus) return;
    if (decision.requiresReason && !reasonCode) {
      toast.error("Vui lòng chọn mã lý do trước khi xác nhận.");
      return;
    }

    setSaving(true);
    try {
      const updated = await changeMerchantStatus(merchant.id, {
        status: decision.status,
        reasonCode:
          decision.requiresReason && reasonCode !== "" ? reasonCode : null,
        reasonDetail: reasonDetail.trim() || null,
      });

      setDetail(updated);
      void loadIdentity(updated.merchant.userId);
      void loadReadiness();
      setDecision(null);
      setReasonCode("");
      setReasonDetail("");
      toast.success("Đã cập nhật trạng thái cửa hàng.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        toast.error(
          "Trạng thái cửa hàng vừa được thay đổi ở nơi khác. Dữ liệu sẽ được tải lại.",
        );
        setDecision(null);
        setReasonCode("");
        setReasonDetail("");
        await load();
      } else {
        toast.error(
          reason instanceof Error
            ? reason.message
            : "Không thể cập nhật cửa hàng.",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading && !merchant) {
    return (
      <div className="grid min-h-[55vh] place-items-center rounded-xl border bg-card">
        <div className="text-center">
          <LoaderCircleIcon className="mx-auto size-6 animate-spin text-brand" />
          <p className="mt-3 text-xs font-bold text-muted-foreground">
            Đang tải hồ sơ cửa hàng...
          </p>
        </div>
      </div>
    );
  }

  if (error && !merchant) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-8 text-center">
        <ShieldAlertIcon className="mx-auto size-8 text-destructive" />
        <p className="mt-3 text-sm font-bold text-destructive">{error}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/partners/merchants"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border bg-background px-3.5 text-xs font-bold hover:bg-muted"
          >
            <ArrowLeftIcon className="size-4" />
            Danh sách
          </Link>
          <Button onClick={() => void load()}>
            <RefreshCwIcon className="size-4" />
            Thử lại
          </Button>
        </div>
      </div>
    );
  }

  if (!merchant) return null;

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/partners/merchants"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" />
              Cửa hàng
            </Link>
            <div className="mt-4 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand/15 bg-brand/10 text-brand">
                <StoreIcon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-brand">
                  {merchant.merchantCode}
                </p>
                <h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">
                  {merchant.businessName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill status={merchant.status} />
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {merchant.merchantCode}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              {statusDescription(merchant.status)}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void load()}
            disabled={loading || saving}
          >
            <RefreshCwIcon className={cn("size-4", loading && "animate-spin")} />
            Tải lại
          </Button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Trạng thái
            </p>
            <p className="mt-1.5 text-sm font-black">
              {merchantStatusLabel(merchant.status)}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Tạo lúc
            </p>
            <p className="mt-1.5 text-xs font-black">
              {formatDateTime(merchant.createdAt)}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Xác minh
            </p>
            <p className="mt-1.5 text-xs font-black">
              {merchant.verifiedAt ? "Đã xác minh" : "Chưa xác minh"}
            </p>
          </div>
          <div className="p-3.5 sm:p-4">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-muted-foreground">
              Tạo vận đơn
            </p>
            <p className="mt-1.5 text-xs font-black">
              {readiness === null
                ? "Chưa kiểm tra"
                : readiness.canCreateOrder === null
                  ? "Chưa kết luận"
                  : readiness.canCreateOrder
                    ? "Được phép"
                    : "Đang bị chặn"}
            </p>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-t bg-muted/20 p-1.5 sm:px-3">
          {views.map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => setView(view.value)}
              className={cn(
                "h-9 shrink-0 rounded-md px-3 text-xs font-black transition",
                activeView === view.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/65 hover:text-foreground",
              )}
            >
              {view.label}
            </button>
          ))}
        </div>
      </section>

      {activeView === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2Icon className="size-4 text-brand" />
                <h2 className="text-sm font-black">Thông tin doanh nghiệp</h2>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Fact label="Mã cửa hàng" value={merchant.merchantCode} mono />
              <Fact label="Tên doanh nghiệp" value={merchant.businessName} />
              <Fact label="Mã số thuế" value={merchant.taxCode} mono />
              <Fact label="Người liên hệ" value={merchant.contactName} />
              <Fact label="Tài khoản đăng nhập" value={<UserName id={merchant.userId} fallback="Chủ cửa hàng" />} />
              <Fact label="Bưu cục phụ trách" value={merchant.servingHubId ? <HubName id={merchant.servingHubId} /> : "Chưa xác định (cửa hàng chưa có địa chỉ kho)"} />
              <Fact label="Ngày tạo" value={formatDateTime(merchant.createdAt)} />
              <Fact
                label="Cập nhật gần nhất"
                value={formatDateTime(merchant.updatedAt)}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserRoundIcon className="size-4 text-brand" />
                  <h2 className="text-sm font-black">Liên hệ</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                  <PhoneIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                      Điện thoại
                    </p>
                    <p className="mt-1 break-all text-xs font-bold">
                      {merchant.contactPhone}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
                  <MailIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.08em] text-muted-foreground">
                      Email
                    </p>
                    <p className="mt-1 break-all text-xs font-bold">
                      {merchant.contactEmail || "—"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserRoundIcon className="size-4 text-brand" />
                  <h2 className="text-sm font-black">Tài khoản đăng nhập</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-5 text-muted-foreground">
                  Quyền cửa hàng của tài khoản được cấp hoặc gỡ tự động theo
                  trạng thái hồ sơ; không cần gán thủ công.
                </p>
                <p className="mt-3 text-sm font-bold">
                  <UserName id={merchant.userId} fallback="Chủ cửa hàng" />
                </p>
                {canReadIdentity ? (
                  <Link
                    href={`/identity/users/${merchant.userId}`}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border bg-background px-3.5 text-xs font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                  >
                    Mở tài khoản người dùng
                    <ExternalLinkIcon className="size-3.5" />
                  </Link>
                ) : (
                  <p className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    Bạn không có quyền xem tài khoản đăng nhập.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {activeView === "readiness" ? (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black">Sẵn sàng tạo vận đơn</h2>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    Cùng các điều kiện hệ thống kiểm tra khi cửa hàng bấm “Tạo vận đơn”.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={identityLoading}
                  onClick={() => {
                    void loadReadiness();
                    void loadIdentity(merchant.userId);
                  }}
                >
                  <RefreshCwIcon
                    className={cn("size-3.5", identityLoading && "animate-spin")}
                  />
                  Kiểm tra lại
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ReadinessVerdict readiness={readiness} error={readinessError} />
              <ReadinessRow
                state={merchant.status === "ACTIVE" ? "ok" : "blocked"}
                title="Trạng thái cửa hàng"
                detail={
                  merchant.status === "ACTIVE"
                    ? "Đang hoạt động."
                    : `Đang ở trạng thái “${merchantStatusLabel(merchant.status)}” nên chưa tạo được vận đơn.`
                }
              />
              <ReadinessRow
                state={
                  readiness
                    ? !readiness.identityChecked
                      ? "unknown"
                      : readiness.restrictions.includes("IDENTITY_NOT_ELIGIBLE")
                        ? "blocked"
                        : "ok"
                    : identityLoading
                      ? "pending"
                      : identityEligible === null
                        ? "unknown"
                        : identityEligible
                          ? "ok"
                          : "blocked"
                }
                title="Tài khoản đăng nhập"
                detail={
                  readiness && !readiness.identityChecked
                    ? "Không kiểm tra được tài khoản lúc này. Hãy thử lại sau ít phút."
                    : identityUser
                      ? `${accountLabels[identityUser.status]} · email ${identityUser.emailVerified ? "đã xác minh" : "chưa xác minh"} · hồ sơ ${profileLabels[identityUser.profileStatus].toLowerCase()}`
                      : readiness?.restrictions.includes("IDENTITY_NOT_ELIGIBLE")
                        ? "Tài khoản bị khóa, chưa xác minh email hoặc chưa hoàn tất hồ sơ."
                        : readiness
                          ? "Đủ điều kiện."
                          : identityError ?? "Đang kiểm tra…"
                }
              />
              <ReadinessRow
                state={
                  identityLoading
                    ? "pending"
                    : merchantRolePresent === null
                      ? "unknown"
                      : roleSyncHealthy
                        ? "ok"
                        : roleSyncFailing
                          ? "blocked"
                          : "pending"
                }
                title="Quyền cửa hàng trên tài khoản"
                detail={
                  !canReadIdentity
                    ? "Bạn không có quyền xem tài khoản người dùng nên chưa kiểm tra được."
                    : identityError
                      ? "Không đọc được tài khoản người dùng lúc này."
                      : merchantRolePresent === null
                        ? "Đang kiểm tra…"
                        : roleSyncHealthy
                          ? merchantRolePresent
                            ? "Tài khoản đã có quyền cửa hàng."
                            : "Cửa hàng không hoạt động và tài khoản không còn quyền cửa hàng."
                          : roleSyncFailing
                            ? `Đồng bộ quyền cửa hàng sang tài khoản đã lỗi ${readiness?.roleSync?.attempts} lần${
                                readiness?.roleSync?.lastError ? ` (${readiness.roleSync.lastError})` : ""
                              }. Hệ thống tự thử lại; nếu vẫn lỗi, kiểm tra dịch vụ Identity và Partners.`
                            : merchantRoleExpected
                              ? "Cửa hàng đã được duyệt nhưng tài khoản chưa có quyền cửa hàng. Hệ thống đang cập nhật; bấm “Kiểm tra lại” sau vài giây."
                              : "Cửa hàng không hoạt động nhưng tài khoản vẫn còn quyền cửa hàng. Hệ thống đang gỡ quyền; bấm “Kiểm tra lại” sau vài giây."
                }
              />
              <ReadinessRow
                state={
                  !readiness
                    ? "unknown"
                    : readiness.restrictions.includes("DEFAULT_PICKUP_REQUIRED")
                      ? "blocked"
                      : defaultPickup && !defaultPickup.usableAsSender
                        ? "pending"
                        : "ok"
                }
                title="Điểm lấy hàng mặc định"
                detail={
                  !readiness
                    ? readinessError ?? "Đang kiểm tra…"
                    : readiness.restrictions.includes("DEFAULT_PICKUP_REQUIRED")
                      ? "Cửa hàng chưa đặt điểm lấy hàng mặc định."
                      : defaultPickup && !defaultPickup.usableAsSender
                        ? `“${defaultPickup.name}” chưa dùng được làm người gửi (số điện thoại hoặc địa chỉ không hợp lệ). Cửa hàng cần cập nhật trước khi tạo đơn.`
                        : defaultPickup
                          ? `“${defaultPickup.name}”.`
                          : "Đã thiết lập."
                }
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="size-4 text-brand" />
                  <h2 className="text-sm font-black">
                    Điểm lấy hàng{readiness ? ` (${readiness.pickupAddresses.length})` : ""}
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!readiness ? (
                  <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    {readinessError ?? "Đang tải điểm lấy hàng…"}
                  </p>
                ) : readiness.pickupAddresses.length ? (
                  readiness.pickupAddresses.map((address) => (
                    <article key={address.id} className="rounded-lg border bg-muted/15 p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black">{address.name}</p>
                        {address.isDefault ? (
                          <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[0.6rem] font-black text-brand">
                            Mặc định
                          </span>
                        ) : null}
                        {!address.usableAsSender ? (
                          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-black text-amber-700 dark:text-amber-300">
                            Chưa dùng được để tạo đơn
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[0.68rem] leading-5 text-muted-foreground">
                        {address.contactName} · {address.contactPhone}
                      </p>
                      <p className="text-[0.68rem] leading-5 text-muted-foreground">
                        {[address.addressLine, address.wardName ?? address.wardCode, address.provinceName ?? address.provinceCode].join(", ")}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    Cửa hàng chưa thêm điểm lấy hàng nào.
                  </p>
                )}
              </CardContent>
            </Card>

            {canReadIdentity ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserRoundIcon className="size-4 text-brand" />
                    <h2 className="text-sm font-black">Tài khoản đăng nhập</h2>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {identityLoading && !identityUser ? (
                    <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      Đang tải tài khoản…
                    </p>
                  ) : identityUser ? (
                    <>
                      <Fact label="Email" value={identityUser.email} />
                      <Fact label="Trạng thái tài khoản" value={accountLabels[identityUser.status]} />
                      <Fact
                        label="Hồ sơ cá nhân"
                        value={profileLabels[identityUser.profileStatus]}
                      />
                      <Fact
                        label="Vai trò"
                        value={
                          identityUser.roles.length
                            ? identityUser.roles
                                .map((role) => rolePresentation(role).name)
                                .join(", ")
                            : "Không có vai trò"
                        }
                      />
                    </>
                  ) : (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                      {identityError ?? "Không tải được tài khoản."}
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeView === "review" ? (
        <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-4 text-brand" />
                <h2 className="text-sm font-black">Trạng thái hiện tại</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={cn("rounded-lg border p-4", statusClass(merchant.status))}>
                <p className="text-sm font-black">
                  {merchantStatusLabel(merchant.status)}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-85">
                  {statusDescription(merchant.status)}
                </p>
              </div>
              {merchant.statusReasonCode ? (
                <Fact
                  label="Mã lý do gần nhất"
                  value={merchantReasonLabel(merchant.statusReasonCode)}
                />
              ) : null}
              {merchant.statusReasonDetail ? (
                <Fact label="Chi tiết lý do" value={merchant.statusReasonDetail} />
              ) : null}
              <Fact
                label="Đổi trạng thái lúc"
                value={formatDateTime(merchant.statusChangedAt)}
              />
              <ul className="grid gap-1 text-[0.68rem] leading-5 text-muted-foreground">
                <li>Chờ xét duyệt → Phê duyệt hoặc Từ chối.</li>
                <li>Đang hoạt động → Tạm ngưng.</li>
                <li>Tạm ngưng → Kích hoạt lại hoặc Từ chối.</li>
                <li>Đã từ chối → cửa hàng tự sửa và gửi lại hồ sơ để được xét duyệt lại.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-black">Quyết định cửa hàng</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canManageStatus ? (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Bạn có quyền xem nhưng không có quyền thay đổi trạng thái
                  cửa hàng.
                </p>
              ) : decisions.length ? (
                decisions.map((item) => (
                  <button
                    key={item.status}
                    type="button"
                    onClick={(event) => openDecision(event, item)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                      item.destructive && "border-destructive/25",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
                          item.destructive
                            ? "bg-destructive/10 text-destructive"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {item.destructive ? (
                          <XCircleIcon className="size-4" />
                        ) : (
                          <CheckCircle2Icon className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-black">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
                  Không cần thao tác thêm. Khi cửa hàng sửa và gửi lại hồ sơ,
                  hồ sơ sẽ quay về “Chờ xét duyệt” để bạn xét lại.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeView === "history" ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HistoryIcon className="size-4 text-brand" />
              <div>
                <h2 className="text-sm font-black">Lịch sử trạng thái</h2>
                <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                  {history.length} sự kiện · mới nhất trước
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.length ? (
              <div className="space-y-3">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border bg-muted/15 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.fromStatus ? (
                            <StatusPill status={item.fromStatus} />
                          ) : (
                            <span className="rounded-full border bg-background px-2.5 py-1 text-[0.65rem] font-black text-muted-foreground">
                              Khởi tạo
                            </span>
                          )}
                          <span className="text-xs font-black text-muted-foreground">
                            →
                          </span>
                          <StatusPill status={item.toStatus} />
                        </div>
                        {item.reasonCode ? (
                          <p className="mt-3 text-xs font-bold">
                            {merchantReasonLabel(item.reasonCode)}
                          </p>
                        ) : null}
                        {item.reasonDetail ? (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {item.reasonDetail}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-xs font-bold">
                          {formatDateTime(item.changedAt)}
                        </p>
                        <p className="mt-1 max-w-60 text-[0.62rem] text-muted-foreground">
                          {item.changedByUserId
                            ? item.changedByUserId === merchant.userId
                              ? "Cửa hàng tự thao tác"
                              : <>Người thực hiện: <UserName id={item.changedByUserId} /></>
                            : "Hệ thống"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <Clock3Icon className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-xs font-bold text-muted-foreground">
                    Chưa có lịch sử trạng thái.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {decision ? (
        <div className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-4">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 bg-black/55"
            onClick={() => !saving && setDecision(null)}
          />
          <section
            ref={decisionDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="merchant-decision-title"
            aria-describedby="merchant-decision-description"
            className="relative max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-2xl border bg-card p-4 shadow-2xl sm:max-h-[min(42rem,calc(100dvh-2rem))] sm:max-w-lg sm:rounded-xl sm:p-5"
          >
            <p className="text-xs font-black uppercase tracking-[0.12em] text-brand">
              Xác nhận quyết định
            </p>
            <h2 id="merchant-decision-title" className="mt-2 text-lg font-black">
              {decision.label}
            </h2>
            <p
              id="merchant-decision-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              {decision.description}
            </p>

            {decision.requiresReason ? (
              <div className="mt-5 space-y-4">
                <label className="grid gap-2 text-xs font-bold">
                  Mã lý do <span className="text-destructive">*</span>
                  <select
                    value={reasonCode}
                    data-dialog-autofocus
                    onChange={(event) =>
                      setReasonCode(event.target.value as MerchantStatusReason | "")
                    }
                    className="h-10 rounded-md border bg-background px-3 text-xs font-bold outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                  >
                    <option value="">Chọn lý do</option>
                    {merchantStatusReasons.map((item) => (
                      <option key={item} value={item}>
                        {merchantReasonLabel(item)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-xs font-bold">
                  Chi tiết lý do
                  <textarea
                    value={reasonDetail}
                    onChange={(event) => setReasonDetail(event.target.value)}
                    rows={4}
                    maxLength={500}
                    className="resize-y rounded-md border bg-background p-3 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    placeholder="Thông tin bổ sung phục vụ nhật ký và hỗ trợ cửa hàng..."
                  />
                  <span className="text-right text-[0.65rem] font-normal text-muted-foreground">
                    {reasonDetail.length}/500
                  </span>
                </label>
              </div>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setDecision(null)}
                disabled={saving}
              >
                Hủy
              </Button>
              <Button
                data-dialog-autofocus={!decision.requiresReason ? "" : undefined}
                variant={decision.destructive ? "destructive" : "default"}
                onClick={() => void submitDecision()}
                disabled={saving || (decision.requiresReason && !reasonCode)}
              >
                {saving ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Xác nhận
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
