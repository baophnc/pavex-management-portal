"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PasswordRecoveryForm({ mode, token = "" }: { mode: "forgot-password" | "reset-password"; token?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reset = mode === "reset-password";
  const missingToken = reset && !token;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || missingToken) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    if (reset && newPassword !== String(form.get("confirmation") ?? "")) {
      setError("Hai mật khẩu chưa trùng nhau.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(reset ? { token, newPassword } : { email: form.get("email") }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Không thể hoàn tất yêu cầu.");
      setMessage(payload.message ?? "Yêu cầu đã được xử lý.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {message ? <p role="status" className="rounded-lg border p-4 text-sm">{message}</p> : (
        <form onSubmit={submit} className="space-y-5">
          {missingToken ? <p role="alert">Liên kết thiếu mã xác thực. Hãy yêu cầu một liên kết mới.</p> : reset ? (
            <>
              <label className="grid gap-2 text-sm font-semibold">Mật khẩu mới
                <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">Nhập lại mật khẩu mới
                <Input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required disabled={pending} />
              </label>
              <p className="text-sm text-muted-foreground">Dùng 8–128 ký tự. Không chia sẻ mật khẩu hoặc liên kết này.</p>
            </>
          ) : (
            <label className="grid gap-2 text-sm font-semibold">Email được quản trị viên cấp
              <Input name="email" type="email" autoComplete="email" maxLength={255} required disabled={pending} placeholder="ban@congty.vn" />
            </label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {!missingToken && <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang xử lý…" : reset ? "Lưu mật khẩu mới" : "Gửi liên kết đặt mật khẩu"}
          </Button>}
        </form>
      )}
      {reset && !message && <Link href="/forgot-password" className="block text-sm text-brand underline">Yêu cầu liên kết mới</Link>}
      <Link href="/login" className="block text-sm font-semibold underline">Quay lại đăng nhập</Link>
    </div>
  );
}
