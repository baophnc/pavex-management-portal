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
      return "Tạo hồ sơ nhân sự";
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

export function workShiftStatusLabel(status: import("@/features/operations/contracts").WorkShiftStatus) {
  switch (status) {
    case "SCHEDULED":
      return "Đã lên lịch";
    case "CANCELLED":
      return "Đã hủy";
  }
}

export function workforceShiftStatusLabel(
  status: import("@/features/operations/contracts").WorkforceShiftAssignmentStatus,
) {
  switch (status) {
    case "SCHEDULED":
      return "Đã xếp ca";
    case "CHECKED_IN":
      return "Đã vào ca";
    case "CHECKED_OUT":
      return "Đã kết ca";
    case "ABSENT":
      return "Vắng mặt";
    case "CANCELLED":
      return "Đã gỡ khỏi ca";
  }
}

export function operationalAssignmentTypeLabel(
  type: import("@/features/operations/contracts").OperationalAssignmentType,
) {
  switch (type) {
    case "PICKUP":
      return "Lấy hàng";
    case "ORIGIN_HUB_HANDLING":
      return "Xử lý tại bưu cục gửi";
    case "LINE_HAUL":
      return "Vận chuyển giữa các bưu cục";
    case "TRANSIT_HUB_HANDLING":
      return "Xử lý tại bưu cục trung chuyển";
    case "DESTINATION_HUB_HANDLING":
      return "Xử lý tại bưu cục phát";
    case "LAST_MILE_DELIVERY":
      return "Giao chặng cuối";
  }
}

export function operationalAssignmentStatusLabel(
  status: import("@/features/operations/contracts").OperationalAssignmentStatus,
) {
  switch (status) {
    case "BLOCKED":
      return "Chờ chặng trước";
    case "READY":
      return "Sẵn sàng phân công";
    case "PENDING":
      return "Chờ phân công";
    case "ASSIGNED":
      return "Đã phân công";
    case "ACCEPTED":
      return "Đã nhận việc";
    case "REJECTED":
      return "Bị từ chối";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
  }
}

export function operationalAssignmentEventLabel(
  type: import("@/features/operations/contracts").OperationalAssignmentEventType,
) {
  switch (type) {
    case "PLANNED":
      return "Đã lập kế hoạch";
    case "ASSIGNED":
      return "Đã phân công";
    case "REASSIGNED":
      return "Đã phân công lại";
    case "ACCEPTED":
      return "Nhân viên nhận việc";
    case "REJECTED":
      return "Nhân viên từ chối";
    case "STARTED":
      return "Bắt đầu thực hiện";
    case "COMPLETED":
      return "Hoàn tất";
    case "CANCELLED":
      return "Đã hủy";
    case "REQUEUED":
      return "Đưa lại hàng đợi";
  }
}
