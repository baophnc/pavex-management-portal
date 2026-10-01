import type {
  AccountStatus,
  Gender,
  PermissionItem,
  ProfileStatus,
  RoleItem,
  UserDetail,
  UserListItem,
} from "@/features/identity/contracts";

export type RoleOwnership = "IDENTITY" | "PARTNERS" | "OPERATIONS" | "PLATFORM";

export type RolePresentation = {
  name: string;
  description: string;
  ownership: RoleOwnership;
  ownershipLabel: string;
  assignableFromIdentity: boolean;
  assignmentSummary: string;
  note?: string;
};

const headOffice = (name: string, description: string, note?: string): RolePresentation => ({
  name,
  description,
  ownership: "IDENTITY",
  ownershipLabel: "Trụ sở · xem toàn quốc",
  assignableFromIdentity: true,
  assignmentSummary: "Quản trị hệ thống gán trực tiếp cho nhân viên trụ sở tại màn tài khoản.",
  note,
});

const hubWorkforce = (name: string, description: string): RolePresentation => ({
  name,
  description,
  ownership: "OPERATIONS",
  ownershipLabel: "Bưu cục · chỉ bưu cục được phân công",
  assignableFromIdentity: false,
  assignmentSummary: "Cấp khi thêm nhân viên ở mục Nhân sự, cùng lúc với bưu cục làm việc.",
  note: "Không gán thủ công tại màn tài khoản: vai trò này luôn đi kèm bưu cục được phân công.",
});

const ROLE_PRESENTATION: Record<string, RolePresentation> = {
  ADMIN: headOffice(
    "Quản trị hệ thống",
    "Toàn quyền trên hệ thống, gồm cấp tài khoản và phân vai trò.",
    "Vai trò có quyền cao nhất. Hệ thống luôn giữ lại ít nhất một quản trị viên đang hoạt động.",
  ),
  OPERATIONS_MANAGER: headOffice(
    "Quản lý vận hành",
    "Theo dõi vận đơn, xử lý sự cố, quản lý nhân sự và mạng lưới bưu cục trên toàn quốc.",
  ),
  COMMERCIAL_MANAGER: headOffice(
    "Kinh doanh & CSKH",
    "Duyệt cửa hàng, quản lý bảng giá và xử lý khiếu nại của khách hàng trên toàn quốc.",
  ),
  FINANCE_ACCOUNTANT: headOffice(
    "Kế toán",
    "Duyệt tiền bưu tá nộp, đối soát với cửa hàng và quản lý hóa đơn trên toàn quốc.",
  ),
  HUB_MANAGER: hubWorkforce(
    "Trưởng bưu cục",
    "Điều phối lấy/giao hàng, quản lý nhân viên, vận đơn và tiền thu hộ của bưu cục mình.",
  ),
  WAREHOUSE_OPERATOR: hubWorkforce(
    "Nhân viên bưu cục",
    "Quét nhập/xuất kho và nhận tiền bưu tá nộp tại bưu cục mình.",
  ),
  COURIER: hubWorkforce(
    "Bưu tá",
    "Lấy hàng, giao hàng, thu tiền người nhận và nộp tiền về bưu cục.",
  ),
  LINE_HAUL_DRIVER: hubWorkforce(
    "Tài xế trung chuyển",
    "Chạy các chuyến chở hàng giữa bưu cục và kho được giao.",
  ),
  MERCHANT: {
    name: "Cửa hàng",
    description: "Tạo và theo dõi vận đơn, hóa đơn và đối soát của cửa hàng mình.",
    ownership: "PARTNERS",
    ownershipLabel: "Tự cấp khi hồ sơ cửa hàng được duyệt",
    assignableFromIdentity: false,
    assignmentSummary: "Hệ thống tự cấp hoặc thu hồi theo trạng thái duyệt hồ sơ cửa hàng.",
    note: "Không gán hoặc gỡ thủ công để tránh lệch với trạng thái hồ sơ cửa hàng.",
  },
  CUSTOMER: {
    name: "Khách cá nhân",
    description: "Tài khoản khách hàng mặc định khi tự đăng ký.",
    ownership: "PLATFORM",
    ownershipLabel: "Vai trò mặc định",
    assignableFromIdentity: true,
    assignmentSummary: "Hệ thống tự gán khi khách hàng tự đăng ký tài khoản.",
  },
};

export const accountLabels: Record<AccountStatus, string> = {
  ACTIVE: "Hoạt động",
  SUSPENDED: "Tạm khóa",
  DISABLED: "Vô hiệu hóa",
  DELETED: "Đã xoá",
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
  "scope.all-hubs": "Xem dữ liệu toàn quốc (mọi bưu cục)",
  "shipments.read-own": "Xem vận đơn của mình",
  "shipments.create": "Tạo vận đơn",
  "shipments.cancel-own": "Hủy vận đơn của mình",
  "shipments.read-hub": "Xem vận đơn trong phạm vi bưu cục",
  "shipments.exceptions.read": "Xem ngoại lệ vận đơn trong phạm vi",
  "shipments.exceptions.manage": "Xử lý ngoại lệ vận đơn",
  "shipments.weight.adjust": "Điều chỉnh khối lượng kiện hàng",
  "shipments.cases.read": "Xem hồ sơ sự cố vận đơn",
  "shipments.cases.manage": "Quản lý hồ sơ sự cố vận đơn",
  "shipments.control-tower.read": "Theo dõi cảnh báo vận đơn",
  "shipments.admin.read": "Tra cứu vận đơn phục vụ quản trị",
  "shipments.read-assigned": "Xem vận đơn được giao",
  "assignments.read-own": "Xem công việc được giao",
  "assignments.accept-own": "Nhận công việc được giao",
  "assignments.execute-own": "Thực hiện công việc được giao",
  "deliveries.complete-own": "Hoàn tất công việc giao hàng",
  "billing.invoices.read-own": "Xem hóa đơn của mình",
  "billing.invoices.pay-own": "Thanh toán hóa đơn của mình",
  "billing.manage": "Quản lý hóa đơn và thanh toán",
  "billing.cash.collect": "Thu tiền mặt",
  "billing.cash.submit-own": "Nộp tiền đã thu của mình",
  "billing.cash.read-hub": "Theo dõi tiền mặt tại bưu cục",
  "billing.cash.approve": "Duyệt hoặc từ chối bàn giao tiền",
  "network.read": "Xem cấu hình mạng lưới",
  "network.manage": "Quản lý bưu cục, vùng và tuyến vận chuyển",
  "pricing.read": "Xem bảng giá và quy tắc tính cước",
  "pricing.manage": "Quản lý bảng giá và quy tắc tính cước",
  "operations.workforce.read": "Xem nhân sự vận hành trong phạm vi",
  "operations.workforce.manage": "Quản lý nhân sự vận hành",
  "operations.assignments.read": "Xem công việc vận hành trong phạm vi",
  "operations.assignments.manage": "Điều phối công việc vận hành",
  "operations.dispatch.manage": "Phân công công việc tại bưu cục",
  "operations.hub.read": "Xem hoạt động tại bưu cục được giao",
  "operations.hub.manage": "Quản lý hoạt động tại bưu cục được giao",
  "scans.create": "Quét và ghi nhận kiện hàng",
  "identity.users.read": "Xem danh sách tài khoản",
  "identity.users.manage-profile": "Chỉnh sửa hồ sơ tài khoản",
  "identity.roles.read": "Xem vai trò và quyền hạn",
  "identity.roles.manage": "Tạo và quản lý vai trò tùy chỉnh",
  "identity.users.create": "Tạo tài khoản",
  "identity.users.invite": "Gửi lời mời kích hoạt tài khoản",
  "identity.roles.assign": "Phân vai cho tài khoản",
  "identity.users.manage-status": "Khóa hoặc kích hoạt tài khoản",
  "partners.merchants.manage-own": "Quản lý hồ sơ đối tác của mình",
  "partners.merchants.read": "Xem danh sách đối tác gửi hàng",
  "partners.merchants.manage-status": "Duyệt và quản lý trạng thái đối tác",
};

export const permissionGroups = [
  { id: "scope", label: "Phạm vi dữ liệu", prefixes: ["scope."] },
  { id: "identity", label: "Tài khoản & phân quyền", prefixes: ["identity."] },
  { id: "partners", label: "Đối tác gửi hàng", prefixes: ["partners."] },
  {
    id: "shipments",
    label: "Vận đơn & tính cước",
    prefixes: ["shipments."],
  },
  {
    id: "operations",
    label: "Vận hành",
    prefixes: [
      "operations.",
      "assignments.",
      "deliveries.",
      "scans.",
    ],
  },
  { id: "network", label: "Mạng lưới", prefixes: ["network."] },
  { id: "pricing", label: "Bảng giá & cước", prefixes: ["pricing."] },
  { id: "billing", label: "Tài chính", prefixes: ["billing."] },
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
    assignments: "Công việc",
    deliveries: "Giao hàng",
    scans: "Quét kiện hàng",
    network: "Mạng lưới",
    pricing: "Bảng giá",
    billing: "Tài chính",
    operations: "Vận hành",
    scope: "Phạm vi dữ liệu",
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
