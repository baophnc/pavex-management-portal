"use client";

import { createContext, useContext, useMemo } from "react";

import type { CurrentUser } from "@/lib/auth/contracts";

type Access = {
  user: CurrentUser | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
};

const AccessContext = createContext<Access>({
  user: null,
  hasPermission: () => false,
  hasAnyPermission: () => false,
});

export function AccessProvider({
  user,
  children,
}: {
  user: CurrentUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    return {
      user,
      hasPermission: (permission: string) => permissions.has(permission),
      hasAnyPermission: (required: string[]) =>
        required.some((permission) => permissions.has(permission)),
    };
  }, [user]);

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
