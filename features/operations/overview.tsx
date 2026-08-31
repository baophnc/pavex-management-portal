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
    permissionsAny: ["operations.workforce.manage", "operations.hub.manage"],
    title: "Nhân sự vận hành",
    description: "Quản lý workforce, hub membership, trạng thái và sức chứa công việc.",
    icon: UsersRoundIcon,
    href: "/operations/workforce",
  },
  {
    permissionsAny: ["operations.workforce.manage", "operations.hub.manage"],
    title: "Ca làm việc",
    description: "Lập ca, quản roster và theo dõi attendance theo phạm vi hub được backend xác thực.",
    icon: CalendarClockIcon,
    href: "/operations/shifts",
  },
  {
    permissionsAny: ["operations.assignments.manage", "operations.hub.manage"],
    title: "Điều phối assignment",
    description: "Theo dõi hàng đợi, phân công, sự kiện dispatch và reliability tooling.",
    icon: ClipboardListIcon,
    href: null,
  },
] as const;

export function OperationsOverview() {
  const { hasPermission } = useAccess();
  const enabled = (item: (typeof capabilities)[number]) =>
    item.permissionsAny.some((permission) => hasPermission(permission));
  const allowed = capabilities.filter(enabled);

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
                Workforce và Shifts đã nối API thật. Phạm vi global hoặc theo hub
                luôn do backend xác thực, Management không suy diễn quyền từ role.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        {capabilities.map((item) => {
          const Icon = item.icon;
          const allowedItem = enabled(item);
          return (
            <Card key={item.title} className={!allowedItem ? "opacity-60" : undefined}>
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
                  {item.permissionsAny.join(" | ")}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[0.68rem] font-black text-brand">
                    {allowedItem ? "Tài khoản hiện tại có quyền" : "Không có quyền trong JWT hiện tại"}
                  </p>
                  {allowedItem && item.href ? (
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
          <p className="text-sm font-black">Phạm vi Operations hiện tại</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {allowed.length
              ? `Backend đang cấp quyền truy cập ${allowed.length}/${capabilities.length} workspace Operations cho tài khoản này.`
              : "Tài khoản hiện tại chưa có capability Operations."}
            {" "}Workforce và Shifts đã hoạt động; Assignments/Dispatch sẽ được nối ở patch kế tiếp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
