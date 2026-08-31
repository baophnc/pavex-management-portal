"use client";

import {
  CalendarClockIcon,
  ClipboardListIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";

const capabilities = [
  {
    permission: "operations.workforce.manage",
    title: "Nhân sự vận hành",
    description: "Quản lý workforce, hub membership, trạng thái và sức chứa công việc.",
    icon: UsersRoundIcon,
    href: "/operations/workforce",
  },
  {
    permission: "operations.hub.manage",
    title: "Vận hành theo bưu cục",
    description: "Giới hạn phạm vi quản trị theo các hub được backend xác thực.",
    icon: CalendarClockIcon,
    href: null,
  },
  {
    permission: "operations.assignments.manage",
    title: "Điều phối assignment",
    description: "Theo dõi hàng đợi, phân công, sự kiện dispatch và reliability tooling.",
    icon: ClipboardListIcon,
    href: null,
  },
] as const;

export function OperationsOverview() {
  const { hasPermission } = useAccess();
  const allowed = capabilities.filter((item) => hasPermission(item.permission));

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b bg-gradient-to-br from-brand/[0.08] via-card to-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/15 bg-brand/10 text-brand">
              <ShieldCheckIcon className="size-5" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black tracking-[0.16em] text-brand uppercase">
                Operations workspace
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                Điều phối vận hành
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Management đã nhận diện quyền Operations từ backend. Các màn hình
                workforce, shifts và assignments sẽ dùng chính phạm vi quyền này,
                không suy diễn quyền từ role ở frontend.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {capabilities.map((item) => {
          const Icon = item.icon;
          const enabled = hasPermission(item.permission);
          return (
            <Card key={item.permission} className={!enabled ? "opacity-60" : undefined}>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-md bg-brand/10 text-brand">
                    <Icon className="size-4" />
                  </span>
                  <p className="text-sm font-black">{item.title}</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-3 font-mono text-[0.62rem] text-muted-foreground">
                  {item.permission}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[0.68rem] font-black text-brand">
                    {enabled ? "Tài khoản hiện tại có quyền" : "Không có quyền trong JWT hiện tại"}
                  </p>
                  {enabled && item.href ? (
                    <Link href={item.href} className="text-[0.68rem] font-black text-brand hover:underline">
                      Mở workspace →
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <p className="text-sm font-black">Phạm vi Management hiện tại</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {allowed.length
              ? `Backend đang cấp ${allowed.length}/${capabilities.length} nhóm quyền Operations cho tài khoản này.`
              : "Tài khoản hiện tại chưa có capability Operations."}
            {" "}Trang này chỉ là điểm vào và kiểm tra access; các thao tác nghiệp vụ
            được bổ sung theo từng workspace để giữ UI và permission boundary rõ ràng.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
