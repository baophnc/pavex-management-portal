"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRetryAfterSeconds } from "@/lib/api/problem";

export function LoginForm({
  returnTo,
  notice = null,
}: {
  returnTo: string;
  notice?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null;
      if (!response.ok) {
        const retryAfter = parseRetryAfterSeconds(
          response.headers.get("retry-after"),
        );
        const suffix =
          response.status === 429 && retryAfter !== null
            ? ` Thử lại sau khoảng ${retryAfter} giây.`
            : "";
        throw new Error(
          `${payload?.message ?? "Đăng nhập thất bại."}${suffix}`,
        );
      }

      router.replace(returnTo);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Đăng nhập thất bại.",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {notice ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {notice}
        </p>
      ) : null}
      <label className="grid gap-2 text-sm font-bold" htmlFor="email">
        Email
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-bold" htmlFor="password">
        Mật khẩu
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-brand/25 bg-brand/5 p-3 text-sm font-semibold text-brand"
        >
          {error}
        </p>
      ) : null}
      <div className="text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand underline underline-offset-4">
          Quên mật khẩu / đặt mật khẩu lần đầu
        </Link>
        <p className="mt-2 text-muted-foreground">
          Tài khoản do quản trị viên tạo? Dùng email đã được cấp để tự đặt mật khẩu.
        </p>
      </div>
      <Button className="w-full" disabled={pending}>
        {pending ? (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
        ) : (
          <span aria-hidden>→</span>
        )}
        {pending ? "Đang xác thực..." : "Đăng nhập"}
      </Button>
    </form>
  );
}
