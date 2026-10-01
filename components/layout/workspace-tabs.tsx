"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAccess } from "@/features/auth/access-context";
import { canAccessManagementPath } from "@/lib/auth/access";
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
  if (pathname === "/identity/roles") return "Vai trò & quyền hạn";
  if (pathname === "/account") return "Tài khoản của tôi";
  if (pathname === "/partners/merchants") return "Cửa hàng";
  if (/^\/partners\/merchants\/[^/]+$/.test(pathname)) return "Hồ sơ cửa hàng";
  if (pathname === "/network") return "Mạng lưới";
  if (pathname === "/network/regions") return "Vùng mạng lưới";
  if (pathname === "/network/hubs") return "Điểm trung chuyển";
  if (pathname === "/network/service-areas") return "Vùng phục vụ";
  if (pathname === "/network/coverage") return "Vùng phục vụ";
  if (pathname === "/network/routes") return "Tuyến vận chuyển";
  if (pathname === "/network/lanes") return "Tuyến vận chuyển";
  if (pathname === "/network/route-templates") return "Tuyến vận chuyển";
  if (pathname === "/network/route-planner") return "Tìm tuyến";
  if (pathname === "/network/capacity") return "Sức chứa";
  if (pathname === "/network/audit") return "Nhật ký mạng lưới";
  if (pathname === "/pricing") return "Bảng giá & cước";
  if (pathname === "/pricing/rate-plans") return "Bảng giá";
  if (pathname === "/pricing/simulator") return "Tính thử cước";
  if (pathname === "/pricing/quotes") return "Chi tiết cách tính cước";
  if (pathname === "/pricing/audit") return "Nhật ký giá cước";
  if (pathname === "/finance/cash") return "Duyệt tiền nộp";
  if (pathname === "/finance/settlements") return "Đối soát cửa hàng";
  if (pathname === "/finance/invoices") return "Hóa đơn cửa hàng";
  if (pathname === "/operations") return "Điều phối vận hành";
  if (pathname.startsWith("/operations/workforce")) return "Nhân sự vận hành";
  if (pathname.startsWith("/operations/shifts")) return "Ca làm việc";
  if (pathname.startsWith("/operations/assignments")) return "Phân công vận hành";
  if (pathname.startsWith("/operations/dispatch")) return "Hàng đợi sự kiện";
  if (pathname === "/shipments") return "Vận đơn";
  if (pathname.startsWith("/shipments/exceptions")) return "Duyệt ngoại lệ";
  if (pathname.startsWith("/shipments/cases")) return "Hồ sơ sự cố";
  if (pathname.startsWith("/control-tower")) return "Giám sát vận đơn";
  if (pathname === "/fleet") return "Xe trung chuyển";
  if (pathname === "/deliveries") return "Giao hàng";
  if (pathname === "/support") return "Yêu cầu hỗ trợ";
  if (pathname === "/shipments/tracking") return "Tra hành trình";
  if (pathname === "/shipments/cancelled") return "Vận đơn đã huỷ";
  if (pathname === "/counter/new") return "Gửi hàng tại quầy";
  if (pathname === "/counter/settlements") return "Trả thu hộ tại quầy";
  if (/^\/counter\/[^/]+\/print$/.test(pathname)) return "In nhãn tại quầy";
  if (/^\/shipments\/[^/]+$/.test(pathname)) return "Chi tiết vận đơn";

  const segment = pathname.split("/").filter(Boolean).at(-1);
  return segment
    ? decodeURIComponent(segment).replaceAll("-", " ")
    : "PAVEX";
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
  const { user } = useAccess();
  const query = searchParams.toString();
  const currentHref = query ? `${pathname}?${query}` : pathname;
  const [tabs, setTabs] = useState<WorkspaceTab[]>([DASHBOARD_TAB]);
  const restoredRef = useRef(false);
  const initialPathnameRef = useRef(pathname);
  const initialHrefRef = useRef(currentHref);
  const initialUserRef = useRef(user);

  useEffect(() => {
    const task = window.setTimeout(() => {
      const restored = parseStoredTabs(
        window.sessionStorage.getItem(STORAGE_KEY),
      ).filter(
        (tab) =>
          tab.pinned ||
          canAccessManagementPath(initialUserRef.current, tab.path),
      );
      restoredRef.current = true;
      const initialPath = initialPathnameRef.current;
      setTabs(
        canAccessManagementPath(initialUserRef.current, initialPath)
          ? upsertTab(restored, initialPath, initialHrefRef.current)
          : restored,
      );
    }, 0);

    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    if (!restoredRef.current || !canAccessManagementPath(user, pathname)) return;

    const task = window.setTimeout(() => {
      setTabs((current) => upsertTab(current, pathname, currentHref));
    }, 0);

    return () => window.clearTimeout(task);
  }, [currentHref, pathname, user]);

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
    <div className="border-b bg-card">
      <div
        className="scrollbar-none hidden h-9 items-stretch overflow-x-auto sm:flex"
        role="tablist"
        aria-label="Trang đang mở"
      >
        {tabs.map((tab, index) => {
          const active = tab.path === pathname;

          return (
            <div
              key={tab.path}
              className={cn(
                "group relative flex shrink-0 items-center border-r transition-colors",
                active ? "bg-background text-brand" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              role="presentation"
            >
              {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" aria-hidden="true" /> : null}
              <Link
                href={tab.href}
                className={cn(
                  "flex h-full max-w-56 items-center px-3.5 text-[0.72rem] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35",
                  active ? "font-semibold" : "",
                  !tab.pinned && "pr-1.5",
                )}
                aria-current={active ? "page" : undefined}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <span className="truncate">{tab.title}</span>
              </Link>
              {!tab.pinned ? (
                <button
                  type="button"
                  aria-label={`Đóng ${tab.title}`}
                  className={cn(
                    "mr-1.5 grid size-5 shrink-0 place-items-center rounded-sm transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={() => closeTab(tab.path)}
                >
                  <XIcon className="size-3" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex h-11 items-center gap-2 px-2.5 sm:hidden">
        <span className="shrink-0 text-[0.68rem] font-semibold text-muted-foreground">
          Đang mở
        </span>
        <select
          aria-label="Chuyển trang đang mở"
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
            aria-label="Đóng trang hiện tại"
          >
            <XIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
