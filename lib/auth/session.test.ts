import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";

import {
  ACCESS_COOKIE,
  PASSWORD_CHANGE_COOKIE,
  REFRESH_COOKIE,
  clearSession,
  readSession,
  setSession,
} from "@/lib/auth/session";

describe("session cookies", () => {
  it("stores both tokens as httpOnly, same-site cookies", () => {
    const response = NextResponse.json({});
    setSession(response, {
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 900,
      passwordChangeRequired: false,
    });

    const access = response.cookies.get(ACCESS_COOKIE);
    expect(access).toMatchObject({
      value: "access-1",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    expect(response.cookies.get(REFRESH_COOKIE)).toMatchObject({
      value: "refresh-1",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60,
    });
    // No temporary password: the marker is removed.
    expect(response.cookies.get(PASSWORD_CHANGE_COOKIE)).toMatchObject({ value: "", maxAge: 0 });
  });

  it("marks a session that must replace its temporary password", () => {
    const response = NextResponse.json({});
    setSession(response, {
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 60,
      passwordChangeRequired: true,
    });

    expect(response.cookies.get(PASSWORD_CHANGE_COOKIE)).toMatchObject({ value: "1", httpOnly: true });
    expect(response.cookies.get(PASSWORD_CHANGE_COOKIE)?.maxAge).toBeGreaterThan(0);
  });

  it("clears every session cookie", () => {
    const response = NextResponse.json({});
    clearSession(response);

    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, PASSWORD_CHANGE_COOKIE]) {
      expect(response.cookies.get(name)).toMatchObject({ value: "", maxAge: 0, path: "/" });
    }
    expect(response.headers.getSetCookie()).toHaveLength(3);
  });

  it("reads the tokens from the request cookies", () => {
    const request = new NextRequest("http://portal.test/dashboard", {
      headers: { cookie: `${ACCESS_COOKIE}=a1; ${REFRESH_COOKIE}=r1` },
    });
    expect(readSession(request)).toEqual({ accessToken: "a1", refreshToken: "r1" });
    expect(readSession(new NextRequest("http://portal.test/"))).toEqual({
      accessToken: undefined,
      refreshToken: undefined,
    });
  });
});
