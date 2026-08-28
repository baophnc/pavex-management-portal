import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

function safeReturnTo(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const query = await searchParams;

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#080808] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
        <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle_at_20%_10%,white_0,transparent_30%),radial-gradient(circle_at_85%_80%,#d81324_0,transparent_30%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-white text-xl font-black italic text-black">
            P
          </span>
          <div>
            <p className="text-lg font-black">PAVEX Operations</p>
            <p className="text-xs text-white/60">Control center</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="text-sm font-bold tracking-[0.2em] text-brand uppercase">
            Một nguồn dữ liệu vận hành
          </p>
          <h1 className="mt-5 text-5xl leading-[1.08] font-black">
            Quản trị từ mạng lưới đến chặng giao cuối.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/70">
            Theo dõi Identity, Partners, Network, Operations và Shipments trên
            một không gian làm việc.
          </p>
        </div>
        <p className="relative text-xs text-white/45">© 2026 Pavex Express</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-lg bg-primary font-black italic text-white">
              P
            </span>
            <p className="font-black">PAVEX Operations</p>
          </div>
          <p className="text-sm font-black text-brand">
            Dành cho đội ngũ Pavex
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Đăng nhập quản trị
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Dùng tài khoản được cấp quyền quản trị hoặc vận hành.
          </p>
          <LoginForm returnTo={safeReturnTo(query.returnTo)} />
        </div>
      </section>
    </main>
  );
}
