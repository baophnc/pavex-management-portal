import {
  Building2Icon,
  CalendarClockIcon,
  CircleDollarSignIcon,
  CircleGaugeIcon,
  CircleUserRoundIcon,
  ClipboardListIcon,
  HandCoinsIcon,
  InboxIcon,
  LandmarkIcon,
  MapPinnedIcon,
  PackageIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersRoundIcon,
} from "lucide-react";

import {
  canAccessControlTower,
  canAccessCounterBooking,
  canAccessCounterSettlements,
  canAccessDispatchReliability,
  canAccessFleetTrips,
  canAccessOperations,
  canAccessOperationsAssignments,
  canAccessOperationsWorkforce,
  canAccessShipmentCases,
  canAccessShipmentExceptionQueue,
  canAccessShipmentList,
  canAccessSupportRequests,
  hasAnyPermission,
  hasAnyRole,
  hasPermission,
} from "@/lib/auth/access";
import type { CurrentUser } from "@/lib/auth/contracts";

export type NavigationItem = {
  href: string;
  label: string;
  permission?: string;
  permissionsAny?: string[];
  access?: (user: CurrentUser | null) => boolean;
};

export type NavigationGroup = {
  label: string;
  icon: typeof CircleGaugeIcon;
  items: NavigationItem[];
};

export type NavigationModule = {
  key: string;
  label: string;
  groups: NavigationGroup[];
};

const NETWORK = ["network.read", "network.manage"];
const PRICING = ["pricing.read", "pricing.manage"];

/** Accounts and roles are run by the system admin and the operations manager only. */
function canAccessSystem(user: CurrentUser | null) {
  return hasAnyRole(user, ["ADMIN", "OPERATIONS_MANAGER"]);
}

/** Module (top bar) → group (left column) → page (second column), the way field staff navigate. */
export const navigationModules: NavigationModule[] = [
  {
    key: "overview",
    label: "Tổng quan",
    groups: [
      { label: "Tổng quan", icon: CircleGaugeIcon, items: [{ href: "/dashboard", label: "Bảng điều hành" }] },
      {
        label: "Cá nhân",
        icon: CircleUserRoundIcon,
        items: [
          { href: "/notifications", label: "Thông báo" },
          { href: "/account", label: "Tài khoản của tôi" },
        ],
      },
    ],
  },
  {
    key: "operations",
    label: "Điều hành",
    groups: [
      {
        label: "Vận đơn",
        icon: PackageIcon,
        items: [
          { href: "/shipments", label: "Vận đơn", access: canAccessShipmentList },
          { href: "/shipments/cancelled", label: "Vận đơn đã huỷ", access: canAccessShipmentList },
          { href: "/shipments/tracking", label: "Tra hành trình", access: canAccessShipmentList },
          { href: "/control-tower", label: "Giám sát vận đơn", access: canAccessControlTower },
          { href: "/shipments/exceptions", label: "Duyệt ngoại lệ", access: canAccessShipmentExceptionQueue },
          { href: "/shipments/cases", label: "Hồ sơ sự cố", access: canAccessShipmentCases },
        ],
      },
      {
        label: "Quầy gửi hàng",
        icon: HandCoinsIcon,
        items: [
          { href: "/counter/new", label: "Gửi hàng tại quầy", access: canAccessCounterBooking },
          { href: "/counter/settlements", label: "Trả thu hộ tại quầy", access: canAccessCounterSettlements },
        ],
      },
      {
        label: "Điều phối",
        icon: ClipboardListIcon,
        items: [
          { href: "/operations", label: "Điều phối vận hành", access: canAccessOperations },
          { href: "/operations/assignments", label: "Phân công", access: canAccessOperationsAssignments },
          { href: "/operations/dispatch", label: "Hàng đợi sự kiện", access: canAccessDispatchReliability },
        ],
      },
      {
        label: "Vận chuyển",
        icon: TruckIcon,
        items: [
          { href: "/fleet", label: "Xe trung chuyển", access: canAccessFleetTrips },
        ],
      },
    ],
  },
  {
    key: "workforce",
    label: "Nhân sự & ca",
    groups: [
      {
        label: "Nhân sự",
        icon: UsersRoundIcon,
        items: [{ href: "/operations/workforce", label: "Nhân sự bưu cục", access: canAccessOperationsWorkforce }],
      },
      {
        label: "Ca làm",
        icon: CalendarClockIcon,
        items: [{ href: "/operations/shifts", label: "Ca làm việc", access: canAccessOperationsWorkforce }],
      },
    ],
  },
  {
    key: "master-data",
    label: "Dữ liệu cơ bản",
    groups: [
      {
        label: "Mạng lưới",
        icon: MapPinnedIcon,
        items: [
          { href: "/network", label: "Tổng quan mạng lưới", permissionsAny: NETWORK },
          { href: "/network/regions", label: "Vùng mạng lưới", permissionsAny: NETWORK },
          { href: "/network/hubs", label: "Điểm trung chuyển", permissionsAny: NETWORK },
          { href: "/network/service-areas", label: "Vùng phục vụ", permissionsAny: NETWORK },
          { href: "/network/routes", label: "Tuyến vận chuyển", permissionsAny: NETWORK },
          { href: "/network/route-planner", label: "Tìm tuyến", permissionsAny: NETWORK },
          { href: "/network/capacity", label: "Sức chứa", permissionsAny: NETWORK },
          { href: "/network/audit", label: "Nhật ký mạng lưới", permissionsAny: NETWORK },
        ],
      },
      {
        label: "Bảng giá",
        icon: CircleDollarSignIcon,
        items: [
          { href: "/pricing", label: "Tổng quan cước", permissionsAny: PRICING },
          { href: "/pricing/rate-plans", label: "Bảng giá", permissionsAny: PRICING },
          { href: "/pricing/simulator", label: "Tính thử cước", permissionsAny: PRICING },
          { href: "/pricing/audit", label: "Nhật ký giá", permissionsAny: PRICING },
        ],
      },
    ],
  },
  {
    key: "customers",
    label: "Khách hàng",
    groups: [
      {
        label: "Cửa hàng",
        icon: Building2Icon,
        items: [{ href: "/partners/merchants", label: "Cửa hàng", permission: "partners.merchants.read" }],
      },
      {
        label: "Hỗ trợ",
        icon: InboxIcon,
        items: [{ href: "/support", label: "Yêu cầu hỗ trợ", access: canAccessSupportRequests }],
      },
    ],
  },
  {
    key: "finance",
    label: "Tài chính",
    groups: [
      {
        label: "Tiền mặt",
        icon: LandmarkIcon,
        items: [{ href: "/finance/cash", label: "Duyệt tiền nộp", permission: "billing.cash.approve" }],
      },
      {
        label: "Đối soát",
        icon: ReceiptTextIcon,
        items: [
          { href: "/finance/settlements", label: "Đối soát cửa hàng", permission: "billing.manage" },
          { href: "/finance/invoices", label: "Hoá đơn", permission: "billing.manage" },
        ],
      },
    ],
  },
  {
    key: "system",
    label: "Hệ thống",
    groups: [
      {
        label: "Tài khoản",
        icon: ShieldCheckIcon,
        items: [
          { href: "/identity/users", label: "Tài khoản", permission: "identity.users.read", access: canAccessSystem },
          { href: "/identity/roles", label: "Vai trò & quyền", permission: "identity.roles.read", access: canAccessSystem },
        ],
      },
    ],
  },
];

export function permitted(item: NavigationItem, user: CurrentUser | null) {
  if (item.access && !item.access(user)) return false;
  if (item.permission && !hasPermission(user, item.permission)) return false;
  if (item.permissionsAny?.length && !hasAnyPermission(user, item.permissionsAny)) return false;
  return true;
}

/** Only the modules, groups and pages this user may open. */
export function visibleModules(user: CurrentUser | null): NavigationModule[] {
  return navigationModules
    .map((area) => ({
      ...area,
      groups: area.groups
        .map((group) => ({ ...group, items: group.items.filter((item) => permitted(item, user)) }))
        .filter((group) => group.items.length > 0),
    }))
    .filter((area) => area.groups.length > 0);
}

function normalizedPath(pathname: string) {
  if (pathname === "/network/coverage") return "/network/service-areas";
  if (pathname === "/network/lanes" || pathname === "/network/route-templates") return "/network/routes";
  return pathname;
}

export type NavigationLocation = {
  area: NavigationModule;
  group: NavigationGroup;
  item: NavigationItem;
};

/** The page a path belongs to: the longest matching href wins, so /shipments/cases beats /shipments. */
export function locate(modules: NavigationModule[], pathname: string): NavigationLocation | null {
  const path = normalizedPath(pathname);
  let best: NavigationLocation | null = null;
  for (const area of modules) {
    for (const group of area.groups) {
      for (const item of group.items) {
        const matches = path === item.href || path.startsWith(`${item.href}/`);
        if (matches && (!best || item.href.length > best.item.href.length)) best = { area, group, item };
      }
    }
  }
  return best;
}

export function isActiveHref(pathname: string, href: string, activeHref: string | undefined) {
  return activeHref === href || (!activeHref && normalizedPath(pathname) === href);
}
