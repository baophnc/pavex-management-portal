"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { CurrentUser } from "@/lib/auth/contracts";

const navigation = [
  { href: "/dashboard", label: "Bảng điều hành", mark: "⌂" },
  {
    href: "/identity/users",
    label: "Người dùng",
    mark: "◎",
    permission: "identity.users.read",
  },
  {
    href: "/identity/roles",
    label: "Vai trò & quyền",
    mark: "◇",
    permission: "identity.roles.read",
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const expired = () => router.replace("/login");
    window.addEventListener("pavex-admin:session-expired", expired);
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          expired();
          return null;
        }
        return response.json() as Promise<{ user?: CurrentUser }>;
      })
      .then((payload) => setUser(payload?.user ?? null))
      .catch(() => undefined);

    return () => {
      controller.abort();
      window.removeEventListener("pavex-admin:session-expired", expired);
    };
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const visibleNavigation = navigation.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  );
  const sidebar = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="grid size-9 place-items-center rounded-lg bg-white font-black italic text-black">
          P
        </span>
        <div>
          <p className="text-sm font-black">PAVEX</p>
          <p className="text-[0.65rem] text-white/45">Management portal</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Điều hướng chính">
        <p className="px-3 py-2 text-[0.6rem] font-black tracking-[0.18em] text-white/35 uppercase">
          Không gian làm việc
        </p>
        {visibleNavigation.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${active ? "bg-white text-black" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
            >
              <span aria-hidden>{item.mark}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-bold">
          {user?.displayName ?? user?.email ?? "Đang tải..."}
        </p>
        <p className="mt-1 truncate text-xs text-white/45">
          {user?.roles[0] ?? "PAVEX"}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-left text-xs font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          Thoát phiên
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0a0a0a] text-white lg:flex">
        {sidebar}
      </aside>
      {mobileOpen ? (
        <button
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-black/55 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0a0a0a] text-white transition-transform lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar}
      </aside>
      <div className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Mở menu"
            onClick={() => setMobileOpen(true)}
            className="mr-3 grid size-10 place-items-center rounded-lg border lg:hidden"
          >
            ☰
          </button>
          <div>
            <p className="text-[0.6rem] font-black tracking-[0.16em] text-brand uppercase">
              Pavex operations
            </p>
            <p className="text-sm font-black">Management Portal</p>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
