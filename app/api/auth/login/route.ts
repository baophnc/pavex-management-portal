import { NextResponse, type NextRequest } from "next/server";

import { parseBackendProblem } from "@/lib/api/problem";
import {
  authenticate,
  getCurrentUser,
  revokeToken,
} from "@/lib/auth/backend";
import { canAccessManagement } from "@/lib/auth/access";
import { setSession } from "@/lib/auth/session";

export const runtime = "nodejs";

function jsonWithRetryAfter(
  payload: Record<string, unknown>,
  status: number,
  retryAfter: string | null,
) {
  const response = NextResponse.json(payload, { status });
  if (retryAfter) response.headers.set("retry-after", retryAfter);
  return response;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "invalid_login_request", message: "Dữ liệu đăng nhập không hợp lệ." },
      { status: 400 },
    );
  }

  const value =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const email = typeof value.email === "string" ? value.email.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (!email || !password || email.length > 320 || password.length > 256) {
    return NextResponse.json(
      { code: "invalid_login_request", message: "Vui lòng nhập email và mật khẩu." },
      { status: 400 },
    );
  }

  try {
    const result = await authenticate(email, password);
    if (!result.response.ok) {
      const problem = parseBackendProblem(
        result.payload,
        "Email hoặc mật khẩu không chính xác.",
      );
      const backendStatus = result.response.status;
      const status =
        backendStatus >= 400 && backendStatus <= 599 ? backendStatus : 502;
      const invalidCredentials = status === 401;

      return jsonWithRetryAfter(
        {
          code:
            problem.code ??
            (status === 429
              ? "login_rate_limited"
              : invalidCredentials
                ? "invalid_credentials"
                : "login_backend_error"),
          message: invalidCredentials
            ? "Email hoặc mật khẩu không chính xác."
            : problem.message,
          traceId: problem.traceId,
        },
        status,
        result.response.headers.get("retry-after"),
      );
    }

    if (!result.tokens) {
      return NextResponse.json(
        {
          code: "invalid_auth_response",
          message: "Auth trả về phiên đăng nhập không hợp lệ.",
        },
        { status: 502 },
      );
    }

    const current = await getCurrentUser(result.tokens.accessToken);
    if (!current.response.ok || !current.user) {
      const problem = parseBackendProblem(
        current.payload,
        "Không thể đọc hồ sơ quản trị.",
      );
      try {
        await revokeToken(result.tokens.refreshToken);
      } catch {
        // The browser has not received this refresh token yet, so local login
        // can fail safely even when backend logout is temporarily unavailable.
      }
      return NextResponse.json(
        {
          code: problem.code ?? "management_profile_unavailable",
          message: problem.message,
          traceId: problem.traceId,
        },
        { status: current.response.status >= 500 ? 502 : 401 },
      );
    }

    if (!canAccessManagement(current.user)) {
      try {
        await revokeToken(result.tokens.refreshToken);
      } catch {
        // No cookie has been set yet, therefore the login is still denied.
      }
      return NextResponse.json(
        {
          code: "management_access_required",
          message:
            "Tài khoản này chưa được cấp quyền sử dụng Pavex Management Portal.",
        },
        { status: 403 },
      );
    }

    const response = NextResponse.json({
      authenticated: true,
      user: current.user,
    });
    setSession(response, result.tokens);
    return response;
  } catch {
    return NextResponse.json(
      {
        code: "management_backend_unavailable",
        message: "Không thể kết nối backend Pavex.",
      },
      { status: 502 },
    );
  }
}
