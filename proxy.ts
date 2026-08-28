import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const signedIn = Boolean(request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname === "/login";

  if (!signedIn && !isLogin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  if (signedIn && isLogin) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
