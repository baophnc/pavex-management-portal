import { getUser } from "@/features/identity/api";
import type { UserDetail } from "@/features/identity/contracts";
import {
  getHubs,
  getRegions,
  getServiceAreas,
} from "@/features/network/api";
import type {
  Hub,
  NetworkRegion,
  PageResponse,
  ServiceArea,
} from "@/features/network/contracts";
import { getMerchant } from "@/features/partners/api";
import type { MerchantProfile } from "@/features/partners/contracts";
import type { AdminShipmentDetail } from "@/features/shipments/contracts";

export type ShipmentNetworkContext = {
  originRegion: NetworkRegion | null;
  originServiceArea: ServiceArea | null;
  originHub: Hub | null;
  destinationRegion: NetworkRegion | null;
  destinationServiceArea: ServiceArea | null;
  destinationHub: Hub | null;
};

export type ShipmentDetailContext = {
  merchant: MerchantProfile | null;
  users: Record<string, UserDetail>;
  network: ShipmentNetworkContext;
};

export type ShipmentContextCapabilities = {
  canReadIdentity: boolean;
  canReadPartners: boolean;
  canReadNetwork: boolean;
};

const emptyNetworkContext: ShipmentNetworkContext = {
  originRegion: null,
  originServiceArea: null,
  originHub: null,
  destinationRegion: null,
  destinationServiceArea: null,
  destinationHub: null,
};

export const emptyShipmentDetailContext: ShipmentDetailContext = {
  merchant: null,
  users: {},
  network: emptyNetworkContext,
};

async function findPagedByIds<T extends { id: string }>(
  ids: readonly string[],
  loader: (params: URLSearchParams) => Promise<PageResponse<T>>,
) {
  const wanted = new Set(ids.filter(Boolean));
  const found = new Map<string, T>();
  if (wanted.size === 0) return found;

  let page = 1;
  let totalPages = 1;
  do {
    const response = await loader(
      new URLSearchParams({ page: String(page), pageSize: "100" }),
    );
    response.items.forEach((item) => {
      if (wanted.has(item.id)) found.set(item.id, item);
    });
    totalPages = Math.max(1, response.totalPages);
    page += 1;
  } while (page <= totalPages && found.size < wanted.size);

  return found;
}

async function loadUsers(detail: AdminShipmentDetail) {
  const orderedIds = [
    detail.createdByUserId,
    ...detail.deliveryAttempts.map((attempt) => attempt.actorUserId),
    ...detail.events.flatMap((event) =>
      event.actorUserId ? [event.actorUserId] : [],
    ),
  ];
  const uniqueIds = Array.from(new Set(orderedIds)).slice(0, 30);
  const settled = await Promise.allSettled(
    uniqueIds.map(async (userId) => [userId, await getUser(userId)] as const),
  );

  return Object.fromEntries(
    settled.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    ),
  );
}

async function loadNetwork(detail: AdminShipmentDetail) {
  const [regionsResult, serviceAreasResult, hubsResult] = await Promise.allSettled([
    getRegions(false),
    findPagedByIds(
      [detail.originServiceAreaId, detail.destinationServiceAreaId],
      getServiceAreas,
    ),
    findPagedByIds(
      [detail.originHubId, detail.destinationHubId],
      getHubs,
    ),
  ]);

  const regions =
    regionsResult.status === "fulfilled" ? regionsResult.value : [];
  const serviceAreas =
    serviceAreasResult.status === "fulfilled"
      ? serviceAreasResult.value
      : new Map<string, ServiceArea>();
  const hubs =
    hubsResult.status === "fulfilled"
      ? hubsResult.value
      : new Map<string, Hub>();

  return {
    originRegion:
      regions.find((region) => region.id === detail.originRegionId) ?? null,
    originServiceArea: serviceAreas.get(detail.originServiceAreaId) ?? null,
    originHub: hubs.get(detail.originHubId) ?? null,
    destinationRegion:
      regions.find((region) => region.id === detail.destinationRegionId) ?? null,
    destinationServiceArea:
      serviceAreas.get(detail.destinationServiceAreaId) ?? null,
    destinationHub: hubs.get(detail.destinationHubId) ?? null,
  } satisfies ShipmentNetworkContext;
}

export async function loadShipmentDetailContext(
  detail: AdminShipmentDetail,
  capabilities: ShipmentContextCapabilities,
): Promise<ShipmentDetailContext> {
  const [merchantResult, usersResult, networkResult] = await Promise.allSettled([
    capabilities.canReadPartners
      ? getMerchant(detail.merchantId).then((response) => response.merchant)
      : Promise.resolve(null),
    capabilities.canReadIdentity ? loadUsers(detail) : Promise.resolve({}),
    capabilities.canReadNetwork
      ? loadNetwork(detail)
      : Promise.resolve(emptyNetworkContext),
  ]);

  return {
    merchant:
      merchantResult.status === "fulfilled" ? merchantResult.value : null,
    users: usersResult.status === "fulfilled" ? usersResult.value : {},
    network:
      networkResult.status === "fulfilled"
        ? networkResult.value
        : emptyNetworkContext,
  };
}
