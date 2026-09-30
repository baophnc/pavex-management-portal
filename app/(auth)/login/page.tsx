import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Đăng nhập" };

function safeReturnTo(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/dashboard";
}

function loginNotice(reason: string | string[] | undefined) {
  const value = Array.isArray(reason) ? reason[0] : reason;
  if (value === "password-changed") {
    return "Đã lưu mật khẩu mới. Hãy đăng nhập lại bằng mật khẩu vừa đặt.";
  }
  if (value === "management-access") {
    return "Phiên trước không còn quyền truy cập Management Portal. Hãy đăng nhập bằng tài khoản quản trị phù hợp.";
  }
  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[];
    reason?: string | string[];
  }>;
}) {
  const query = await searchParams;

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#080808] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
        <div className="absolute inset-0 opacity-15 " />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-white text-xl font-black italic text-black">
            P
          </span>
          <div>
            <p className="text-lg font-black">PAVEX Management</p>
            <p className="text-xs text-white/60">Control center</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <h1 className="mt-5 text-5xl leading-[1.08] font-black">
            Quản trị hệ thống Pavex Express
          </h1>
        </div>
        <p className="relative text-xs text-white/45">© 2026 Pavex Express</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-lg bg-primary font-black italic text-white">
              P
            </span>
            <p className="font-black">PAVEX Management</p>
          </div>

          <h1 className="mt-2 text-4xl font-black tracking-tight">Đăng nhập</h1>

          <LoginForm
            returnTo={safeReturnTo(query.returnTo)}
            notice={loginNotice(query.reason)}
          />
        </div>
      </section>
    </main>
  );
}
