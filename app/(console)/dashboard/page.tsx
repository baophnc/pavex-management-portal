import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tổng quan" };

export default function DashboardPage() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="bg-gradient-to-br from-brand/10 via-card to-card p-6 sm:p-8">
        <p className="text-xs font-black tracking-[0.18em] text-brand uppercase">
          Pavex Management Portal
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Bảng điều hành
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Các module chỉ xuất hiện khi backend tương ứng đã sẵn sàng và tài
          khoản có quyền truy cập.
        </p>
      </div>
    </section>
  );
}
