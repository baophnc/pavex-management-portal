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
  isMerchantIdentityEligible,
  profileLabels,
  rolePresentation,
} from "@/features/identity/presentation";
import {
  merchantReasonLabel,
  merchantStatusLabel,
  merchantStatusReasons,
  type AdminMerchantResponse,
  type MerchantStatus,
  type MerchantStatusReason,
} from "@/features/partners/contracts";
import { changeMerchantStatus, getMerchant } from "@/features/partners/api";
import { ApiError } from "@/lib/api/client";
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
      return "Hồ sơ đang chờ quản trị viên kiểm tra trước khi kích hoạt quyền Merchant.";
    case "ACTIVE":
      return "Merchant đã được xác minh. Backend sẽ đồng bộ role MERCHANT cho tài khoản Identity.";
    case "SUSPENDED":
      return "Quyền Merchant đang tạm ngưng. Trạng thái này không đồng nghĩa khóa toàn bộ tài khoản Identity.";
    case "REJECTED":
      return "Hồ sơ đã bị từ chối. Đây là trạng thái kết thúc trong luồng quản trị hiện tại.";
  }
}

function decisionsFor(status: MerchantStatus): Decision[] {
  switch (status) {
    case "PENDING_VERIFICATION":
      return [
        {
          status: "ACTIVE",
          label: "Phê duyệt Merchant",
          description:
            "Xác minh hồ sơ, kích hoạt Merchant và yêu cầu backend đồng bộ role MERCHANT.",
          requiresReason: false,
        },
        {
          status: "REJECTED",
          label: "Từ chối hồ sơ",
          description:
            "Từ chối hồ sơ hiện tại. Backend yêu cầu chọn mã lý do để lưu audit.",
          requiresReason: true,
          destructive: true,
        },
      ];
    case "ACTIVE":
      return [
        {
          status: "SUSPENDED",
          label: "Tạm ngưng Merchant",
          description:
            "Tạm ngưng quyền Merchant. Backend yêu cầu chọn mã lý do và sẽ gỡ quyền Merchant qua outbox đồng bộ Identity.",
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
            "Khôi phục Merchant và yêu cầu backend đồng bộ lại role MERCHANT.",
          requiresReason: false,
        },
        {
          status: "REJECTED",
          label: "Từ chối Merchant",
          description:
            "Chuyển Merchant sang trạng thái từ chối. Backend yêu cầu chọn mã lý do.",
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
            : "Không thể tải trạng thái Identity của Merchant.",
        );
      } finally {
        setIdentityLoading(false);
      }
    },
    [canReadIdentity],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMerchant(merchantId);
      setDetail(result);
      await loadIdentity(result.merchant.userId);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể tải hồ sơ Merchant.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadIdentity, merchantId]);

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
      setDecision(null);
      setReasonCode("");
      setReasonDetail("");
      toast.success("Đã cập nhật trạng thái Merchant.");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        toast.error(
          "Transition không còn hợp lệ. Dữ liệu Merchant sẽ được tải lại.",
        );
        setDecision(null);
        setReasonCode("");
        setReasonDetail("");
        await load();
      } else {
        toast.error(
          reason instanceof Error
            ? reason.message
            : "Không thể cập nhật Merchant.",
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
            Đang tải hồ sơ Merchant...
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
              Merchant
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
                    {merchant.id}
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
              Version
            </p>
            <p className="mt-1.5 text-xs font-black">v{merchant.version}</p>
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
              <Fact label="Mã Merchant" value={merchant.merchantCode} mono />
              <Fact label="Tên doanh nghiệp" value={merchant.businessName} />
              <Fact label="Mã số thuế" value={merchant.taxCode} mono />
              <Fact label="Người liên hệ" value={merchant.contactName} />
              <Fact label="Merchant ID" value={merchant.id} mono />
              <Fact label="User ID" value={merchant.userId} mono />
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
                  <h2 className="text-sm font-black">Tài khoản Identity</h2>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-5 text-muted-foreground">
                  Role MERCHANT được backend Partners đồng bộ theo trạng thái
                  Merchant; không cần gán thủ công trong màn này.
                </p>
                <p className="mt-3 break-all font-mono text-[0.68rem] font-bold">
                  {merchant.userId}
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
                    Bạn không có quyền đọc tài khoản Identity.
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
                  <h2 className="text-sm font-black">Merchant order readiness</h2>
                  <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                    Đối chiếu những điều Management đọc được từ Partners và Identity.
                  </p>
                </div>
                {canReadIdentity ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={identityLoading}
                    onClick={() => void loadIdentity(merchant.userId)}
                  >
                    <RefreshCwIcon
                      className={cn("size-3.5", identityLoading && "animate-spin")}
                    />
                    Kiểm tra Identity
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ReadinessRow
                state={merchant.status === "ACTIVE" ? "ok" : "blocked"}
                title="Merchant status"
                detail={
                  merchant.status === "ACTIVE"
                    ? "Merchant đang ACTIVE."
                    : `Merchant đang ${merchantStatusLabel(merchant.status)}; order capability sẽ bị chặn.`
                }
              />
              <ReadinessRow
                state={
                  identityLoading
                    ? "pending"
                    : identityEligible === null
                      ? "unknown"
                      : identityEligible
                        ? "ok"
                        : "blocked"
                }
                title="Identity eligibility"
                detail={
                  !canReadIdentity
                    ? "Cần identity.users.read để đối chiếu account status, email verification và profile status."
                    : identityError
                      ? identityError
                      : identityUser
                        ? `${identityUser.status} · email ${identityUser.emailVerified ? "verified" : "chưa verified"} · profile ${profileLabels[identityUser.profileStatus]}`
                        : "Đang chờ dữ liệu Identity."
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
                        : "pending"
                }
                title="MERCHANT role sync"
                detail={
                  !canReadIdentity
                    ? "Không thể kiểm tra role sync khi thiếu identity.users.read."
                    : identityError
                      ? "Identity hiện không đọc được; chưa kết luận được role sync."
                      : merchantRolePresent === null
                        ? "Chưa có dữ liệu role."
                        : roleSyncHealthy
                          ? merchantRolePresent
                            ? "Identity đang có role MERCHANT đúng với Merchant ACTIVE."
                            : "Merchant không ACTIVE và Identity không còn role MERCHANT."
                          : merchantRoleExpected
                            ? "Merchant đã ACTIVE nhưng Identity chưa có MERCHANT. Có thể outbox đang chờ xử lý; refresh lại sau vài giây."
                            : "Merchant không ACTIVE nhưng Identity vẫn còn MERCHANT. Có thể outbox gỡ role đang chờ xử lý."
                }
              />
              <ReadinessRow
                state="unknown"
                title="Default pickup address"
                detail="Partners AdminMerchantResponse hiện chưa expose pickup address hoặc order-capability. Management Web không thể kết luận DEFAULT_PICKUP_REQUIRED từ API admin hiện tại."
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <UserRoundIcon className="size-4 text-brand" />
                  <h2 className="text-sm font-black">Identity snapshot</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {!canReadIdentity ? (
                  <p className="rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    Bạn không có identity.users.read nên Management chỉ hiển thị trạng thái Partners.
                  </p>
                ) : identityLoading && !identityUser ? (
                  <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                    Đang đọc Identity...
                  </p>
                ) : identityUser ? (
                  <>
                    <Fact label="Email" value={identityUser.email} />
                    <Fact label="Account" value={identityUser.status} />
                    <Fact
                      label="Profile"
                      value={profileLabels[identityUser.profileStatus]}
                    />
                    <Fact
                      label="Roles"
                      value={
                        identityUser.roles.length
                          ? identityUser.roles
                              .map((role) => rolePresentation(role).name)
                              .join(", ")
                          : "Không có role"
                      }
                    />
                  </>
                ) : (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                    {identityError ?? "Không có Identity snapshot."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/[0.035]">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="size-4 text-amber-700 dark:text-amber-300" />
                  <h2 className="text-sm font-black">Giới hạn contract hiện tại</h2>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p>
                  Backend Partners admin hiện trả merchant profile + status history, chưa trả default pickup hay restrictions của order capability.
                </p>
                <p>
                  Vì vậy UI cố tình hiển thị “không xác định” thay vì đoán. Nếu cần readiness 100%, backend phải bổ sung admin capability snapshot ở một patch riêng.
                </p>
              </CardContent>
            </Card>
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
              <p className="text-[0.68rem] leading-5 text-muted-foreground">
                Backend kiểm tra transition cuối cùng. PENDING_VERIFICATION chỉ
                được ACTIVE/REJECTED; ACTIVE chỉ được SUSPENDED; SUSPENDED được
                ACTIVE/REJECTED; REJECTED là terminal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-sm font-black">Quyết định Merchant</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canManageStatus ? (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Bạn có quyền xem nhưng không có quyền thay đổi trạng thái
                  Merchant.
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
                  Trạng thái hiện tại không có transition quản trị tiếp theo.
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
                        <p className="mt-1 max-w-60 break-all font-mono text-[0.62rem] text-muted-foreground">
                          {item.changedByUserId
                            ? `actor: ${item.changedByUserId}`
                            : "system / self-service"}
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
                    placeholder="Thông tin bổ sung phục vụ audit và hỗ trợ Merchant..."
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
