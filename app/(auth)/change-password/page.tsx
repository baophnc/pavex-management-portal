import type { Metadata } from "next";

import { FirstPasswordForm } from "@/features/auth/first-password-form";

export const metadata: Metadata = { title: "Đặt mật khẩu mới", robots: { index: false, follow: false } };

export default function ChangePasswordPage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6">
    <section className="w-full max-w-md">
      <p className="font-bold text-brand">PAVEX Management</p>
      <h1 className="mt-4 text-3xl font-bold">Đặt mật khẩu của bạn</h1>
      <p className="mt-3 text-sm text-muted-foreground">Tài khoản của bạn đang dùng mật khẩu tạm do quản trị viên cấp. Hãy đặt mật khẩu riêng trước khi bắt đầu làm việc.</p>
      <FirstPasswordForm />
    </section>
  </main>;
}
