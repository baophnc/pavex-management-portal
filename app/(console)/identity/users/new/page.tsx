import type { Metadata } from "next";

import { CreateIdentityUser } from "@/features/identity/create-user";

export const metadata: Metadata = { title: "Tạo tài khoản" };

export default function CreateIdentityUserPage() {
  return <CreateIdentityUser />;
}
