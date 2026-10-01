"use client";

import {
  CalendarClockIcon,
  ClipboardListIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { useAccess } from "@/features/auth/access-context";
import { permissionLabel } from "@/features/identity/presentation";

const capabilities = [
  {
    permissionsAny: ["operations.workforce.manage", "operations.hub.manage"],
    title: "Nhân sự vận hành",
    description: "Quản lý nhân sự, bưu cục trực thuộc, trạng thái và số việc tối đa.",
    icon: UsersRoundIcon,
    href: "/operations/workforce",
  },
  {
    permissionsAny: ["operations.workforce.manage", "operations.hub.manage"],
    title: "Ca làm việc",
    description: "Lập ca, quản lý danh sách trực và chấm công theo bưu cục bạn phụ trách.",
    icon: CalendarClockIcon,
    href: "/operations/shifts",
  },
  {
    permissionsAny: ["operations.assignments.manage", "operations.hub.manage"],
    title: "Điều phối phân công",
    description: "Theo dõi hàng đợi, phân công, sự kiện điều phối và công cụ xử lý lỗi.",
    icon: ClipboardListIcon,
    href: "/operations/assignments",
  },
  {
    permissionsAny: ["operations.assignments.manage", "operations.hub.manage"],
    title: "Hàng đợi sự kiện",
    description: "Theo dõi dòng sự kiện; quản lý toàn quốc có thêm số liệu hàng đợi và công cụ xử lý sự kiện gửi lỗi.",
    icon: ShieldAlertIcon,
    href: "/operations/dispatch",
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
                Không gian vận hành
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                Điều phối vận hành
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Nhân sự, ca làm và phân công dùng dữ liệu thật. Phạm vi toàn mạng lưới hay theo bưu cục
                luôn do máy chủ xác định, trang quản trị không tự suy ra quyền từ vai trò.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <p className="mt-3 text-[0.62rem] text-muted-foreground">
                  Cần một trong các quyền: {item.permissionsAny.map(permissionLabel).join(" · ")}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[0.68rem] font-black text-brand">
                    {allowedItem ? "Tài khoản hiện tại có quyền" : "Tài khoản chưa được cấp quyền"}
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
          <p className="text-sm font-black">Phạm vi vận hành hiện tại</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {allowed.length
              ? `Tài khoản này dùng được ${allowed.length}/${capabilities.length} khu vực vận hành.`
              : "Tài khoản hiện tại chưa có quyền vận hành."}
            {" "}Nhân sự, ca làm, phân công và hàng đợi sự kiện đều hiển thị theo đúng phạm vi bạn được cấp.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
