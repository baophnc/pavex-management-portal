import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export const metadata: Metadata = { title: "Đặt mật khẩu mới", referrer: "no-referrer", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" && query.token.length <= 512 ? query.token : "";
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md">
      <p className="font-bold text-brand">PAVEX Management</p>
      <h1 className="mt-4 text-3xl font-bold">Đặt mật khẩu mới</h1>
      <p className="mt-3 text-sm text-muted-foreground">Sau khi lưu, email được xác minh và các phiên đăng nhập cũ sẽ bị thu hồi. Vai trò của bạn không thay đổi.</p>
      <PasswordRecoveryForm mode="reset-password" token={token} />
    </section>
  </main>;
}
