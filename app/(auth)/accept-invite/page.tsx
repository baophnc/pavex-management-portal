import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export const metadata: Metadata = { title: "Kích hoạt tài khoản", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && query.token.length <= 512 ? query.token : "";
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md">
      <p className="font-bold text-brand">PAVEX Quản trị</p>
      <h1 className="mt-4 text-3xl font-bold">Kích hoạt tài khoản</h1>
      <p className="mt-3 text-sm text-muted-foreground">Bạn được mời dùng trang quản trị PAVEX. Đặt mật khẩu để kích hoạt tài khoản; vai trò do quản trị viên cấp sẵn.</p>
      <PasswordRecoveryForm mode="accept-invite" token={token} />
    </section>
  </main>;
}
