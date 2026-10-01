import type { CurrentUser } from "@/lib/auth/contracts";

export const MANAGEMENT_PERMISSIONS = [
  "identity.users.read",
  "identity.users.manage-profile",
  "identity.roles.read",
  "identity.roles.manage",
  "identity.users.create",
  "identity.users.invite",
  "identity.roles.assign",
  "identity.users.manage-status",
  "identity.users.delete",
  "partners.merchants.read",
  "partners.merchants.manage-status",
  "network.read",
  "network.manage",
  "pricing.read",
  "pricing.manage",
  "shipments.admin.read",
  "shipments.read-hub",
  "shipments.admin.manage",
  "shipments.exceptions.read",
  "shipments.exceptions.manage",
  "shipments.weight.adjust",
  "shipments.cases.read",
  "shipments.cases.manage",
  "shipments.control-tower.read",
  "operations.workforce.manage",
  "operations.workforce.read",
  "operations.assignments.manage",
  "operations.assignments.read",
  "operations.dispatch.manage",
  "operations.hub.read",
  "operations.hub.manage",
  "support.requests.read",
  "fleet.trips.read-hub",
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

const OPERATIONS_SCOPE_PERMISSIONS = [
  "operations.assignments.read",
  "operations.assignments.manage",
  "operations.dispatch.manage",
  "operations.hub.manage",
] as const;

export function canAccessOperations(user: CurrentUser | null | undefined) {
  return hasAnyPermission(user, [
    "operations.workforce.read",
    "operations.workforce.manage",
    "operations.dispatch.manage",
    "operations.hub.read",
    ...OPERATIONS_SCOPE_PERMISSIONS,
  ]);
}

export function canAccessOperationsWorkforce(
  user: CurrentUser | null | undefined,
) {
  return hasAnyPermission(user, [
    "operations.workforce.read",
    "operations.workforce.manage",
    "operations.hub.manage",
  ]);
}

export function canAccessOperationsAssignments(
  user: CurrentUser | null | undefined,
) {
  return hasAnyPermission(user, OPERATIONS_SCOPE_PERMISSIONS);
}

/** Head-office users see every hub; hub staff only the hubs they are assigned to. */
export function seesAllHubs(user: CurrentUser | null | undefined) {
  return hasPermission(user, "scope.all-hubs");
}

export function canAccessShipmentList(user: CurrentUser | null | undefined) {
  return hasAnyPermission(user, ["shipments.admin.read", "shipments.read-hub"]);
}

/** Event queue repair is a system task, not part of a hub's day. */
export function canAccessDispatchReliability(user: CurrentUser | null | undefined) {
  return seesAllHubs(user) && canAccessOperationsAssignments(user);
}

export function canAccessShipmentCases(
  user: CurrentUser | null | undefined,
) {
  return hasAnyPermission(user, ["shipments.cases.read", "shipments.cases.manage"]);
}

export function canAccessShipmentExceptionQueue(
  user: CurrentUser | null | undefined,
) {
  return hasAnyPermission(user, [
    "shipments.exceptions.read",
    "shipments.exceptions.manage",
  ]);
}

export function canAccessControlTower(
  user: CurrentUser | null | undefined,
) {
  return (
    hasPermission(user, "shipments.control-tower.read") &&
    hasAnyPermission(user, OPERATIONS_SCOPE_PERMISSIONS)
  );
}

export function canAccessSupportRequests(user: CurrentUser | null | undefined) {
  return hasPermission(user, "support.requests.read");
}

/** Hub managers watch line-haul trucks of their hubs; head office watches every truck. */
export function canAccessFleetTrips(user: CurrentUser | null | undefined) {
  return hasPermission(user, "fleet.trips.read-hub");
}

/** Couriers use the portal only for their own deliveries and the cash they carry. */
export function canAccessCourierDeliveries(user: CurrentUser | null | undefined) {
  return hasPermission(user, "deliveries.complete-own");
}

export function canAccessManagement(user: CurrentUser | null | undefined) {
  return hasAnyPermission(user, MANAGEMENT_PERMISSIONS) || canAccessCourierDeliveries(user);
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
  if (pathname.startsWith("/support")) {
    return canAccessSupportRequests(user);
  }
  if (pathname.startsWith("/deliveries")) {
    return canAccessCourierDeliveries(user);
  }
  if (pathname.startsWith("/fleet")) {
    return canAccessFleetTrips(user);
  }
  if (pathname.startsWith("/finance/cash")) {
    return hasPermission(user, "billing.cash.approve");
  }
  if (pathname.startsWith("/finance")) {
    return hasPermission(user, "billing.manage");
  }

  if (pathname.startsWith("/operations/dispatch")) {
    return canAccessDispatchReliability(user);
  }
  if (pathname.startsWith("/operations/assignments")) {
    return canAccessOperationsAssignments(user);
  }
  if (
    pathname.startsWith("/operations/workforce") ||
    pathname.startsWith("/operations/shifts")
  ) {
    return canAccessOperationsWorkforce(user);
  }
  if (pathname.startsWith("/operations")) {
    return canAccessOperations(user);
  }

  if (pathname.startsWith("/shipments/exceptions")) {
    return canAccessShipmentExceptionQueue(user);
  }
  if (pathname.startsWith("/shipments/cases")) {
    return canAccessShipmentCases(user);
  }
  if (pathname.startsWith("/control-tower")) {
    return canAccessControlTower(user);
  }
  if (pathname.startsWith("/shipments")) {
    return canAccessShipmentList(user);
  }

  // Unknown paths should still reach Next.js' not-found/error handling. New
  // management modules add their explicit rule here when introduced.
  return true;
}
