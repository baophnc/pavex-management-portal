import type { Metadata } from "next";

import { IdentityRoles } from "@/features/identity/roles";

export const metadata: Metadata = { title: "Vai trò & quyền" };

export default function RolesPage() {
  return <IdentityRoles />;
}
