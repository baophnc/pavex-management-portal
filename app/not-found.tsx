import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-black tracking-[0.18em] text-brand uppercase">
          404 · Pavex Management Portal
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          Không tìm thấy trang
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Đường dẫn này không thuộc các phân hệ của trang quản trị.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
        >
          Về bảng điều hành
        </Link>
      </div>
    </main>
  );
}
