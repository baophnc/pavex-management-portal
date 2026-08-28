"use client";

import {
  Building2Icon,
  CircleGaugeIcon,
  ShieldCheckIcon,
  UserRoundCogIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type WorkspaceTab = {
  path: string;
  href: string;
  title: string;
  pinned?: boolean;
};

const STORAGE_KEY = "pavex-management:workspace-tabs:v1";
const DASHBOARD_TAB: WorkspaceTab = {
  path: "/dashboard",
  href: "/dashboard",
  title: "Bảng điều hành",
  pinned: true,
};
const MAX_TABS = 10;

function tabTitle(pathname: string) {
  if (pathname === "/dashboard") return "Bảng điều hành";
  if (pathname === "/identity/users") return "Người dùng";
  if (pathname === "/identity/users/new") return "Tạo người dùng";
  if (/^\/identity\/users\/[^/]+$/.test(pathname)) return "Chi tiết người dùng";
  if (pathname === "/identity/roles") return "Vai trò & quyền";
  if (pathname === "/account") return "Tài khoản của tôi";
  if (pathname === "/partners/merchants") return "Merchant";
  if (/^\/partners\/merchants\/[^/]+$/.test(pathname)) return "Hồ sơ Merchant";

  const segment = pathname.split("/").filter(Boolean).at(-1);
  return segment
    ? decodeURIComponent(segment).replaceAll("-", " ")
    : "PAVEX";
}

function tabIcon(path: string) {
  if (path === "/dashboard") return CircleGaugeIcon;
  if (path.startsWith("/identity/roles")) return ShieldCheckIcon;
  if (path.startsWith("/identity")) return UserRoundCogIcon;
  if (path.startsWith("/partners/merchants")) return Building2Icon;
  return CircleGaugeIcon;
}

function pathFromHref(href: string) {
  return href.split("?", 1)[0] || "/dashboard";
}

function parseStoredTabs(raw: string | null): WorkspaceTab[] {
  if (!raw) return [DASHBOARD_TAB];

  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [DASHBOARD_TAB];

    const restored = value
      .filter((item): item is { href: string; title: string; path?: string } => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.href === "string" &&
          candidate.href.startsWith("/") &&
          typeof candidate.title === "string" &&
          candidate.title.trim().length > 0
        );
      })
      .map((item) => {
        const path =
          typeof item.path === "string" && item.path.startsWith("/")
            ? item.path
            : pathFromHref(item.href);

        return {
          path,
          href: item.href,
          title: item.title,
          pinned: path === "/dashboard",
        } satisfies WorkspaceTab;
      });

    const withoutDashboard = restored.filter(
      (tab) => tab.path !== "/dashboard",
    );
    return [DASHBOARD_TAB, ...withoutDashboard].slice(0, MAX_TABS);
  } catch {
    return [DASHBOARD_TAB];
  }
}

function upsertTab(tabs: WorkspaceTab[], pathname: string, href: string) {
  const current: WorkspaceTab = {
    path: pathname,
    href,
    title: tabTitle(pathname),
    pinned: pathname === "/dashboard",
  };

  const existing = tabs.findIndex((tab) => tab.path === pathname);
  if (existing >= 0) {
    return tabs.map((tab, index) =>
      index === existing ? { ...tab, ...current } : tab,
    );
  }

  const next = [...tabs, current];
  if (next.length <= MAX_TABS) return next;

  const removableIndex = next.findIndex(
    (tab) => !tab.pinned && tab.path !== pathname,
  );
  if (removableIndex >= 0) next.splice(removableIndex, 1);
  return next.slice(-MAX_TABS);
}

export function WorkspaceTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.toString();
  const currentHref = query ? `${pathname}?${query}` : pathname;
  const [tabs, setTabs] = useState<WorkspaceTab[]>([DASHBOARD_TAB]);
  const restoredRef = useRef(false);
  const initialPathnameRef = useRef(pathname);
  const initialHrefRef = useRef(currentHref);

  useEffect(() => {
    const task = window.setTimeout(() => {
      const restored = parseStoredTabs(window.sessionStorage.getItem(STORAGE_KEY));
      restoredRef.current = true;
      setTabs(
        upsertTab(
          restored,
          initialPathnameRef.current,
          initialHrefRef.current,
        ),
      );
    }, 0);

    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;

    const task = window.setTimeout(() => {
      setTabs((current) => upsertTab(current, pathname, currentHref));
    }, 0);

    return () => window.clearTimeout(task);
  }, [currentHref, pathname]);

  useEffect(() => {
    if (!restoredRef.current) return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  }, [tabs]);

  const activeIndex = useMemo(
    () => tabs.findIndex((tab) => tab.path === pathname),
    [pathname, tabs],
  );

  function closeTab(path: string) {
    const index = tabs.findIndex((tab) => tab.path === path);
    if (index < 0 || tabs[index]?.pinned) return;

    const nextTabs = tabs.filter((tab) => tab.path !== path);
    setTabs(nextTabs);

    if (path !== pathname) return;

    const fallback =
      nextTabs[Math.min(index - 1, nextTabs.length - 1)] ?? DASHBOARD_TAB;
    router.push(fallback.href);
  }

  function switchWorkspace(path: string) {
    const target = tabs.find((tab) => tab.path === path);
    if (target) router.push(target.href);
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) {
    let targetIndex: number | null = null;

    if (event.key === "ArrowRight") targetIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") targetIndex = 0;
    else if (event.key === "End") targetIndex = tabs.length - 1;

    if (targetIndex === null) return;

    event.preventDefault();
    const target = tabs[targetIndex];
    if (target) router.push(target.href);
  }

  return (
    <div className="border-t bg-muted/25">
      <div
        className="scrollbar-none hidden min-h-11 items-end gap-1 overflow-x-auto px-2 pt-1.5 sm:flex lg:px-4"
        role="tablist"
        aria-label="Workspace đang mở"
      >
        {tabs.map((tab, index) => {
          const active = tab.path === pathname;
          const Icon = tabIcon(tab.path);

          return (
            <div
              key={tab.path}
              className={cn(
                "group relative flex h-9 shrink-0 items-center rounded-t-lg border border-b-0 transition-colors",
                active
                  ? "border-border bg-background text-foreground shadow-[0_-1px_0_rgba(0,0,0,0.025)]"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/70 hover:text-foreground",
              )}
              role="presentation"
            >
              {active ? (
                <span
                  className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-brand"
                  aria-hidden="true"
                />
              ) : null}
              <Link
                href={tab.href}
                className="flex h-full max-w-56 items-center gap-2 px-3 text-[0.7rem] font-bold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35"
                aria-current={active ? "page" : undefined}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{tab.title}</span>
              </Link>
              {!tab.pinned ? (
                <button
                  type="button"
                  aria-label={`Đóng ${tab.title}`}
                  className="mr-1 grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground/70 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                  onClick={() => closeTab(tab.path)}
                >
                  <XIcon className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex h-12 items-center gap-2 border-t border-border/60 px-3 sm:hidden">
        <span className="shrink-0 text-[0.62rem] font-black tracking-[0.12em] text-muted-foreground uppercase">
          Workspace
        </span>
        <select
          aria-label="Chuyển workspace"
          value={activeIndex >= 0 ? tabs[activeIndex]?.path : pathname}
          onChange={(event) => switchWorkspace(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2.5 text-xs font-bold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
        >
          {tabs.map((tab) => (
            <option key={tab.path} value={tab.path}>
              {tab.title}
            </option>
          ))}
        </select>
        {activeIndex >= 0 && !tabs[activeIndex]?.pinned ? (
          <button
            type="button"
            className="grid size-9 place-items-center rounded-lg border bg-background text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
            onClick={() => closeTab(pathname)}
            aria-label="Đóng workspace hiện tại"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
