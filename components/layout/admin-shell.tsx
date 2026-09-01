"use client";

import {
  Building2Icon,
  CalendarClockIcon,
  ClipboardListIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  CircleGaugeIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  RefreshCwIcon,
  TruckIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  SunIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { WorkspaceTabs } from "@/components/layout/workspace-tabs";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import { Button } from "@/components/ui/button";
import { AccessProvider } from "@/features/auth/access-context";
import { roleLabel } from "@/features/identity/presentation";
import {
  canAccessManagementPath,
  hasAnyPermission,
  hasPermission,
} from "@/lib/auth/access";
import type { CurrentUser } from "@/lib/auth/contracts";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: typeof CircleGaugeIcon;
  permission?: string;
  permissionsAny?: string[];
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const SIDEBAR_STORAGE_KEY = "pavex-management:sidebar-collapsed";
const SIDEBAR_EVENT = "pavex-management:sidebar-preference-changed";

function subscribeSidebarPreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SIDEBAR_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

function sidebarPreferenceSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
}

function setSidebarPreference(collapsed: boolean) {
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

const navigationSections: NavigationSection[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/dashboard", label: "Bảng điều hành", icon: CircleGaugeIcon },
    ],
  },
  {
    label: "Identity",
    items: [
      {
        href: "/identity/users",
        label: "Người dùng",
        icon: UsersRoundIcon,
        permission: "identity.users.read",
      },
      {
        href: "/identity/roles",
        label: "Vai trò & quyền",
        icon: ShieldCheckIcon,
        permission: "identity.roles.read",
      },
    ],
  },
  {
    label: "Partners",
    items: [
      {
        href: "/partners/merchants",
        label: "Merchant",
        icon: Building2Icon,
        permission: "partners.merchants.read",
      },
    ],
  },
  {
    label: "Mạng lưới",
    items: [
      {
        href: "/network",
        label: "Tổng quan",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/regions",
        label: "Vùng mạng lưới",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/hubs",
        label: "Điểm trung chuyển",
        icon: Building2Icon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/service-areas",
        label: "Vùng phục vụ",
        icon: Building2Icon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/routes",
        label: "Tuyến vận chuyển",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/route-planner",
        label: "Tìm tuyến",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/capacity",
        label: "Sức chứa",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
      {
        href: "/network/audit",
        label: "Nhật ký",
        icon: CircleGaugeIcon,
        permissionsAny: ["network.read", "network.manage"],
      },
    ],
  },
  {
    label: "Vận hành",
    items: [
      {
        href: "/operations",
        label: "Điều phối vận hành",
        icon: CircleGaugeIcon,
        permissionsAny: [
          "operations.workforce.manage",
          "operations.assignments.manage",
          "operations.hub.manage",
        ],
      },
      {
        href: "/operations/workforce",
        label: "Nhân sự vận hành",
        icon: UsersRoundIcon,
        permissionsAny: [
          "operations.workforce.manage",
          "operations.hub.manage",
        ],
      },
      {
        href: "/operations/shifts",
        label: "Ca làm việc",
        icon: CalendarClockIcon,
        permissionsAny: [
          "operations.workforce.manage",
          "operations.hub.manage",
        ],
      },
      {
        href: "/operations/assignments",
        label: "Phân công",
        icon: ClipboardListIcon,
        permissionsAny: [
          "operations.assignments.manage",
          "operations.hub.manage",
        ],
      },
      {
        href: "/operations/dispatch",
        label: "Dispatch & outbox",
        icon: ShieldAlertIcon,
        permissionsAny: [
          "operations.assignments.manage",
          "operations.hub.manage",
        ],
      },
      {
        href: "/shipments",
        label: "Vận đơn",
        icon: TruckIcon,
        permission: "shipments.admin.read",
      },
    ],
  },
  {
    label: "Bảng giá & cước",
    items: [
      {
        href: "/pricing",
        label: "Tổng quan cước",
        icon: CircleDollarSignIcon,
        permissionsAny: ["pricing.read", "pricing.manage"],
      },
      {
        href: "/pricing/rate-plans",
        label: "Bảng giá",
        icon: CircleDollarSignIcon,
        permissionsAny: ["pricing.read", "pricing.manage"],
      },
      {
        href: "/pricing/simulator",
        label: "Tính thử cước",
        icon: CircleGaugeIcon,
        permissionsAny: ["pricing.read", "pricing.manage"],
      },
      {
        href: "/pricing/audit",
        label: "Nhật ký giá",
        icon: CircleGaugeIcon,
        permissionsAny: ["pricing.read", "pricing.manage"],
      },
    ],
  },
  {
    label: "Cá nhân",
    items: [
      {
        href: "/account",
        label: "Tài khoản của tôi",
        icon: CircleUserRoundIcon,
      },
    ],
  },
];

const navigation = navigationSections.flatMap((section) => section.items);

function permitted(item: NavigationItem, user: CurrentUser | null) {
  if (item.permission && !hasPermission(user, item.permission)) return false;
  if (item.permissionsAny?.length && !hasAnyPermission(user, item.permissionsAny)) {
    return false;
  }
  return true;
}

function normalizedNavigationPath(pathname: string) {
  if (pathname === "/network/coverage") return "/network/service-areas";
  if (pathname === "/network/lanes" || pathname === "/network/route-templates") {
    return "/network/routes";
  }
  return pathname;
}

function currentNavigation(pathname: string) {
  const navigationPath = normalizedNavigationPath(pathname);
  return [...navigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (item) =>
        navigationPath === item.href || navigationPath.startsWith(`${item.href}/`),
    );
}

function currentSection(item: NavigationItem | undefined) {
  if (!item) return "PAVEX";

  return (
    navigationSections.find((section) =>
      section.items.some((candidate) => candidate.href === item.href),
    )?.label ?? "PAVEX"
  );
}

function primaryRole(user: CurrentUser | null) {
  const role = user?.roles[0];
  return role ? roleLabel(role) : "PAVEX";
}

function initialsOf(user: CurrentUser | null) {
  const source = user?.displayName?.trim() || user?.email || "P";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useAppTheme();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarCollapsed = useSyncExternalStore(
    subscribeSidebarPreference,
    sidebarPreferenceSnapshot,
    () => false,
  );
  const mobilePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const abort = new AbortController();

    const expired = () => {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    };

    const loadUser = async () => {
      setConnectionError(null);

      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          signal: abort.signal,
        });

        if (response.status === 401) {
          expired();
          return;
        }
        if (response.status === 403) {
          router.replace("/login?reason=management-access");
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { user?: CurrentUser; message?: string }
          | null;

        if (!response.ok) {
          setConnectionError(
            payload?.message ?? "Không thể kết nối backend Pavex.",
          );
          return;
        }

        setUser(payload?.user ?? null);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setConnectionError("Không thể kết nối Management BFF.");
      } finally {
        if (!abort.signal.aborted) setLoaded(true);
      }
    };

    window.addEventListener("pavex-management:session-expired", expired);
    window.addEventListener("pavex-management:user-updated", loadUser);
    void loadUser();

    return () => {
      abort.abort();
      window.removeEventListener("pavex-management:session-expired", expired);
      window.removeEventListener("pavex-management:user-updated", loadUser);
    };
  }, [router]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    document.body.style.overflow = "hidden";
    mobilePanelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  function toggleSidebar() {
    setSidebarPreference(!sidebarCollapsed);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const visibleSections = useMemo(
    () =>
      navigationSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => permitted(item, user)),
        }))
        .filter((section) => section.items.length > 0),
    [user],
  );

  const current = currentNavigation(pathname);
  const section = currentSection(current);
  const allowed = canAccessManagementPath(user, pathname);
  const initials = initialsOf(user);

  function renderNavigation(collapsed: boolean, mobile = false) {
    const navigationPath = normalizedNavigationPath(pathname);
    return (
      <nav className="space-y-5 p-3" aria-label="Điều hướng chính">
        {visibleSections.map((group) => (
          <section key={group.label}>
            {!collapsed ? (
              <p className="px-2.5 pb-1.5 text-[0.58rem] font-black tracking-[0.15em] text-muted-foreground uppercase">
                {group.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active =
                  navigationPath === item.href ||
                  navigationPath.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => mobile && setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex h-10 items-center rounded-lg text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                      collapsed ? "justify-center px-2" : "gap-3 px-3",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  return (
    <AccessProvider user={user}>
      <div className="min-h-screen bg-background">
        <a
          href="#management-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground focus:translate-y-0"
        >
          Đi tới nội dung
        </a>

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-card transition-[width] duration-200 lg:flex",
            sidebarCollapsed ? "w-[4.75rem]" : "w-64",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center border-b",
              sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-lg font-black italic text-white">
              P
            </span>
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="font-black text-brand">PAVEX</p>
                <p className="truncate text-[0.58rem] font-black tracking-[0.16em] text-muted-foreground uppercase">
                  Management Portal
                </p>
              </div>
            ) : null}
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {renderNavigation(sidebarCollapsed)}
          </div>

          <div className="border-t p-3">
            <Button
              variant="ghost"
              size={sidebarCollapsed ? "icon" : "default"}
              className={cn(
                "mb-2 text-muted-foreground",
                sidebarCollapsed ? "w-full" : "w-full justify-start",
              )}
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpenIcon className="size-4" />
              ) : (
                <>
                  <PanelLeftCloseIcon className="size-4" />
                  Thu gọn sidebar
                </>
              )}
            </Button>

            {sidebarCollapsed ? (
              <Link
                href="/account"
                className="grid place-items-center rounded-xl border bg-muted/35 p-2 transition hover:bg-muted"
                title={user?.email ?? "Tài khoản của tôi"}
                aria-label="Mở tài khoản của tôi"
              >
                <span className="grid size-9 place-items-center rounded-full bg-brand/10 text-xs font-black text-brand">
                  {initials}
                </span>
              </Link>
            ) : (
              <Link
                href="/account"
                className="block rounded-xl border bg-muted/35 p-3 transition hover:bg-muted"
                aria-label="Mở tài khoản của tôi"
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-black text-brand">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black">
                      {user?.displayName || "Quản trị viên"}
                    </p>
                    <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
                      {user?.email ?? "Đang xác thực..."}
                    </p>
                  </div>
                </div>
                <p className="mt-2 truncate text-[0.58rem] font-black tracking-[0.12em] text-muted-foreground uppercase">
                  {primaryRole(user)}
                </p>
              </Link>
            )}
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              ref={mobilePanelRef}
              id="management-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-labelledby="management-mobile-navigation-title"
              tabIndex={-1}
              className="relative flex h-full w-[min(20rem,88vw)] flex-col border-r bg-card shadow-2xl outline-none"
            >
              <div className="flex h-16 items-center gap-3 border-b px-4">
                <span className="grid size-9 place-items-center rounded-xl bg-brand text-lg font-black italic text-white">
                  P
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    id="management-mobile-navigation-title"
                    className="font-black text-brand"
                  >
                    PAVEX
                  </p>
                  <p className="text-[0.58rem] font-black tracking-[0.16em] text-muted-foreground uppercase">
                    Management Portal
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
                {renderNavigation(false, true)}
              </div>
              <div className="border-t p-3">
                <Link
                  href="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl bg-muted/45 p-3 transition hover:bg-muted"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-black text-brand">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black">
                      {user?.displayName || "Quản trị viên"}
                    </p>
                    <p className="truncate text-[0.65rem] text-muted-foreground">
                      {user?.email ?? "Đang xác thực..."}
                    </p>
                  </div>
                </Link>
              </div>
            </aside>
          </div>
        ) : null}

        <div
          className={cn(
            "transition-[padding] duration-200",
            sidebarCollapsed ? "lg:pl-[4.75rem]" : "lg:pl-64",
          )}
        >
          <div className="sticky top-0 z-30 border-b bg-background/92 shadow-[0_1px_0_rgba(0,0,0,0.025)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
            <header className="flex h-16 items-center px-3 sm:px-4 lg:px-5">
              <Button
                variant="outline"
                size="icon"
                className="mr-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
                aria-expanded={mobileOpen}
                aria-controls="management-mobile-navigation"
              >
                <MenuIcon className="size-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5 text-[0.62rem] font-bold text-muted-foreground">
                  <span className="truncate">{section}</span>
                  <ChevronRightIcon className="size-3 shrink-0 opacity-50" />
                  <span className="truncate text-foreground/75">
                    {current?.label ?? "Management Portal"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <h1 className="truncate text-sm font-black">
                    {current?.label ?? "PAVEX Management Portal"}
                  </h1>
                  <span
                    className={cn(
                      "hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.58rem] font-black sm:inline-flex",
                      connectionError
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : loaded
                          ? "border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        connectionError
                          ? "bg-destructive"
                          : loaded
                            ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(34,197,94,0.1)]"
                            : "animate-pulse bg-amber-500",
                      )}
                    />
                    {connectionError
                      ? "backend lỗi"
                      : loaded
                        ? "core-api"
                        : "đang kết nối"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đổi giao diện"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <SunIcon className="size-4" />
                  ) : (
                    <MoonIcon className="size-4" />
                  )}
                </Button>
                <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
                <div className="hidden min-w-0 text-right md:block">
                  <p className="max-w-44 truncate text-[0.68rem] font-black">
                    {user?.displayName || "Quản trị viên"}
                  </p>
                  <p className="max-w-44 truncate text-[0.58rem] text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                </div>
                <Link
                  href="/account"
                  aria-label="Mở tài khoản của tôi"
                  className="ml-1 grid size-8 place-items-center rounded-full bg-brand/10 text-xs font-black text-brand ring-1 ring-brand/10 transition hover:bg-brand/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
                >
                  {initials}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Đăng xuất"
                  onClick={() => void logout()}
                >
                  <LogOutIcon className="size-4" />
                </Button>
              </div>
            </header>

            <Suspense
              fallback={
                <div className="h-10 border-t bg-muted/30" aria-hidden="true" />
              }
            >
              {loaded && user && !connectionError ? (
                <WorkspaceTabs />
              ) : (
                <div className="h-10 border-t bg-muted/30" aria-hidden="true" />
              )}
            </Suspense>
          </div>

          <main
            id="management-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1920px] p-3 outline-none sm:p-4 lg:p-5 xl:p-6"
          >
            {!loaded ? (
              <div className="grid min-h-[65vh] place-items-center rounded-2xl border bg-card text-xs font-bold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-brand" />
                  Đang tải quyền truy cập...
                </div>
              </div>
            ) : connectionError ? (
              <div className="grid min-h-[65vh] place-items-center rounded-2xl border border-dashed border-destructive/25 bg-destructive/5 p-6 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10">
                    <ShieldAlertIcon className="size-6 text-destructive" />
                  </span>
                  <h1 className="mt-4 text-lg font-black">Backend tạm thời không khả dụng</h1>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {connectionError} Phiên đăng nhập hiện tại chưa bị xóa; hãy
                    thử kết nối lại trước khi đăng nhập lại.
                  </p>
                  <Button
                    className="mt-5"
                    variant="outline"
                    onClick={() => window.dispatchEvent(new Event("pavex-management:user-updated"))}
                  >
                    <RefreshCwIcon className="size-4" />
                    Thử kết nối lại
                  </Button>
                </div>
              </div>
            ) : !allowed ? (
              <div className="grid min-h-[65vh] place-items-center rounded-2xl border border-dashed bg-muted/35 p-6 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted">
                    <ShieldAlertIcon className="size-6 text-muted-foreground" />
                  </span>
                  <h1 className="mt-4 text-lg font-black">
                    Bạn chưa có quyền dùng chức năng này
                  </h1>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Backend chưa cấp permission cần thiết cho tài khoản hiện tại.
                    Hãy kiểm tra role hoặc permission trước khi thử lại.
                  </p>
                  <Button
                    className="mt-5"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Về bảng điều hành
                  </Button>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </AccessProvider>
  );
}
