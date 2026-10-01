import type {
  AccountStatus,
  CreateUserResponse,
  Gender,
  PermissionItem,
  ProfileStatus,
  RoleItem,
  UserDetail,
  UserPage,
} from "@/features/identity/contracts";
import { apiRequest } from "@/lib/api/client";

export type UserSearchParams = {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: AccountStatus | "";
  profileStatus?: ProfileStatus | "";
};

export type CreateUserInput = {
  email: string;
  roleCode: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  gender: Gender;
  dateOfBirth: string | null;
  avatarUrl: string | null;
};

export type UpdateUserProfileInput = Omit<
  CreateUserInput,
  "email" | "roleCode"
>;

export type CreateRoleInput = {
  code: string;
  name: string;
  description: string | null;
  permissionCodes: string[];
};

export type UpdateRoleInput = {
  name: string;
  description: string | null;
};

export function searchUsers(params: UserSearchParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("search", params.search);
  if (params.role) query.set("role", params.role);
  if (params.status) query.set("status", params.status);
  if (params.profileStatus) query.set("profileStatus", params.profileStatus);
  return apiRequest<UserPage>(`users?${query.toString()}`);
}

export function getUser(userId: string) {
  return apiRequest<UserDetail>(`users/${userId}`);
}

export function getRoles() {
  return apiRequest<RoleItem[]>("roles");
}

export function getPermissions() {
  return apiRequest<PermissionItem[]>("permissions");
}

export function createRole(input: CreateRoleInput) {
  return apiRequest<RoleItem>("roles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateRole(roleId: string, input: UpdateRoleInput) {
  return apiRequest<RoleItem>(`roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function replaceRolePermissions(
  roleId: string,
  permissionCodes: string[],
) {
  return apiRequest<RoleItem>(`roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  });
}

export function deleteRole(roleId: string) {
  return apiRequest<null>(`roles/${roleId}`, { method: "DELETE" });
}

export function createUser(input: CreateUserInput) {
  return apiRequest<CreateUserResponse>("users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUserProfile(userId: string, input: UpdateUserProfileInput) {
  return apiRequest<null>(`users/${userId}/profile`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function updateUserStatus(userId: string, status: AccountStatus) {
  return apiRequest<null>(`users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function assignUserRole(userId: string, roleCode: string) {
  return apiRequest<null>(`users/${userId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleCode }),
  });
}

export function removeUserRole(userId: string, roleCode: string) {
  return apiRequest<null>(
    `users/${userId}/roles/${encodeURIComponent(roleCode)}`,
    { method: "DELETE" },
  );
}

/** Deletes the account softly: kept for history, cannot sign in, its email can be used again. */
export function deleteUser(userId: string) {
  return apiRequest<null>(`users/${userId}`, { method: "DELETE" });
}

/** Changes the sign-in email; the account must confirm the new address. */
export function changeUserEmail(userId: string, email: string) {
  return apiRequest<null>(`users/${userId}/email`, {
    method: "PUT",
    body: JSON.stringify({ email }),
  });
}

export function inviteUser(userId: string) {
  return apiRequest<null>(`users/${userId}/invite`, { method: "POST" });
}
