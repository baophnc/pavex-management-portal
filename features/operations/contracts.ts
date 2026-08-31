export type WorkforceMemberKind =
  | "COURIER"
  | "WAREHOUSE_OPERATOR"
  | "DISPATCHER"
  | "LINE_HAUL_DRIVER";

export type WorkforceMemberStatus = "ACTIVE" | "SUSPENDED" | "OFFBOARDED";
export type WorkforceAvailabilityStatus = "OFF_DUTY" | "AVAILABLE" | "UNAVAILABLE";
export type WorkforceAuditAction =
  | "MEMBER_CREATED"
  | "STATUS_CHANGED"
  | "HUB_ASSIGNED"
  | "HUB_UNASSIGNED"
  | "CAPACITY_CHANGED";

export type WorkforceIdentity = {
  userId: string;
  email: string;
  emailVerified: boolean;
  accountStatus: string;
  profileStatus: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type WorkforceAvailability = {
  status: WorkforceAvailabilityStatus;
  maxConcurrentAssignments: number;
  activeAssignments: number;
  remainingCapacity: number;
  updatedAt: string;
};

export type WorkforceHubMembership = {
  id: string;
  hubId: string;
  hubCode: string | null;
  hubName: string | null;
  hubType: string | null;
  hubStatus: string | null;
  addressLine: string | null;
  provinceCode: string | null;
  wardCode: string | null;
  parentHubId: string | null;
  isPrimary: boolean;
  isActive: boolean;
  assignedAt: string;
  unassignedAt: string | null;
  updatedAt: string;
};

export type WorkforceMember = {
  id: string;
  userId: string;
  employeeCode: string;
  kind: WorkforceMemberKind;
  status: WorkforceMemberStatus;
  identity: WorkforceIdentity | null;
  identityAccessValid: boolean;
  availability: WorkforceAvailability | null;
  hubMemberships: WorkforceHubMembership[];
  createdAt: string;
  updatedAt: string;
};

export type WorkforcePage = {
  items: WorkforceMember[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type WorkforceAudit = {
  id: string;
  workforceMemberId: string;
  hubId: string | null;
  actorUserId: string;
  action: WorkforceAuditAction;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  occurredAt: string;
};

export type CreateWorkforceMemberInput = {
  userId: string;
  kind: WorkforceMemberKind;
};

export type SetWorkforceStatusInput = {
  status: WorkforceMemberStatus;
  reason?: string | null;
};

export type SetWorkforceCapacityInput = {
  maxConcurrentAssignments: number;
  reason?: string | null;
};

export type AssignWorkforceHubInput = {
  hubId: string;
  isPrimary: boolean;
  reason?: string | null;
};

export const workforceKinds: WorkforceMemberKind[] = [
  "COURIER",
  "WAREHOUSE_OPERATOR",
  "DISPATCHER",
  "LINE_HAUL_DRIVER",
];

export const workforceStatuses: WorkforceMemberStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "OFFBOARDED",
];

export type WorkShiftStatus = "SCHEDULED" | "CANCELLED";
export type WorkforceShiftAssignmentStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "ABSENT"
  | "CANCELLED";

export type WorkShift = {
  id: string;
  hubId: string;
  hubCode: string | null;
  hubName: string | null;
  code: string;
  name: string;
  startsAt: string;
  endsAt: string;
  status: WorkShiftStatus;
  rosterCount: number;
  createdByUserId: string;
  cancelledByUserId: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkforceShiftAssignment = {
  id: string;
  shiftId: string;
  workforceMemberId: string;
  employeeCode: string;
  kind: WorkforceMemberKind;
  status: WorkforceShiftAssignmentStatus;
  assignedByUserId: string;
  statusChangedByUserId: string;
  assignedAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  markedAbsentAt: string | null;
  cancelledAt: string | null;
  note: string | null;
  updatedAt: string;
};

export type WorkShiftDetail = {
  shift: WorkShift;
  roster: WorkforceShiftAssignment[];
};

export type WorkShiftPage = {
  items: WorkShift[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type CreateWorkShiftInput = {
  hubId: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export type UpdateWorkShiftInput = {
  name: string;
  startsAt: string;
  endsAt: string;
};
