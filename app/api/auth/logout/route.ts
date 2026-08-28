import { NextResponse, type NextRequest } from "next/server";

import { revokeToken } from "@/lib/auth/backend";
import { clearSession, readSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const { refreshToken } = readSession(request);
  if (refreshToken) {
    try {
      await revokeToken(refreshToken);
    } catch {
      // Local logout still succeeds when the backend is temporarily unavailable.
    }
  }

  const response = NextResponse.json({ authenticated: false });
  clearSession(response);
  return response;
}
