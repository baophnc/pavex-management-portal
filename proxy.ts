import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, PASSWORD_CHANGE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const signedIn = Boolean(request.cookies.get(ACCESS_COOKIE)?.value || request.cookies.get(REFRESH_COOKIE)?.value);
  const isLogin = request.nextUrl.pathname === "/login";
  const isRecovery = ["/forgot-password", "/reset-password"].includes(request.nextUrl.pathname);

  // Recovery must remain accessible without a session (also with stale cookies).
  if (isRecovery) return NextResponse.next();

  if (!signedIn && !isLogin) {
    const url = new URL("/login", request.url);
    url.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  // An account on its temporary password can only open the page that replaces it.
  const mustChangePassword = signedIn && Boolean(request.cookies.get(PASSWORD_CHANGE_COOKIE)?.value);
  const isPasswordChange = request.nextUrl.pathname === "/change-password";
  if (mustChangePassword && !isPasswordChange) return NextResponse.redirect(new URL("/change-password", request.url));
  if (!mustChangePassword && isPasswordChange) return NextResponse.redirect(new URL("/dashboard", request.url));
  if (signedIn && isLogin) return NextResponse.redirect(new URL("/dashboard", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
