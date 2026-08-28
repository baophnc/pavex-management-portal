import { NextResponse, type NextRequest } from "next/server";

import { authenticate, getCurrentUser } from "@/lib/auth/backend";
import { setSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Dữ liệu đăng nhập không hợp lệ." },
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
      { message: "Vui lòng nhập email và mật khẩu." },
      { status: 400 },
    );
  }

  try {
    const result = await authenticate(email, password);
    if (!result.response.ok || !result.tokens) {
      return NextResponse.json(
        { message: "Email hoặc mật khẩu không chính xác." },
        { status: result.response.status === 429 ? 429 : 401 },
      );
    }

    const current = await getCurrentUser(result.tokens.accessToken);
    if (!current.user) {
      return NextResponse.json(
        { message: "Không thể đọc hồ sơ quản trị." },
        { status: 502 },
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
      { message: "Không thể kết nối backend Pavex." },
      { status: 502 },
    );
  }
}
