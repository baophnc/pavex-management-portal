"use client";

import { useEffect, useState } from "react";

import { loadHubDirectory } from "@/features/directory/names";
import { getMyHubScope } from "@/features/operations/hub-scope";
import { selectClassName } from "@/features/pricing/ui";
import { cn } from "@/lib/utils";

export type HubOption = { id: string; code: string; name: string; primary: boolean };

export type HubScopeState = {
  loading: boolean;
  /** Head office: every hub, and "all hubs" is a valid choice. */
  allHubs: boolean;
  hubs: HubOption[];
  /** The hub to start on: the user's primary hub, or "" (all hubs) for head office. */
  initialHubId: string;
  error: string | null;
};

const EMPTY: HubScopeState = { loading: true, allHubs: false, hubs: [], initialHubId: "", error: null };

/**
 * The hubs this user works with. Head office gets every active hub; hub staff only theirs, so a
 * screen can show a hub picker to head office and a fixed hub name to everyone else.
 */
export function useHubScope(): HubScopeState {
  const [state, setState] = useState<HubScopeState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    getMyHubScope()
      .then(async (scope) => {
        let hubs: HubOption[];
        if (scope.allHubs) {
          const directory = await loadHubDirectory();
          hubs = [...directory.values()]
            .filter((hub) => hub.status === "ACTIVE")
            .map((hub) => ({ id: hub.id, code: hub.code, name: hub.name, primary: false }));
        } else {
          hubs = scope.hubs
            .filter((hub) => hub.status === "ACTIVE")
            .map((hub) => ({ id: hub.id, code: hub.code, name: hub.name, primary: hub.primary }));
        }
        const initialHubId = scope.allHubs ? "" : (hubs.find((hub) => hub.primary) ?? hubs[0])?.id ?? "";
        if (cancelled) return;
        setState({
          loading: false,
          allHubs: scope.allHubs,
          hubs,
          initialHubId,
          error: !scope.allHubs && hubs.length === 0 ? "Tài khoản chưa thuộc bưu cục nào. Nhờ quản lý thêm bạn vào bưu cục ở mục Nhân sự." : null,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, loading: false, error: "Không tải được danh sách bưu cục của bạn." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Pick a hub within the user's scope. With one hub there is nothing to choose, so its name is
 * shown instead. `allLabel` adds an "every hub" choice, offered to head office only.
 */
export function HubSelect({
  scope,
  value,
  onChange,
  allLabel,
  className,
}: {
  scope: HubScopeState;
  value: string;
  onChange: (hubId: string) => void;
  allLabel?: string;
  className?: string;
}) {
  const offerAll = Boolean(allLabel) && scope.allHubs;
  if (scope.loading) return <p className={cn("self-center text-xs text-muted-foreground", className)}>Đang tải bưu cục…</p>;
  if (!offerAll && scope.hubs.length === 1) {
    const hub = scope.hubs[0];
    return <p className={cn("self-center text-sm font-bold", className)}>{hub.code} · {hub.name}</p>;
  }
  return (
    <select className={cn(selectClassName, className)} value={value} onChange={(event) => onChange(event.target.value)} aria-label="Bưu cục">
      {offerAll ? <option value="">{allLabel}</option> : value ? null : <option value="">Chọn bưu cục</option>}
      {scope.hubs.map((hub) => (
        <option key={hub.id} value={hub.id}>
          {hub.code} · {hub.name}
        </option>
      ))}
    </select>
  );
}
