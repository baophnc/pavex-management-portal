import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import type { AuthTokens } from "@/lib/auth/contracts";

export const ACCESS_COOKIE = "pavex_admin_access";
export const REFRESH_COOKIE = "pavex_admin_refresh";
/** Present while the signed-in account must replace its temporary password. */
export const PASSWORD_CHANGE_COOKIE = "pavex_admin_password_change";

const cookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  priority: "high" as const,
};

export function readSession(request: NextRequest) {
  return {
    accessToken: request.cookies.get(ACCESS_COOKIE)?.value,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value,
  };
}

export function setSession(response: NextResponse, tokens: AuthTokens) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn,
  });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60,
  });
  response.cookies.set(PASSWORD_CHANGE_COOKIE, tokens.passwordChangeRequired ? "1" : "", {
    ...cookieOptions,
    maxAge: tokens.passwordChangeRequired ? 30 * 24 * 60 * 60 : 0,
  });
}

export function clearSession(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set(PASSWORD_CHANGE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
