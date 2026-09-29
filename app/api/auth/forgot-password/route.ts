import type { NextRequest } from "next/server";
import { recoverPassword } from "@/lib/auth/password-recovery";

export const runtime = "nodejs";
export function POST(request: NextRequest) {
  return recoverPassword(request, "forgot-password");
}
