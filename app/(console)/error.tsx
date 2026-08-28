"use client";

import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export default function ConsoleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="grid min-h-[65vh] place-items-center rounded-2xl border border-dashed bg-card p-6 text-center">
      <div className="max-w-lg">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlertIcon className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-black">Không thể hiển thị workspace</h1>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Đã có lỗi ngoài dự kiến khi dựng màn hình. Bạn có thể thử lại mà không
          cần đăng xuất.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">
            Mã lỗi: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RefreshCwIcon className="size-4" />
            Thử lại
          </Button>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Về bảng điều hành
          </Button>
        </div>
      </div>
    </div>
  );
}
