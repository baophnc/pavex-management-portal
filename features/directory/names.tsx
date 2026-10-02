"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { HubStatus, HubType } from "@/features/network/contracts";
import { apiRequest } from "@/lib/api/client";

export type HubDirectoryEntry = {
  id: string;
  code: string;
  name: string;
  type: HubType;
  status: HubStatus;
  provinceCode: string;
  wardCode: string;
};

/*
 * Staff screens name people and hubs instead of printing their ids. Names are cached for the life
 * of the page and looked up in batches: twenty rows each naming a courier make one request.
 */

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** A cache of names looked up by id in batches of up to 200 from one endpoint. */
function nameBook(path: string, read: (entry: Record<string, string>) => string = (entry) => entry.name) {
  const names = new Map<string, string>();
  const pending = new Set<string>();
  let running = false;

  function request(ids: string[]) {
    for (const id of ids) {
      if (id && !names.has(id)) pending.add(id);
    }
    if (pending.size === 0 || running) return;
    running = true;
    void Promise.resolve().then(async () => {
      const batch = [...pending].slice(0, 200);
      batch.forEach((id) => pending.delete(id));
      try {
        const found = await apiRequest<Array<Record<string, string>>>(path, { method: "POST", body: JSON.stringify({ ids: batch }) });
        for (const item of found) names.set(item.id, read(item));
      } catch {
        // Without the directory the screens fall back to their own wording; never retry in a loop.
      }
      // An id nobody owns any more still gets an entry, so it is not asked for again.
      for (const id of batch) if (!names.has(id)) names.set(id, "");
      running = false;
      notify();
      if (pending.size > 0) request([]);
    });
  }

  return { names, request };
}

const users = nameBook("users/names");
const merchants = nameBook("admin/merchants/names");
const shipments = nameBook("admin/shipments/codes", (entry) => entry.trackingCode);

function useDirectoryVersion() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

function useNames(book: ReturnType<typeof nameBook>, ids: Array<string | null | undefined>) {
  useDirectoryVersion();
  const wanted = ids.filter((id): id is string => Boolean(id));
  const key = [...new Set(wanted)].sort().join(",");
  useEffect(() => {
    if (key) book.request(key.split(","));
  }, [book, key]);
  const found = new Map<string, string>();
  for (const id of wanted) {
    const name = book.names.get(id);
    if (name) found.set(id, name);
  }
  return found;
}

/** Names for the given user ids; ids still loading or unknown are missing from the map. */
export function useUserNames(ids: Array<string | null | undefined>) {
  return useNames(users, ids);
}

/** Shop names for the given merchant ids. */
export function useMerchantNames(ids: Array<string | null | undefined>) {
  return useNames(merchants, ids);
}

/** Tracking codes ("PAVEX26…") for the given shipment ids. */
export function useTrackingCodes(ids: Array<string | null | undefined>) {
  return useNames(shipments, ids);
}

/** A shipment's tracking code, linked to its page. */
export function TrackingCode({ id, className }: { id: string | null | undefined; className?: string }) {
  const codes = useTrackingCodes([id]);
  const code = id ? codes.get(id) : undefined;
  if (!code) return <span className={className}>{id ? "Vận đơn" : "—"}</span>;
  return (
    <Link href={`/shipments/${encodeURIComponent(code)}`} className={className ?? "font-mono hover:text-brand hover:underline"}>
      {code}
    </Link>
  );
}

/** A person's name; `fallback` while it loads or when the account is gone. */
export function UserName({ id, fallback = "Nhân viên" }: { id: string | null | undefined; fallback?: string }) {
  const names = useUserNames([id]);
  return <>{(id && names.get(id)) || fallback}</>;
}

/** A shop's name. */
export function MerchantName({ id, fallback = "Cửa hàng" }: { id: string | null | undefined; fallback?: string }) {
  const names = useMerchantNames([id]);
  return <>{(id && names.get(id)) || fallback}</>;
}

let hubDirectory: Map<string, HubDirectoryEntry> | null = null;
let hubRequest: Promise<Map<string, HubDirectoryEntry>> | null = null;

export function loadHubDirectory() {
  if (hubDirectory) return Promise.resolve(hubDirectory);
  hubRequest ??= apiRequest<HubDirectoryEntry[]>("admin/network/hubs/directory")
    .then((items) => {
      hubDirectory = new Map(items.map((item) => [item.id, item]));
      notify();
      return hubDirectory;
    })
    .catch(() => {
      hubRequest = null;
      return new Map<string, HubDirectoryEntry>();
    });
  return hubRequest;
}

/** Every hub by id (empty until loaded). */
export function useHubDirectory() {
  useDirectoryVersion();
  useEffect(() => {
    void loadHubDirectory();
  }, []);
  return hubDirectory ?? new Map<string, HubDirectoryEntry>();
}

export function hubLabel(hub: Pick<HubDirectoryEntry, "code" | "name"> | undefined, fallback = "Bưu cục") {
  return hub ? `${hub.code} · ${hub.name}` : fallback;
}

/** "HN-BD · Bưu cục Ba Đình" for a hub id. */
export function HubName({ id, fallback = "—", codeOnly = false }: { id: string | null | undefined; fallback?: string; codeOnly?: boolean }) {
  const hubs = useHubDirectory();
  const hub = id ? hubs.get(id) : undefined;
  if (!hub) return <>{id ? "Bưu cục" : fallback}</>;
  return <>{codeOnly ? hub.code : hubLabel(hub)}</>;
}
