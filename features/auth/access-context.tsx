"use client";

import { createContext, useContext, useMemo } from "react";

import {
  hasAllPermissions as userHasAllPermissions,
  hasAnyPermission as userHasAnyPermission,
  hasAnyRole as userHasAnyRole,
  hasPermission as userHasPermission,
  hasRole as userHasRole,
} from "@/lib/auth/access";
import type { CurrentUser } from "@/lib/auth/contracts";

type Access = {
  user: CurrentUser | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: readonly string[]) => boolean;
  hasAllPermissions: (permissions: readonly string[]) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: readonly string[]) => boolean;
};

const AccessContext = createContext<Access>({
  user: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  hasRole: () => false,
  hasAnyRole: () => false,
});

export function AccessProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo<Access>(
    () => ({
      user,
      hasPermission: (permission) => userHasPermission(user, permission),
      hasAnyPermission: (permissions) =>
        userHasAnyPermission(user, permissions),
      hasAllPermissions: (permissions) =>
        userHasAllPermissions(user, permissions),
      hasRole: (role) => userHasRole(user, role),
      hasAnyRole: (roles) => userHasAnyRole(user, roles),
    }),
    [user],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
