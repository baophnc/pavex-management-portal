import type { CurrentUser } from "@/lib/auth/contracts";

export const MANAGEMENT_PERMISSIONS = [
  "identity.users.read",
  "identity.users.manage-profile",
  "identity.roles.read",
  "identity.users.create",
  "identity.users.invite",
  "identity.roles.assign",
  "identity.users.manage-status",
  "partners.merchants.read",
  "partners.merchants.manage-status",
  "network.read",
  "network.manage",
  "pricing.read",
  "pricing.manage",
  "shipments.admin.read",
  "shipments.admin.manage",
] as const;

export function hasPermission(
  user: CurrentUser | null | undefined,
  permission: string,
) {
  return Boolean(user?.permissions.includes(permission));
}

export function hasAnyPermission(
  user: CurrentUser | null | undefined,
  permissions: readonly string[],
) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: CurrentUser | null | undefined,
  permissions: readonly string[],
) {
  return permissions.every((permission) => hasPermission(user, permission));
}

export function hasRole(user: CurrentUser | null | undefined, role: string) {
  return Boolean(user?.roles.includes(role));
}

export function hasAnyRole(
  user: CurrentUser | null | undefined,
  roles: readonly string[],
) {
  return roles.some((role) => hasRole(user, role));
}

export function canAccessManagement(user: CurrentUser | null | undefined) {
  return hasAnyPermission(user, MANAGEMENT_PERMISSIONS);
}

export function canAccessManagementPath(
  user: CurrentUser | null | undefined,
  pathname: string,
) {
  if (pathname === "/dashboard" || pathname.startsWith("/account")) return true;

  if (pathname === "/identity/users/new") {
    return hasAllPermissions(user, [
      "identity.users.create",
      "identity.roles.assign",
    ]);
  }
  if (pathname.startsWith("/identity/users")) {
    return hasPermission(user, "identity.users.read");
  }
  if (pathname.startsWith("/identity/roles")) {
    return hasPermission(user, "identity.roles.read");
  }
  if (pathname.startsWith("/partners/merchants")) {
    return hasPermission(user, "partners.merchants.read");
  }
  if (pathname.startsWith("/network")) {
    return hasAnyPermission(user, ["network.read", "network.manage"]);
  }
  if (pathname.startsWith("/pricing")) {
    return hasAnyPermission(user, ["pricing.read", "pricing.manage"]);
  }

  // Unknown paths should still reach Next.js' not-found/error handling. New
  // management modules add their explicit rule here when introduced.
  return true;
}
