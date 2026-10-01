"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/contracts";

export function SessionCard() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(async (response) => {
        const payload = (await response.json()) as {
          user?: CurrentUser;
          message?: string;
        };
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok || !payload.user)
          throw new Error(payload.message ?? "Không thể tải phiên đăng nhập.");
        if (active) setUser(payload.user);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải phiên đăng nhập.",
          );
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <section className="w-full max-w-2xl rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-black tracking-[0.18em] text-brand uppercase">
        Pavex Quản trị
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-tight">
        Kết nối máy chủ thành công
      </h1>
      {error ? (
        <p className="mt-6 rounded-lg border border-brand/25 bg-brand/5 p-4 text-sm text-brand">
          {error}
        </p>
      ) : null}
      {!user && !error ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Đang tải thông tin phiên...
        </p>
      ) : null}
      {user ? (
        <div className="mt-6 rounded-xl bg-muted p-5">
          <p className="font-bold">{user.displayName ?? user.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <p className="mt-3 text-xs font-semibold text-muted-foreground">
            Vai trò: {user.roles.join(", ") || "Chưa gán"}
          </p>
        </div>
      ) : null}
      <Button className="mt-6" onClick={logout}>
        Thoát phiên
      </Button>
    </section>
  );
}
