import type {
  AccountStatus,
  Gender,
  PermissionItem,
  ProfileStatus,
  RoleItem,
  UserDetail,
  UserListItem,
} from "@/features/identity/contracts";

export type RoleOwnership = "IDENTITY" | "PARTNERS" | "PLATFORM";

export type RolePresentation = {
  name: string;
  description: string;
  ownership: RoleOwnership;
  ownershipLabel: string;
  assignableFromIdentity: boolean;
  note?: string;
};

const ROLE_PRESENTATION: Record<string, RolePresentation> = {
  ADMIN: {
    name: "Quản trị hệ thống",
    description: "Quản trị tài khoản, đối tác và cấu hình nền tảng.",
    ownership: "IDENTITY",
    ownershipLabel: "Identity quản lý",
    assignableFromIdentity: true,
    note: "Quyền rất cao. Backend bảo vệ ADMIN đang hoạt động cuối cùng.",
  },
  OPERATIONS_MANAGER: {
    name: "Quản lý vận hành",
    description: "Điều phối nhân sự, công việc và hoạt động logistics.",
    ownership: "IDENTITY",
    ownershipLabel: "Identity quản lý",
    assignableFromIdentity: true,
  },
  HUB_MANAGER: {
    name: "Quản lý bưu cục",
    description: "Quản lý hoạt động và nhân sự tại bưu cục được giao.",
    ownership: "IDENTITY",
    ownershipLabel: "Identity quản lý",
    assignableFromIdentity: true,
  },
  WAREHOUSE_STAFF: {
    name: "Nhân viên kho",
    description: "Quét, tiếp nhận và xử lý kiện hàng tại bưu cục.",
    ownership: "IDENTITY",
    ownershipLabel: "Identity quản lý",
    assignableFromIdentity: true,
  },
  DRIVER: {
    name: "Nhân viên giao nhận",
    description: "Nhận và thực hiện công việc lấy, vận chuyển, giao hàng.",
    ownership: "IDENTITY",
    ownershipLabel: "Identity quản lý",
    assignableFromIdentity: true,
  },
  MERCHANT: {
    name: "Đối tác gửi hàng",
    description: "Quyền nghiệp vụ gửi hàng của Merchant đã được xét duyệt.",
    ownership: "PARTNERS",
    ownershipLabel: "Partners đồng bộ",
    assignableFromIdentity: false,
    note: "Không gán/gỡ thủ công tại Identity UI. Role này phải theo trạng thái Merchant qua Partners outbox.",
  },
  CUSTOMER: {
    name: "Khách hàng",
    description: "Vai trò nền cho tài khoản khách hàng Pavex.",
    ownership: "PLATFORM",
    ownershipLabel: "Vai trò nền",
    assignableFromIdentity: true,
    note: "Identity tự gán CUSTOMER cho tài khoản self-service. Admin vẫn có thể dùng vai trò này khi tạo user hỗ trợ.",
  },
};

export const accountLabels: Record<AccountStatus, string> = {
  ACTIVE: "Hoạt động",
  SUSPENDED: "Tạm khóa",
  DISABLED: "Vô hiệu hóa",
};

export const profileLabels: Record<ProfileStatus, string> = {
  COMPLETED: "Đã hoàn tất",
  INCOMPLETE: "Chưa hoàn tất",
  PENDING_VERIFICATION: "Chờ xác minh",
  REJECTED: "Bị từ chối",
};

export const genderLabels: Record<Gender, string> = {
  UNSPECIFIED: "Chưa xác định",
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

export const permissionLabels: Record<string, string> = {
  "tracking.read-own": "Theo dõi vận đơn của mình",
  "support.create": "Tạo yêu cầu hỗ trợ",
  "shipments.read": "Xem vận đơn",
  "shipments.create": "Tạo vận đơn",
  "shipments.update-own": "Sửa vận đơn của mình trước khi lấy hàng",
  "shipments.cancel-own": "Hủy vận đơn của mình",
  "shipments.exceptions.manage": "Xử lý ngoại lệ vận đơn",
  "shipments.weight.adjust": "Điều chỉnh trọng lượng kiện",
  "shipments.cases.manage": "Quản lý hồ sơ sự cố kiện hàng",
  "shipments.control-tower.read": "Theo dõi cảnh báo vận đơn",
  "assignments.read-own": "Xem công việc được giao",
  "assignments.accept-own": "Nhận công việc được giao",
  "assignments.execute-own": "Thực hiện công việc được giao",
  "deliveries.complete-own": "Hoàn tất giao hàng",
  "locations.update-own": "Cập nhật vị trí của mình",
  "quotes.create": "Tạo báo giá vận chuyển",
  "billing.invoices.read-own": "Xem hóa đơn của mình",
  "billing.invoices.pay-own": "Thanh toán hóa đơn của mình",
  "billing.manage": "Quản lý hóa đơn và thanh toán",
  "billing.cash.collect": "Thu tiền mặt",
  "billing.cash.submit-own": "Nộp tiền thu hộ của mình",
  "billing.cash.read-hub": "Theo dõi tiền mặt tại bưu cục",
  "billing.cash.approve": "Duyệt hoặc từ chối bàn giao tiền",
  "call-monitoring.read": "Xem lịch sử cuộc gọi",
  "call-monitoring.manage": "Quản lý và đánh giá cuộc gọi",
  "call-monitoring.reports.read": "Xem báo cáo cuộc gọi",
  "network.read": "Xem cấu hình mạng lưới",
  "network.manage": "Quản lý mạng lưới bưu cục và tuyến",
  "operations.workforce.manage": "Quản lý nhân sự vận hành",
  "operations.assignments.manage": "Điều phối công việc",
  "operations.hub.manage": "Quản lý vận hành tại bưu cục được giao",
  "scans.create": "Quét kiện hàng",
  "identity.users.read": "Xem danh sách tài khoản",
  "identity.users.manage-profile": "Chỉnh sửa hồ sơ tài khoản",
  "identity.roles.read": "Xem vai trò và quyền",
  "identity.users.create": "Tạo tài khoản",
  "identity.users.invite": "Mời người dùng",
  "identity.roles.assign": "Gán vai trò cho tài khoản",
  "identity.users.manage-status": "Khóa hoặc kích hoạt tài khoản",
  "partners.merchants.manage-own": "Quản lý hồ sơ doanh nghiệp của mình",
  "partners.merchants.read": "Xem danh sách đối tác",
  "partners.merchants.manage-status": "Duyệt và quản lý trạng thái đối tác",
};

export const permissionGroups = [
  { id: "identity", label: "Tài khoản & phân quyền", prefixes: ["identity."] },
  { id: "partners", label: "Đối tác", prefixes: ["partners."] },
  {
    id: "shipments",
    label: "Vận đơn & báo giá",
    prefixes: ["shipments.", "tracking.", "quotes."],
  },
  {
    id: "operations",
    label: "Vận hành",
    prefixes: [
      "operations.",
      "assignments.",
      "deliveries.",
      "locations.",
      "scans.",
    ],
  },
  { id: "network", label: "Mạng lưới", prefixes: ["network."] },
  { id: "billing", label: "Tài chính", prefixes: ["billing."] },
  {
    id: "support",
    label: "Chăm sóc khách hàng",
    prefixes: ["call-monitoring.", "support."],
  },
] as const;

export function rolePresentation(roleCode: string, fallback?: Partial<RoleItem>) {
  return (
    ROLE_PRESENTATION[roleCode] ?? {
      name: fallback?.name ?? roleCode,
      description: fallback?.description ?? "Vai trò được khai báo trong Identity.",
      ownership: "IDENTITY" as const,
      ownershipLabel: "Identity quản lý",
      assignableFromIdentity: true,
    }
  );
}

export function roleLabel(roleCode: string) {
  return rolePresentation(roleCode).name;
}

export function isIdentityAssignableRole(roleCode: string) {
  return rolePresentation(roleCode).assignableFromIdentity;
}

export function displayUserName(user: UserListItem | UserDetail) {
  return (
    user.displayName ??
    (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email)
  );
}

export function initialsOf(user: UserListItem | UserDetail) {
  const source = displayUserName(user).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || "U";
}

export function isMerchantIdentityEligible(user: UserDetail) {
  return (
    user.status === "ACTIVE" &&
    user.emailVerified &&
    user.profileStatus === "COMPLETED"
  );
}

export function groupPermissionCodes(codes: string[]) {
  const items: PermissionItem[] = codes.map((code) => ({
    id: code,
    code,
    name: permissionLabels[code] ?? code,
    description: null,
  }));
  return groupPermissions(items);
}

export function groupPermissions(items: PermissionItem[]) {
  const known = new Set<string>();
  const groups = permissionGroups
    .map((group) => {
      const permissions = items.filter((permission) => {
        const belongs = group.prefixes.some((prefix) =>
          permission.code.startsWith(prefix),
        );
        if (belongs) known.add(permission.code);
        return belongs;
      });
      return { id: group.id, label: group.label, permissions };
    })
    .filter((group) => group.permissions.length > 0);

  const other = items.filter((permission) => !known.has(permission.code));
  return other.length
    ? [...groups, { id: "other", label: "Quyền khác", permissions: other }]
    : groups;
}
