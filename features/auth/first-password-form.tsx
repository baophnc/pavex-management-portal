"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiRequest } from "@/lib/api/client";

function message(reason: unknown) {
  if (reason instanceof ApiError) {
    if (reason.code === "invalid_current_password") return "Mật khẩu tạm không đúng.";
    if (reason.code === "password_unchanged") return "Mật khẩu mới phải khác mật khẩu tạm.";
    if (reason.status === 0) return "Không thể kết nối máy chủ Pavex.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại bằng mật khẩu tạm.";
  }
  return "Không thể lưu mật khẩu mới. Vui lòng thử lại.";
}

/**
 * First sign-in of an account an administrator created: the temporary password must be replaced
 * before anything else. Changing it ends every session, so the user signs in again afterwards.
 */
export function FirstPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword.length < 8 || newPassword.length > 128) return setError("Mật khẩu mới phải từ 8 đến 128 ký tự.");
    if (newPassword !== String(form.get("confirmation") ?? "")) return setError("Hai mật khẩu mới chưa trùng nhau.");
    if (newPassword === currentPassword) return setError("Mật khẩu mới phải khác mật khẩu tạm.");

    setPending(true);
    setError(null);
    try {
      await apiRequest("auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login?reason=password-changed");
      router.refresh();
    } catch (reason) {
      setError(message(reason));
      setPending(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      <label className="grid gap-2 text-sm font-semibold">Mật khẩu tạm được cấp
        <Input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required disabled={pending} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Mật khẩu mới
        <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
      </label>
      <label className="grid gap-2 text-sm font-semibold">Nhập lại mật khẩu mới
        <Input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
      </label>
      <p className="text-sm text-muted-foreground">Dùng 8–128 ký tự và không dùng lại mật khẩu tạm. Sau khi lưu, bạn đăng nhập lại bằng mật khẩu mới.</p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Đang lưu…" : "Lưu mật khẩu mới"}</Button>
      <button type="button" onClick={() => void signOut()} className="block text-sm font-semibold underline">Đăng xuất</button>
    </form>
  );
}
