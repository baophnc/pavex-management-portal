export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DISABLED";
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

export const accountStatuses: AccountStatus[] = [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
];
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
};

export const genders: Gender[] = ["UNSPECIFIED", "MALE", "FEMALE", "OTHER"];
