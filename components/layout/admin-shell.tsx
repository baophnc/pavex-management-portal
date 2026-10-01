"use client";

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  RefreshCwIcon,
  ScanSearchIcon,
  SearchIcon,
  ShieldAlertIcon,
  SunIcon,
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
  type FormEvent,
} from "react";

import {
  locate,
  visibleModules,
  type NavigationGroup,
  type NavigationItem,
  type NavigationModule,
} from "@/components/layout/navigation";
import { WorkspaceTabs } from "@/components/layout/workspace-tabs";
import { useAppTheme } from "@/components/theme/app-theme-provider";
import { Button } from "@/components/ui/button";
import { AccessProvider } from "@/features/auth/access-context";
import { roleLabel } from "@/features/identity/presentation";
import { getMyHubScope } from "@/features/operations/hub-scope";
import {
  canAccessManagementPath,
  canAccessShipmentList,
  hasPermission,
  seesAllHubs,
} from "@/lib/auth/access";
import type { CurrentUser } from "@/lib/auth/contracts";
import { cn } from "@/lib/utils";

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
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function setSidebarPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    // Private mode: the choice lasts until reload.
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

function folded(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").replaceAll("đ", "d").replaceAll("Đ", "D").toLowerCase();
}

function primaryRole(user: CurrentUser | null) {
  const role = user?.roles[0];
  return role ? roleLabel(role) : "PAVEX";
}

function initialsOf(user: CurrentUser | null) {
  const source = user?.displayName?.trim() || user?.email || "P";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** The hubs hub staff are limited to, shown under their name like a workplace badge. */
function useHubScopeLabel(user: CurrentUser | null) {
  const [label, setLabel] = useState<string | null>(null);
  const limited = Boolean(user && !seesAllHubs(user) && hasPermission(user, "operations.hub.read"));
  useEffect(() => {
    if (!limited) return;
    let active = true;
    getMyHubScope()
      .then((scope) => {
        if (!active) return;
        const names = scope.hubs.map((hub) => hub.name);
        setLabel(names.length ? names.join(", ") : "Chưa được phân bưu cục");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [limited]);
  return limited ? label : null;
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5 select-none">
      <span className="text-xl font-black tracking-tight text-brand italic">PAVEX</span>
      {compact ? null : <span className="text-[0.62rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">Quản trị</span>}
    </span>
  );
}

type SearchHit = { area: NavigationModule; group: NavigationGroup; item: NavigationItem };

function MenuSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm chức năng"
        aria-label="Tìm chức năng"
        className="h-8 w-full rounded-full border bg-background pr-3 pl-8 text-xs outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
}

function SearchResults({ hits, activeHref, onNavigate }: { hits: SearchHit[]; activeHref?: string; onNavigate?: () => void }) {
  if (!hits.length) return <p className="px-4 py-6 text-center text-xs text-muted-foreground">Không có chức năng phù hợp.</p>;
  return (
    <ul className="space-y-0.5 px-2">
      {hits.map(({ area, group, item }) => (
        <li key={item.href}>
          <Link
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block rounded px-2.5 py-2 text-xs transition hover:bg-muted",
              item.href === activeHref && "bg-brand/5 font-semibold text-brand",
            )}
          >
            <span className="block">{item.label}</span>
            <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
              {area.label} › {group.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useAppTheme();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [tracking, setTracking] = useState("");
  // Browsing another module's menu without leaving the page; forgotten on navigation.
  const [browse, setBrowse] = useState<{ path: string; moduleKey: string; groupLabel?: string } | null>(null);
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebarPreference, sidebarPreferenceSnapshot, () => false);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const hubScope = useHubScopeLabel(loaded ? user : null);

  useEffect(() => {
    const abort = new AbortController();

    const expired = () => {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    };

    const loadUser = async () => {
      setConnectionError(null);
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store", signal: abort.signal });
        if (response.status === 401) {
          expired();
          return;
        }
        if (response.status === 403) {
          router.replace("/login?reason=management-access");
          return;
        }
        const payload = (await response.json().catch(() => null)) as { user?: CurrentUser; message?: string } | null;
        if (!response.ok) {
          setConnectionError(payload?.message ?? "Không thể kết nối máy chủ Pavex.");
          return;
        }
        setUser(payload?.user ?? null);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setConnectionError("Không thể kết nối máy chủ Pavex.");
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
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [userMenuOpen]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  function openTracking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = tracking.trim().toUpperCase();
    if (!code) return;
    setTracking("");
    router.push(`/shipments/tracking?codes=${encodeURIComponent(code)}`);
  }

  const modules = useMemo(() => visibleModules(user), [user]);
  const location = locate(modules, pathname);
  const browsing = browse?.path === pathname ? browse : null;
  const activeModule =
    modules.find((area) => area.key === (browsing?.moduleKey ?? location?.area.key)) ?? modules[0];
  const activeGroup =
    activeModule?.groups.find(
      (group) =>
        group.label ===
        (browsing?.groupLabel ?? (location?.area.key === activeModule.key ? location.group.label : undefined)),
    ) ?? activeModule?.groups[0];
  const activeHref = location?.item.href;

  const hits = useMemo<SearchHit[]>(() => {
    const query = folded(menuSearch.trim());
    if (!query) return [];
    return modules.flatMap((area) =>
      area.groups.flatMap((group) =>
        group.items
          .filter((item) => folded(`${item.label} ${group.label} ${area.label}`).includes(query))
          .map((item) => ({ area, group, item })),
      ),
    );
  }, [menuSearch, modules]);

  const allowed = canAccessManagementPath(user, pathname);
  const initials = initialsOf(user);
  const canTrack = canAccessShipmentList(user);

  function pickModule(key: string) {
    setBrowse({ path: pathname, moduleKey: key });
    setMenuSearch("");
    if (sidebarCollapsed) setSidebarPreference(false);
  }

  function pickGroup(label: string) {
    if (!activeModule) return;
    setBrowse({ path: pathname, moduleKey: activeModule.key, groupLabel: label });
  }

  const sidebarWidth = "17rem";

  return (
    <AccessProvider user={user}>
      <div className="min-h-screen bg-background">
        <a
          href="#management-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground focus:translate-y-0"
        >
          Đi tới nội dung
        </a>

        {/* Top bar: brand, modules, quick tracking, account. */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center border-b bg-card">
          <div className="flex h-full shrink-0 items-center gap-2 px-3 lg:w-[17rem] lg:px-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
              aria-expanded={mobileOpen}
              aria-controls="management-mobile-navigation"
            >
              <MenuIcon className="size-4" />
            </Button>
            <Link href="/dashboard" aria-label="Về bảng điều hành" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35">
              <Wordmark compact />
            </Link>
          </div>

          <nav className="scrollbar-none hidden h-full min-w-0 flex-1 items-stretch overflow-x-auto lg:flex" aria-label="Phân hệ">
            {modules.map((area) => {
              const current = location?.area.key === area.key;
              const shown = activeModule?.key === area.key;
              return (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => pickModule(area.key)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "relative shrink-0 px-2.5 text-[0.8rem] font-semibold whitespace-nowrap transition hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/35",
                    shown ? "text-brand" : "text-foreground/80",
                  )}
                >
                  {area.label}
                  {shown ? <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-brand" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 px-2 sm:px-3">
            {canTrack ? (
              <form onSubmit={openTracking} className="relative hidden xl:block" role="search">
                <ScanSearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={tracking}
                  onChange={(event) => setTracking(event.target.value)}
                  placeholder="Tra hành trình"
                  aria-label="Tra hành trình theo mã vận đơn"
                  className="h-8 w-44 rounded-full border bg-background pr-3 pl-8 font-mono text-xs uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-muted-foreground focus:w-56 focus:border-brand focus:ring-2 focus:ring-brand/15"
                />
              </form>
            ) : null}

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35"
              >
                <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-brand text-[0.68rem] font-bold text-white">
                  {initials}
                  <span
                    className={cn(
                      "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-card",
                      connectionError ? "bg-destructive" : loaded ? "bg-emerald-500" : "animate-pulse bg-amber-500",
                    )}
                    title={connectionError ? "Mất kết nối" : loaded ? "Đã kết nối" : "Đang kết nối"}
                  />
                </span>
                <span className="hidden min-w-0 text-left xl:block">
                  <span className="block max-w-48 truncate text-[0.72rem] font-bold">{hubScope ?? primaryRole(user)}</span>
                  <span className="block max-w-48 truncate text-[0.68rem] text-muted-foreground">
                    {user?.displayName || user?.email || "Đang xác thực..."}
                  </span>
                </span>
                <ChevronDownIcon className="hidden size-3.5 text-muted-foreground xl:block" />
              </button>

              {userMenuOpen ? (
                <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-md border bg-card shadow-lg">
                  <div className="border-b px-3 py-2.5">
                    <p className="truncate text-xs font-bold">{user?.displayName || "Người dùng PAVEX"}</p>
                    <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground">{user?.email}</p>
                    <p className="mt-1 truncate text-[0.68rem] text-brand">{primaryRole(user)}</p>
                    {hubScope ? <p className="mt-0.5 truncate text-[0.68rem] text-muted-foreground" title={hubScope}>Bưu cục: {hubScope}</p> : null}
                  </div>
                  <Link
                    role="menuitem"
                    href="/account"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted"
                  >
                    <CircleUserRoundIcon className="size-3.5" /> Tài khoản của tôi
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted"
                  >
                    {theme === "dark" ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
                    {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
                  </button>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs text-brand hover:bg-muted"
                  >
                    <LogOutIcon className="size-3.5" /> Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Left menu: the chosen module's groups, and the pages of the chosen group beside them. */}
        {!sidebarCollapsed ? (
          <aside
            className="fixed bottom-0 left-0 top-12 z-30 hidden flex-col border-r bg-card lg:flex"
            style={{ width: sidebarWidth }}
            aria-label="Menu chức năng"
          >
            <div className="p-3">
              <MenuSearch value={menuSearch} onChange={setMenuSearch} />
            </div>
            {menuSearch.trim() ? (
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-3">
                <SearchResults hits={hits} activeHref={activeHref} onNavigate={() => setMenuSearch("")} />
              </div>
            ) : activeModule ? (
              <>
                <p className="flex items-center gap-2 px-3 pb-2.5 text-sm font-bold">
                  <span className="h-4 w-[3px] rounded-full bg-brand" aria-hidden="true" />
                  {activeModule.label}
                </p>
                <div className="flex min-h-0 flex-1">
                  <ul className="scrollbar-thin w-[7.5rem] shrink-0 space-y-1 overflow-y-auto border-r px-1.5 pb-3">
                    {activeModule.groups.map((group) => {
                      const Icon = group.icon;
                      const active = group.label === activeGroup?.label;
                      return (
                        <li key={group.label}>
                          <button
                            type="button"
                            onClick={() => pickGroup(group.label)}
                            aria-pressed={active}
                            className={cn(
                              "flex w-full items-start gap-1.5 rounded px-2 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                              active ? "bg-brand text-white" : "text-foreground/80 hover:bg-muted",
                            )}
                          >
                            <Icon className="mt-px size-3.5 shrink-0" />
                            <span className="leading-4">{group.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className="scrollbar-thin min-w-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-3">
                    {activeGroup?.items.map((item) => {
                      const active = item.href === activeHref;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "block rounded px-2 py-2 text-xs leading-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
                              active ? "font-semibold text-brand" : "text-foreground/85 hover:bg-muted hover:text-brand",
                            )}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            ) : null}
          </aside>
        ) : null}

        <button
          type="button"
          onClick={() => setSidebarPreference(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Mở menu chức năng" : "Thu gọn menu chức năng"}
          className="fixed top-1/2 z-30 hidden h-12 w-3.5 -translate-y-1/2 place-items-center rounded-r border border-l-0 bg-card text-muted-foreground shadow-sm transition hover:text-brand lg:grid"
          style={{ left: sidebarCollapsed ? 0 : sidebarWidth }}
        >
          {sidebarCollapsed ? <ChevronRightIcon className="size-3" /> : <ChevronLeftIcon className="size-3" />}
        </button>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              ref={mobilePanelRef}
              id="management-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label="Menu chức năng"
              tabIndex={-1}
              className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-card shadow-2xl outline-none"
            >
              <div className="flex h-12 items-center justify-between border-b px-3">
                <Wordmark />
                <Button variant="ghost" size="icon" className="size-8" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}>
                  <XIcon className="size-4" />
                </Button>
              </div>
              <div className="p-3">
                <MenuSearch value={menuSearch} onChange={setMenuSearch} />
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pb-4">
                {menuSearch.trim() ? (
                  <SearchResults
                    hits={hits}
                    activeHref={activeHref}
                    onNavigate={() => {
                      setMenuSearch("");
                      setMobileOpen(false);
                    }}
                  />
                ) : (
                  modules.map((area) => (
                    <section key={area.key} className="px-3 pb-3">
                      <p className="flex items-center gap-2 py-1.5 text-sm font-bold">
                        <span className="h-4 w-[3px] rounded-full bg-brand" aria-hidden="true" />
                        {area.label}
                      </p>
                      {area.groups.map((group) => {
                        const Icon = group.icon;
                        return (
                          <div key={group.label} className="mt-1">
                            <p className="flex items-center gap-1.5 px-1 py-1 text-[0.68rem] font-semibold text-muted-foreground">
                              <Icon className="size-3" /> {group.label}
                            </p>
                            {group.items.map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "block rounded px-3 py-2 text-xs",
                                  item.href === activeHref ? "bg-brand/5 font-semibold text-brand" : "hover:bg-muted",
                                )}
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        );
                      })}
                    </section>
                  ))
                )}
              </div>
            </aside>
          </div>
        ) : null}

        <div
          className="pt-12 transition-[padding] duration-200 lg:pl-[var(--sidebar-width)]"
          // Collapsed, keep room for the reopen handle so it never covers the page.
          style={{ ["--sidebar-width" as string]: sidebarCollapsed ? "0.875rem" : sidebarWidth }}
        >
          <div className="sticky top-12 z-20">
            <Suspense fallback={<div className="h-9 border-b bg-card" aria-hidden="true" />}>
              {loaded && user && !connectionError ? <WorkspaceTabs /> : <div className="h-9 border-b bg-card" aria-hidden="true" />}
            </Suspense>
          </div>

          <main id="management-content" tabIndex={-1} className="w-full p-2.5 outline-none sm:p-3">
            {!loaded ? (
              <div className="grid min-h-[65vh] place-items-center rounded-md border bg-card text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="size-2 animate-pulse rounded-full bg-brand" />
                  Đang tải quyền truy cập...
                </div>
              </div>
            ) : connectionError ? (
              <div className="grid min-h-[65vh] place-items-center rounded-md border border-dashed border-destructive/25 bg-card p-6 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10">
                    <ShieldAlertIcon className="size-6 text-destructive" />
                  </span>
                  <h1 className="mt-4 text-base font-bold">Máy chủ Pavex tạm thời không phản hồi</h1>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {connectionError} Phiên đăng nhập hiện tại chưa bị xoá; hãy thử kết nối lại trước khi đăng nhập lại.
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
              <div className="grid min-h-[65vh] place-items-center rounded-md border border-dashed bg-card p-6 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                    <ShieldAlertIcon className="size-6 text-muted-foreground" />
                  </span>
                  <h1 className="mt-4 text-base font-bold">Bạn chưa có quyền dùng chức năng này</h1>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Tài khoản của bạn chưa được cấp quyền mở trang này. Hãy nhờ quản trị viên kiểm tra vai trò của bạn.
                  </p>
                  <Button className="mt-5" variant="outline" onClick={() => router.push("/dashboard")}>
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
