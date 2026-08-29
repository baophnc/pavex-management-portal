import { NextResponse, type NextRequest } from "next/server";

import { parseBackendProblem } from "@/lib/api/problem";
import { getCurrentUser } from "@/lib/auth/backend";
import { canAccessManagement } from "@/lib/auth/access";
import { refreshSessionTokens } from "@/lib/auth/refresh-coordinator";
import { clearSession, readSession, setSession } from "@/lib/auth/session";

function unauthenticated() {
  const response = NextResponse.json(
    {
      authenticated: false,
      code: "session_expired",
      message: "Phiên đăng nhập đã hết hạn.",
    },
    { status: 401 },
  );
  clearSession(response);
  return response;
}

export async function GET(request: NextRequest) {
  const session = readSession(request);
  if (!session.accessToken && !session.refreshToken) return unauthenticated();

  try {
    let freshTokens = null;
    let accessToken = session.accessToken;

    if (!accessToken && session.refreshToken) {
      const refresh = await refreshSessionTokens(session.refreshToken);
      if (!refresh.tokens) {
        if (refresh.response.status >= 500) {
          return NextResponse.json(
            {
              code: "auth_backend_unavailable",
              message: "Auth tạm thời không khả dụng.",
            },
            { status: 502 },
          );
        }
        return unauthenticated();
      }
      freshTokens = refresh.tokens;
      accessToken = freshTokens.accessToken;
    }

    if (!accessToken) return unauthenticated();

    let result = await getCurrentUser(accessToken);

    if (
      result.response.status === 401 &&
      session.refreshToken &&
      !freshTokens
    ) {
      const refresh = await refreshSessionTokens(session.refreshToken);
      if (refresh.tokens) {
        freshTokens = refresh.tokens;
        result = await getCurrentUser(freshTokens.accessToken);
      } else if (refresh.response.status >= 500) {
        return NextResponse.json(
          {
            code: "auth_backend_unavailable",
            message: "Auth tạm thời không khả dụng.",
          },
          { status: 502 },
        );
      } else {
        return unauthenticated();
      }
    }

    if (!result.user) {
      if (result.response.status === 401) return unauthenticated();

      const problem = parseBackendProblem(
        result.payload,
        "Không thể đọc hồ sơ quản trị.",
      );
      const status = result.response.ok
        ? 502
        : result.response.status >= 500
          ? 502
          : result.response.status;
      const response = NextResponse.json(
        {
          authenticated: false,
          code: problem.code ?? "management_profile_unavailable",
          message: problem.message,
          traceId: problem.traceId,
        },
        { status },
      );
      if (status === 403) clearSession(response);
      else if (freshTokens) setSession(response, freshTokens);
      return response;
    }

    if (!canAccessManagement(result.user)) {
      const response = NextResponse.json(
        {
          authenticated: false,
          code: "management_access_required",
          message:
            "Tài khoản này không còn quyền sử dụng Pavex Management Portal.",
        },
        { status: 403 },
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
      {
        code: "management_backend_unavailable",
        message: "Backend không khả dụng.",
      },
      { status: 502 },
    );
  }
}
