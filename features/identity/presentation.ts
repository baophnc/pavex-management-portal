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
  assignmentSummary: string;
  note?: string;
};

const ROLE_PRESENTATION: Record<string, RolePresentation> = {
  ADMIN: {
    name: "Quản trị hệ thống",
    description:
      "Quản trị tài khoản, phân quyền, đối tác và các cấu hình dùng chung của nền tảng.",
    ownership: "IDENTITY",
    ownershipLabel: "Quản trị viên cấp",
    assignableFromIdentity: true,
    assignmentSummary:
      "Người có quyền phân vai có thể gán trực tiếp cho tài khoản nội bộ phù hợp.",
    note: "Đây là vai trò có quyền rất cao. Hệ thống bảo vệ quản trị viên đang hoạt động cuối cùng để tránh mất quyền quản trị.",
  },
  OPERATIONS_MANAGER: {
    name: "Quản lý vận hành",
    description:
      "Điều phối mạng lưới, nhân sự và các công việc vận hành trên phạm vi rộng.",
    ownership: "IDENTITY",
    ownershipLabel: "Quản trị viên cấp",
    assignableFromIdentity: true,
    assignmentSummary:
      "Người có quyền phân vai có thể gán trực tiếp cho nhân sự quản lý vận hành.",
  },
  HUB_MANAGER: {
    name: "Quản lý bưu cục",
    description:
      "Quản lý hoạt động, dòng tiền và công việc tại bưu cục được phân công.",
    ownership: "IDENTITY",
    ownershipLabel: "Quản trị viên cấp",
    assignableFromIdentity: true,
    assignmentSummary:
      "Người có quyền phân vai có thể gán trực tiếp cho người phụ trách bưu cục.",
  },
  WAREHOUSE_STAFF: {
    name: "Nhân viên kho",
    description:
      "Tiếp nhận, quét và xử lý kiện hàng cùng các công việc kho tại bưu cục.",
    ownership: "IDENTITY",
    ownershipLabel: "Quản trị viên cấp",
    assignableFromIdentity: true,
    assignmentSummary:
      "Người có quyền phân vai có thể gán trực tiếp cho nhân viên kho.",
  },
  DRIVER: {
    name: "Nhân viên giao nhận",
    description:
      "Nhận công việc lấy hàng, vận chuyển, giao hàng và cập nhật vị trí khi làm nhiệm vụ.",
    ownership: "IDENTITY",
    ownershipLabel: "Quản trị viên cấp",
    assignableFromIdentity: true,
    assignmentSummary:
      "Người có quyền phân vai có thể gán trực tiếp cho nhân viên giao nhận.",
  },
  MERCHANT: {
    name: "Đối tác gửi hàng",
    description:
      "Tạo và quản lý vận đơn của doanh nghiệp sau khi hồ sơ đối tác được duyệt.",
    ownership: "PARTNERS",
    ownershipLabel: "Đồng bộ theo trạng thái đối tác",
    assignableFromIdentity: false,
    assignmentSummary:
      "Hệ thống tự cấp hoặc thu hồi theo trạng thái duyệt của hồ sơ đối tác gửi hàng.",
    note: "Không gán hoặc gỡ thủ công vai trò này tại màn tài khoản để tránh lệch trạng thái giữa tài khoản và hồ sơ đối tác.",
  },
  CUSTOMER: {
    name: "Khách hàng",
    description:
      "Theo dõi vận đơn liên quan và sử dụng các chức năng hỗ trợ dành cho khách hàng.",
    ownership: "PLATFORM",
    ownershipLabel: "Vai trò nền của khách hàng",
    assignableFromIdentity: true,
    assignmentSummary:
      "Hệ thống tự gán cho tài khoản khách hàng; quản trị viên vẫn có thể chọn khi tạo tài khoản hỗ trợ.",
    note: "Đây là vai trò nền cho tài khoản khách hàng đăng ký trực tiếp trên hệ thống.",
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
  "shipments.weight.adjust": "Điều chỉnh khối lượng kiện hàng",
  "shipments.cases.manage": "Quản lý hồ sơ sự cố vận đơn",
  "shipments.control-tower.read": "Theo dõi cảnh báo vận đơn",
  "shipments.admin.read": "Tra cứu toàn bộ vận đơn phục vụ quản trị",
  "shipments.admin.manage": "Thực hiện nghiệp vụ quản trị vận đơn",
  "assignments.read-own": "Xem công việc được giao",
  "assignments.accept-own": "Nhận công việc được giao",
  "assignments.execute-own": "Thực hiện công việc được giao",
  "deliveries.complete-own": "Hoàn tất công việc giao hàng",
  "locations.update-own": "Cập nhật vị trí khi làm nhiệm vụ",
  "quotes.create": "Tính cước cho vận đơn",
  "billing.invoices.read-own": "Xem hóa đơn của mình",
  "billing.invoices.pay-own": "Thanh toán hóa đơn của mình",
  "billing.manage": "Quản lý hóa đơn và thanh toán",
  "billing.cash.collect": "Thu tiền mặt",
  "billing.cash.submit-own": "Nộp tiền đã thu của mình",
  "billing.cash.read-hub": "Theo dõi tiền mặt tại bưu cục",
  "billing.cash.approve": "Duyệt hoặc từ chối bàn giao tiền",
  "call-monitoring.read": "Xem lịch sử cuộc gọi",
  "call-monitoring.manage": "Quản lý và đánh giá cuộc gọi",
  "call-monitoring.reports.read": "Xem báo cáo cuộc gọi",
  "network.read": "Xem cấu hình mạng lưới",
  "network.manage": "Quản lý bưu cục, vùng và tuyến vận chuyển",
  "pricing.read": "Xem bảng giá và quy tắc tính cước",
  "pricing.manage": "Quản lý bảng giá và quy tắc tính cước",
  "operations.workforce.manage": "Quản lý nhân sự vận hành",
  "operations.assignments.manage": "Điều phối công việc vận hành",
  "operations.hub.manage": "Quản lý hoạt động tại bưu cục được giao",
  "scans.create": "Quét và ghi nhận kiện hàng",
  "identity.users.read": "Xem danh sách tài khoản",
  "identity.users.manage-profile": "Chỉnh sửa hồ sơ tài khoản",
  "identity.roles.read": "Xem vai trò và quyền hạn",
  "identity.users.create": "Tạo tài khoản",
  "identity.users.invite": "Gửi lời mời kích hoạt tài khoản",
  "identity.roles.assign": "Phân vai cho tài khoản",
  "identity.users.manage-status": "Khóa hoặc kích hoạt tài khoản",
  "partners.merchants.manage-own": "Quản lý hồ sơ đối tác của mình",
  "partners.merchants.read": "Xem danh sách đối tác gửi hàng",
  "partners.merchants.manage-status": "Duyệt và quản lý trạng thái đối tác",
};

export const permissionGroups = [
  { id: "identity", label: "Tài khoản & phân quyền", prefixes: ["identity."] },
  { id: "partners", label: "Đối tác gửi hàng", prefixes: ["partners."] },
  {
    id: "shipments",
    label: "Vận đơn & tính cước",
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
  { id: "pricing", label: "Bảng giá & cước", prefixes: ["pricing."] },
  { id: "billing", label: "Tài chính", prefixes: ["billing."] },
  {
    id: "support",
    label: "Chăm sóc khách hàng",
    prefixes: ["call-monitoring.", "support."],
  },
] as const;

export function rolePresentation(roleCode: string, fallback?: Partial<RoleItem>) {
  const fallbackName =
    fallback?.isSystem === false ? "Vai trò tùy chỉnh" : "Vai trò hệ thống";

  return (
    ROLE_PRESENTATION[roleCode] ?? {
      name: fallbackName,
      description:
        "Vai trò được hệ thống khai báo để cấp một nhóm quyền cho tài khoản.",
      ownership: "IDENTITY" as const,
      ownershipLabel: "Quản trị viên cấp",
      assignableFromIdentity: true,
      assignmentSummary:
        "Người có quyền phân vai có thể gán trực tiếp cho tài khoản phù hợp.",
    }
  );
}

export function roleLabel(roleCode: string) {
  return rolePresentation(roleCode).name;
}

export function isIdentityAssignableRole(roleCode: string) {
  return rolePresentation(roleCode).assignableFromIdentity;
}

export function permissionLabel(code: string) {
  return permissionLabels[code] ?? genericPermissionLabel(code);
}

function genericPermissionLabel(code: string) {
  const domain = code.split(".")[0] ?? "";
  const domainLabel: Record<string, string> = {
    identity: "Tài khoản",
    partners: "Đối tác",
    shipments: "Vận đơn",
    tracking: "Theo dõi vận đơn",
    quotes: "Tính cước",
    assignments: "Công việc",
    deliveries: "Giao hàng",
    locations: "Vị trí",
    scans: "Quét kiện hàng",
    network: "Mạng lưới",
    pricing: "Bảng giá",
    billing: "Tài chính",
    operations: "Vận hành",
    support: "Hỗ trợ",
    "call-monitoring": "Cuộc gọi",
  };

  if (code.endsWith(".read") || code.endsWith(".read-own")) {
    return `Xem ${domainLabel[domain] ?? "dữ liệu hệ thống"}`;
  }
  if (code.endsWith(".create")) {
    return `Tạo ${domainLabel[domain] ?? "dữ liệu hệ thống"}`;
  }
  if (code.endsWith(".manage")) {
    return `Quản lý ${domainLabel[domain] ?? "dữ liệu hệ thống"}`;
  }
  return `Quyền ${domainLabel[domain] ?? "hệ thống"}`;
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
    name: permissionLabel(code),
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
