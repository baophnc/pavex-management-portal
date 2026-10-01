export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED" | "DELETED";
export type ProfileStatus =
  | "INCOMPLETE"
  | "COMPLETED"
  | "PENDING_VERIFICATION"
  | "REJECTED";

export type PermissionItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};
export type RoleItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionItem[];
};

export type UserListItem = {
  userId: string;
  email: string;
  emailVerified: boolean;
  status: AccountStatus;
  profileStatus: ProfileStatus;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  profileCreatedAt: string | null;
  profileUpdatedAt: string | null;
};

export type UserPage = {
  items: UserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/** Statuses an administrator can set; deleting is a separate action. */
export const accountStatuses: AccountStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
];
/** Statuses the account list can be filtered by; deleted accounts only show when asked for. */
export const accountStatusFilters: AccountStatus[] = [...accountStatuses, "DELETED"];
export const profileStatuses: ProfileStatus[] = [
  "INCOMPLETE",
  "COMPLETED",
  "PENDING_VERIFICATION",
  "REJECTED",
];

export type Gender = "UNSPECIFIED" | "MALE" | "FEMALE" | "OTHER";

export type CreateUserResponse = {
  userId: string;
};

export type UserDetail = UserListItem & {
  permissions: string[];
  /** Set once the account is deleted: when, and the email it had then. */
  deletedAt?: string | null;
  deletedEmail?: string | null;
};

export const genders: Gender[] = ["UNSPECIFIED", "MALE", "FEMALE", "OTHER"];
