import type { WorkforceMemberKind } from "@/features/operations/contracts";
import { getAllHubs } from "@/features/network/api";
import type { Hub, HubStatus, HubType } from "@/features/network/contracts";
import { apiRequest } from "@/lib/api/client";

export type MyHub = {
  id: string;
  code: string;
  name: string;
  type: HubType;
  status: HubStatus;
  provinceCode: string;
  wardCode: string;
  primary: boolean;
};

/** Which hubs the signed-in user's screens cover; `allHubs` is head office. */
export type MyHubScope = {
  allHubs: boolean;
  workforceKind: WorkforceMemberKind | null;
  hubs: MyHub[];
};

export function getMyHubScope() {
  return apiRequest<MyHubScope>("operations/me/hub-scope");
}

/**
 * Hubs to offer in filters and pickers: every hub for head office, only their own
 * for hub staff (who cannot read the network catalogue).
 */
export async function getScopedHubs(): Promise<Hub[]> {
  const scope = await getMyHubScope();
  if (scope.allHubs) return getAllHubs();
  return scope.hubs.map((hub) => ({
    id: hub.id,
    code: hub.code,
    name: hub.name,
    type: hub.type,
    status: hub.status,
    addressLine: "",
    provinceCode: hub.provinceCode,
    wardCode: hub.wardCode,
    parentHubId: null,
    publicVisible: false,
    publicName: null,
    latitude: null,
    longitude: null,
    createdAt: "",
    updatedAt: "",
  }));
}
