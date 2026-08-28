import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser, refreshTokens } from "@/lib/auth/backend";
import { clearSession, readSession, setSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session.accessToken && !session.refreshToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    let freshTokens = null;
    let result = session.accessToken
      ? await getCurrentUser(session.accessToken)
      : { response: new Response(null, { status: 401 }), user: null };

    if (result.response.status === 401 && session.refreshToken) {
      freshTokens = await refreshTokens(session.refreshToken);
      if (freshTokens) result = await getCurrentUser(freshTokens.accessToken);
    }

    if (!result.user) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 },
      );
      clearSession(response);
      return response;
    }

    const response = NextResponse.json({
      authenticated: true,
      user: result.user,
    });
    if (freshTokens) setSession(response, freshTokens);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Backend không khả dụng." },
      { status: 502 },
    );
  }
}
