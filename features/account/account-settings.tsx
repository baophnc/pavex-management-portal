"use client";

import {
  CheckCircle2Icon,
  Clock3Icon,
  KeyRoundIcon,
  LaptopIcon,
  LogOutIcon,
  MailCheckIcon,
  RefreshCwIcon,
  SaveIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundCogIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  AccountGender,
  CurrentAccountProfile,
  SessionListItem,
} from "@/features/account/contracts";
import { AvatarPicker } from "@/features/account/avatar-picker";
import { ApiError, apiRequest } from "@/lib/api/client";
import { passwordProblem } from "@/lib/auth/password-policy";
import { cn } from "@/lib/utils";

const genders: Array<{ value: AccountGender; label: string }> = [
  { value: "UNSPECIFIED", label: "Không cung cấp" },
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

type ProfileDraft = {
  firstName: string;
  lastName: string;
  displayName: string;
  gender: AccountGender;
  dateOfBirth: string;
  avatarUrl: string;
};

const emptyProfileDraft: ProfileDraft = {
  firstName: "",
  lastName: "",
  displayName: "",
  gender: "UNSPECIFIED",
  dateOfBirth: "",
  avatarUrl: "",
};

function asProfileDraft(profile: CurrentAccountProfile): ProfileDraft {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    displayName: profile.displayName ?? "",
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth ?? "",
    avatarUrl: profile.avatarUrl ?? "",
  };
}

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) {
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (reason.status === 429) {
      return reason.retryAfterSeconds !== null
        ? `Quá nhiều yêu cầu. Hãy thử lại sau khoảng ${reason.retryAfterSeconds} giây.`
        : "Quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.";
    }
    return reason.message || fallback;
  }
  return reason instanceof Error ? reason.message : fallback;
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function initials(profile: CurrentAccountProfile | null) {
  const source = profile?.displayName?.trim() || profile?.email || "PV";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function statusTone(status: string) {
  if (status === "ACTIVE" || status === "COMPLETED") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "SUSPENDED" || status === "PENDING_VERIFICATION") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "border-border bg-muted text-muted-foreground";
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: typeof UserRoundCogIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
        <Icon className="size-4 text-brand" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.62rem] font-black tracking-[0.15em] text-brand uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-base font-black">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function SessionDevice({ userAgent }: { userAgent: string | null }) {
  const value = userAgent?.trim();
  if (!value) return "Không rõ thiết bị";
  if (/mobile|android|iphone|ipad/i.test(value)) return "Thiết bị di động";
  if (/macintosh|mac os/i.test(value)) return "macOS";
  if (/windows/i.test(value)) return "Windows";
  if (/linux/i.test(value)) return "Linux";
  return "Trình duyệt / thiết bị";
}

export function AccountSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<CurrentAccountProfile | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(emptyProfileDraft);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadProfile = useCallback(async () => {
    const value = (await apiRequest("auth/me")) as CurrentAccountProfile;
    setProfile(value);
    setProfileDraft(asProfileDraft(value));
  }, []);

  const loadSessions = useCallback(async () => {
    const value = (await apiRequest("auth/sessions")) as SessionListItem[];
    setSessions(value);
  }, []);

  const loadAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);

      const results = await Promise.allSettled([loadProfile(), loadSessions()]);
      const rejected = results.find((result) => result.status === "rejected");

      if (rejected?.status === "rejected") {
        setLoadError(
          errorMessage(rejected.reason, "Không thể tải dữ liệu tài khoản."),
        );
      }

      if (!silent) setLoading(false);
    },
    [loadProfile, loadSessions],
  );

  useEffect(() => {
    const task = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(task);
  }, [loadAll]);

  const sortedPermissions = useMemo(
    () => [...(profile?.permissions ?? [])].sort((a, b) => a.localeCompare(b)),
    [profile?.permissions],
  );

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      profile?.profileStatus === "COMPLETED" &&
      (!profileDraft.firstName.trim() ||
        !profileDraft.lastName.trim() ||
        profileDraft.gender === "UNSPECIFIED" ||
        !profileDraft.dateOfBirth)
    ) {
      toast.error(
        "Hồ sơ đã hoàn tất nên không thể xóa tên, họ, giới tính hoặc ngày sinh bắt buộc.",
      );
      return;
    }

    if (
      profileDraft.dateOfBirth &&
      profileDraft.dateOfBirth > todayInputValue()
    ) {
      toast.error("Ngày sinh không thể nằm trong tương lai.");
      return;
    }

    setSaving("profile");

    try {
      const value = (await apiRequest("auth/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: profileDraft.firstName.trim() || null,
          lastName: profileDraft.lastName.trim() || null,
          displayName: profileDraft.displayName.trim() || null,
          gender: profileDraft.gender,
          dateOfBirth: profileDraft.dateOfBirth || null,
          avatarUrl: profileDraft.avatarUrl.trim() || null,
        }),
      })) as CurrentAccountProfile;

      setProfile(value);
      setProfileDraft(asProfileDraft(value));
      window.dispatchEvent(new Event("pavex-management:user-updated"));
      toast.success("Đã cập nhật hồ sơ cá nhân.");
    } catch (reason) {
      toast.error(errorMessage(reason, "Không thể cập nhật hồ sơ."));
    } finally {
      setSaving(null);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentPassword) {
      toast.error("Nhập mật khẩu hiện tại.");
      return;
    }
    const problem = passwordProblem(newPassword);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setSaving("password");
    try {
      await apiRequest("auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đã đổi mật khẩu. Bạn cần đăng nhập lại.");

      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (reason) {
      setSaving(null);
      toast.error(errorMessage(reason, "Không thể đổi mật khẩu."));
    }
  }

  async function revokeSession(sessionId: string) {
    if (!window.confirm("Đăng xuất phiên đăng nhập này?")) return;

    setSaving(`session:${sessionId}`);
    try {
      await apiRequest(`auth/sessions/${sessionId}`, { method: "DELETE" });
      toast.success("Đã thu hồi phiên đăng nhập.");
      await loadSessions();
    } catch (reason) {
      toast.error(errorMessage(reason, "Không thể thu hồi phiên đăng nhập."));
    } finally {
      setSaving(null);
    }
  }

  async function logoutAll() {
    if (
      !window.confirm(
        "Đăng xuất mọi phiên đăng nhập, kể cả thiết bị hiện tại?",
      )
    ) {
      return;
    }

    setSaving("logout-all");
    try {
      await apiRequest("auth/logout-all", { method: "POST" });
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (reason) {
      setSaving(null);
      toast.error(errorMessage(reason, "Không thể đăng xuất toàn bộ thiết bị."));
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-2xl border bg-card">
        <div className="text-center">
          <RefreshCwIcon className="mx-auto size-5 animate-spin text-brand" />
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Đang tải tài khoản...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-brand uppercase">
            Tự quản lý
          </p>
          <h1 className="mt-1 text-2xl font-black">Tài khoản của tôi</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Quản lý hồ sơ cá nhân, mật khẩu và các phiên đăng nhập của chính tài
            khoản đang đăng nhập.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadAll()}>
          <RefreshCwIcon className="size-4" />
          Làm mới
        </Button>
      </div>

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs">
          <p className="font-semibold text-destructive">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void loadAll()}>
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <Card>
          <CardHeader>
            <SectionTitle
              icon={UserRoundCogIcon}
              eyebrow="Hồ sơ"
              title="Hồ sơ cá nhân"
              description="Xem và cập nhật thông tin của chính bạn, không cần quyền quản trị người dùng khác."
            />
          </CardHeader>
          <CardContent className="space-y-5">
            {profile ? (
              <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-muted/25 p-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand/10 text-lg font-black text-brand ring-1 ring-brand/15">
                  {initials(profile)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black">
                    {profile.displayName ||
                      [profile.firstName, profile.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                      "Chưa đặt tên hiển thị"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.6rem] font-black",
                        statusTone(profile.status),
                      )}
                    >
                      {profile.status}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.6rem] font-black",
                        statusTone(profile.profileStatus),
                      )}
                    >
                      {profile.profileStatus}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[0.6rem] font-bold text-muted-foreground">
                      <MailCheckIcon className="size-3" />
                      {profile.emailVerified ? "Email đã xác minh" : "Email chưa xác minh"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <form className="grid gap-4" onSubmit={saveProfile}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  Tên
                  <Input
                    value={profileDraft.firstName}
                    maxLength={100}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-bold">
                  Họ
                  <Input
                    value={profileDraft.lastName}
                    maxLength={100}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-bold">
                Tên hiển thị
                <Input
                  value={profileDraft.displayName}
                  maxLength={200}
                  onChange={(event) =>
                    setProfileDraft((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-bold">
                  Giới tính
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
                    value={profileDraft.gender}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        gender: event.target.value as AccountGender,
                      }))
                    }
                  >
                    {genders.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs font-bold">
                  Ngày sinh
                  <Input
                    type="date"
                    max={todayInputValue()}
                    value={profileDraft.dateOfBirth}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="grid gap-1.5 text-xs font-bold">
                Ảnh đại diện
                <AvatarPicker<CurrentAccountProfile>
                  avatarUrl={profile?.avatarUrl}
                  initials={initials(profile)}
                  uploadPath="auth/me/avatar"
                  onUploaded={(value) => {
                    setProfile(value);
                    // Keep unsaved edits to the other fields; only the photo changed.
                    setProfileDraft((current) => ({ ...current, avatarUrl: value.avatarUrl ?? "" }));
                    window.dispatchEvent(new Event("pavex-management:user-updated"));
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
<span />
                <Button disabled={saving === "profile"}>
                  {saving === "profile" ? (
                    <RefreshCwIcon className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  Lưu hồ sơ
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionTitle
              icon={KeyRoundIcon}
              eyebrow="Bảo mật"
              title="Đổi mật khẩu"
              description="Mật khẩu mới dài 8–128 ký tự, có cả chữ và số. Sau khi đổi, mọi phiên đăng nhập khác sẽ bị đăng xuất."
            />
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={changePassword}>
              <label className="grid gap-1.5 text-xs font-bold">
                Mật khẩu hiện tại
                <Input
                  type="password"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                Mật khẩu mới
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold">
                Xác nhận mật khẩu mới
                <Input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              <div className="rounded-lg border bg-muted/25 p-3 text-[0.68rem] leading-5 text-muted-foreground">
                <p className="flex items-start gap-2">
                  <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  Sau khi đổi mật khẩu, mọi phiên đăng nhập cũ sẽ bị đăng xuất.
                  Trang quản trị sẽ xóa phiên trên trình duyệt này và chuyển về trang đăng nhập.
                </p>
              </div>

              <Button disabled={saving === "password"}>
                {saving === "password" ? (
                  <RefreshCwIcon className="size-4 animate-spin" />
                ) : (
                  <ShieldCheckIcon className="size-4" />
                )}
                Đổi mật khẩu
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <SectionTitle
            icon={LaptopIcon}
            eyebrow="Phiên đăng nhập"
            title="Phiên đăng nhập"
            description="Các phiên đăng nhập còn hiệu lực. Hệ thống chưa nhận biết được phiên nào là thiết bị bạn đang dùng."
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={saving === "logout-all" || sessions.length === 0}
            onClick={() => void logoutAll()}
          >
            <LogOutIcon className="size-3.5" />
            Đăng xuất tất cả
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/25 p-3">
              <p className="text-[0.6rem] font-black tracking-[0.13em] text-muted-foreground uppercase">
                Phiên đang hoạt động
              </p>
              <p className="mt-1 text-2xl font-black">{sessions.length}</p>
            </div>
            <div className="rounded-xl border bg-muted/25 p-3 sm:col-span-2">
              <p className="flex items-center gap-2 text-xs font-bold">
                <Clock3Icon className="size-4 text-brand" />
                Lưu ý khi đăng xuất từ xa
              </p>
              <p className="mt-1 text-[0.68rem] leading-5 text-muted-foreground">
                Đăng xuất một phiên sẽ chặn phiên đó gia hạn đăng nhập. Thiết bị đó vẫn
                có thể dùng tiếp trong vài phút cho tới khi lượt đăng nhập hiện tại hết hạn.
              </p>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="grid min-h-32 place-items-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
              <div>
                <CheckCircle2Icon className="mx-auto size-6 text-emerald-500" />
                <p className="mt-2 text-xs font-black">
                  Không có phiên đăng nhập nào đang hoạt động
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {sessions.map((session) => (
                <article
                  key={session.sessionId}
                  className="rounded-xl border bg-background p-4 shadow-[0_1px_1px_rgb(15_23_42/0.03)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
                      <LaptopIcon className="size-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black">
                        <SessionDevice userAgent={session.userAgent} />
                      </p>
                      <p className="mt-1 truncate text-[0.65rem] text-muted-foreground">
                        {session.ipAddress || "IP không được ghi nhận"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving === `session:${session.sessionId}`}
                      onClick={() => void revokeSession(session.sessionId)}
                    >
                      {saving === `session:${session.sessionId}` ? (
                        <RefreshCwIcon className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="size-3.5" />
                      )}
                      Thu hồi
                    </Button>
                  </div>

                  <dl className="mt-3 grid gap-2 border-t pt-3 text-[0.68rem] sm:grid-cols-2">
                    <div>
                      <dt className="font-bold text-muted-foreground">Hết hạn</dt>
                      <dd className="mt-0.5 font-semibold">
                        {formatDateTime(session.expiresAt)}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-bold text-muted-foreground">Mã phiên</dt>
                      <dd className="mt-0.5 truncate font-mono" title={session.sessionId}>
                        {session.sessionId}
                      </dd>
                    </div>
                  </dl>

                  <p
                    className="mt-3 break-all rounded-lg bg-muted/35 p-2.5 text-[0.62rem] leading-4 text-muted-foreground"
                    title={session.userAgent ?? undefined}
                  >
                    {session.userAgent || "Không rõ thiết bị"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle
            icon={ShieldCheckIcon}
            eyebrow="Phân quyền"
            title="Vai trò & quyền hiện tại"
            description="Chỉ xem: vai trò và quyền của tài khoản đang đăng nhập."
          />
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div>
            <p className="text-[0.62rem] font-black tracking-[0.13em] text-muted-foreground uppercase">
              Vai trò
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile?.roles.length ? (
                profile.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border bg-muted/35 px-2.5 py-1 text-[0.68rem] font-black"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Chưa có vai trò.</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.62rem] font-black tracking-[0.13em] text-muted-foreground uppercase">
                Quyền
              </p>
              <span className="text-[0.65rem] font-bold text-muted-foreground">
                {sortedPermissions.length} quyền
              </span>
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border bg-muted/15 p-3">
              {sortedPermissions.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedPermissions.map((permission) => (
                    <span
                      key={permission}
                      className="truncate rounded-md border bg-background px-2 py-1.5 font-mono text-[0.62rem]"
                      title={permission}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tài khoản chưa có quyền.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
