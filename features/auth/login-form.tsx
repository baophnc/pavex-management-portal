"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ returnTo }: { returnTo: string }) {
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
      const payload = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(payload.message ?? "Đăng nhập thất bại.");

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
      <label className="grid gap-2 text-sm font-bold" htmlFor="email">
        Email
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder=""
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
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"></p>
    </form>
  );
}
