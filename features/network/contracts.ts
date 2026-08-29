export type NetworkRegionStatus = "INACTIVE" | "ACTIVE";
export type HubStatus = "INACTIVE" | "ACTIVE";
export type HubType = "REGIONAL_GATEWAY" | "PROVINCIAL" | "LOCAL";
export type ServiceAreaStatus = "INACTIVE" | "ACTIVE";
export type CoverageTier = "STANDARD" | "REMOTE" | "ISLAND";

export type PageResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type NetworkRegion = {
  id: string;
  code: string;
  name: string;
  status: NetworkRegionStatus;
  createdAt: string;
  updatedAt: string;
};

export type Hub = {
  id: string;
  code: string;
  name: string;
  type: HubType;
  status: HubStatus;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
  parentHubId: string | null;
  publicVisible: boolean;
  publicName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ServiceArea = {
  id: string;
  code: string;
  name: string;
  regionId: string;
  primaryHubId: string;
  status: ServiceAreaStatus;
  createdAt: string;
  updatedAt: string;
};

export type ServiceAreaCoverage = {
  id: string;
  serviceAreaId: string;
  provinceCode: string;
  wardCode: string | null;
  tier: CoverageTier;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Province = {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
  codeName: string;
};

export type Ward = {
  code: string;
  name: string;
  nameEn: string;
  fullName: string;
  fullNameEn: string;
  codeName: string;
  provinceCode: string;
};

export const hubTypes: HubType[] = [
  "REGIONAL_GATEWAY",
  "PROVINCIAL",
  "LOCAL",
];

export const coverageTiers: CoverageTier[] = [
  "STANDARD",
  "REMOTE",
  "ISLAND",
];

export function networkStatusLabel(status: NetworkRegionStatus | HubStatus | ServiceAreaStatus) {
  return status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động";
}

export function hubTypeLabel(type: HubType) {
  switch (type) {
    case "REGIONAL_GATEWAY":
      return "Gateway vùng";
    case "PROVINCIAL":
      return "Hub tỉnh";
    case "LOCAL":
      return "Hub địa phương";
  }
}

export function coverageTierLabel(tier: CoverageTier) {
  switch (tier) {
    case "STANDARD":
      return "Tiêu chuẩn";
    case "REMOTE":
      return "Vùng xa";
    case "ISLAND":
      return "Hải đảo";
  }
}
