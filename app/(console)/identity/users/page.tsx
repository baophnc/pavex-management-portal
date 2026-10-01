import type { Metadata } from "next";
import { Suspense } from "react";

import { IdentityUsers } from "@/features/identity/users";

export const metadata: Metadata = { title: "Người dùng" };

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
          Đang mở danh sách tài khoản...
        </div>
      }
    >
      <IdentityUsers />
    </Suspense>
  );
}
