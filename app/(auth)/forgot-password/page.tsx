import type { Metadata } from "next";
import { PasswordRecoveryForm } from "@/features/auth/password-recovery-form";

export const metadata: Metadata = { title: "Quên mật khẩu", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md">
      <p className="font-bold text-brand">PAVEX Management</p>
      <h1 className="mt-4 text-3xl font-bold">Thiết lập mật khẩu</h1>
      <p className="mt-3 text-sm text-muted-foreground">Dành cho tài khoản mới do quản trị viên tạo hoặc khi bạn quên mật khẩu. Bạn cần truy cập được hộp thư đã đăng ký.</p>
      <PasswordRecoveryForm mode="forgot-password" />
    </section>
  </main>;
}
