"use client";

import { BellIcon, CheckCheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  announceNotificationsChanged,
  notificationsApi,
  timeAgo,
  type UserNotification,
} from "@/features/notifications/api";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

export const severityDot: Record<UserNotification["severity"], string> = {
  Info: "bg-sky-500",
  Success: "bg-emerald-500",
  Warning: "bg-amber-500",
  Critical: "bg-red-600",
};

/** The bell in the top bar: unread count, the latest notices, and a way to the inbox. */
export function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<UserNotification[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    notificationsApi.unreadCount().then((value) => setCount(value.count)).catch(() => undefined);
  }, []);

  useEffect(() => {
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener("pavex-management:notifications", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("pavex-management:notifications", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    notificationsApi.list("all").then((page) => { setItems(page.items.slice(0, 8)); setCount(page.unreadCount); }).catch(() => setItems([]));
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openItem(item: UserNotification) {
    setOpen(false);
    if (!item.isRead) {
      await notificationsApi.setRead(item.id, true).catch(() => undefined);
      announceNotificationsChanged();
    }
    router.push(item.actionUrl && item.actionUrl !== "/notifications" ? item.actionUrl : "/notifications");
  }

  async function readAll() {
    await notificationsApi.readAll().catch(() => undefined);
    setItems((current) => current?.map((item) => ({ ...item, isRead: true })) ?? null);
    setCount(0);
    announceNotificationsChanged();
  }

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={count ? `Thông báo, ${count} chưa đọc` : "Thông báo"}
        aria-expanded={open}
        className="relative grid size-8 place-items-center rounded-md transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
      >
        <BellIcon className="size-4" />
        {count ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] font-black text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-50 w-[22rem] max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-black">Thông báo</p>
            {count ? (
              <button type="button" onClick={() => void readAll()} className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                <CheckCheckIcon className="size-3.5" /> Đánh dấu đã đọc hết
              </button>
            ) : null}
          </div>
          <div className="max-h-96 divide-y overflow-y-auto">
            {items === null ? (
              <p className="p-4 text-xs text-muted-foreground">Đang tải…</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Chưa có thông báo nào.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openItem(item)}
                  className={cn("flex w-full gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted/50", !item.isRead && "bg-brand/[0.04]")}
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.isRead ? "bg-transparent" : severityDot[item.severity])} />
                  <span className="min-w-0">
                    <span className={cn("block text-xs", item.isRead ? "font-semibold" : "font-black")}>{item.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-[0.7rem] text-muted-foreground">{item.body}</span>
                    <span className="mt-0.5 block text-[0.62rem] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t px-3 py-2 text-center text-xs font-black text-brand hover:bg-muted/40">
            Xem tất cả và gửi thông báo
          </Link>
        </div>
      ) : null}
    </div>
  );
}
