import type {
  WorkforceAuditAction,
  WorkforceAvailabilityStatus,
  WorkforceMemberKind,
  WorkforceMemberStatus,
} from "@/features/operations/contracts";

export function workforceKindLabel(kind: WorkforceMemberKind) {
  switch (kind) {
    case "COURIER":
      return "Nhân viên giao nhận";
    case "WAREHOUSE_OPERATOR":
      return "Nhân viên kho";
    case "DISPATCHER":
      return "Điều phối viên";
    case "LINE_HAUL_DRIVER":
      return "Tài xế liên tỉnh";
  }
}

export function workforceStatusLabel(status: WorkforceMemberStatus) {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "SUSPENDED":
      return "Tạm ngưng";
    case "OFFBOARDED":
      return "Đã nghỉ";
  }
}

export function availabilityLabel(status: WorkforceAvailabilityStatus) {
  switch (status) {
    case "AVAILABLE":
      return "Sẵn sàng";
    case "UNAVAILABLE":
      return "Không sẵn sàng";
    case "OFF_DUTY":
      return "Ngoài ca";
  }
}

export function workforceAuditLabel(action: WorkforceAuditAction) {
  switch (action) {
    case "MEMBER_CREATED":
      return "Tạo workforce";
    case "STATUS_CHANGED":
      return "Đổi trạng thái";
    case "HUB_ASSIGNED":
      return "Gán bưu cục";
    case "HUB_UNASSIGNED":
      return "Gỡ bưu cục";
    case "CAPACITY_CHANGED":
      return "Đổi sức chứa";
  }
}

export function workforceIdentityName(input: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  return (
    input.displayName?.trim() ||
    [input.firstName, input.lastName].filter(Boolean).join(" ").trim() ||
    input.email ||
    "Chưa có hồ sơ Identity"
  );
}
