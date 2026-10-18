import { describe, expect, it } from "vitest";

import { backendFetch, backendUrl, readBackendPayload } from "@/lib/api/backend";
import { authenticate, getCurrentUser, revokeToken } from "@/lib/auth/backend";
import { bodyJson, header, json, stubFetch, tokens } from "@/test/fetch";

describe("backendUrl", () => {
  it("joins API_BASE_URL and the path", () => {
    expect(backendUrl("/api/v1/auth/me")).toBe("http://gateway.test/api/v1/auth/me");
    expect(backendUrl("api/v1/auth/me")).toBe("http://gateway.test/api/v1/auth/me");
  });
});

describe("backendFetch", () => {
  it("asks for JSON, never caches and marks a JSON body", async () => {
    const { calls } = stubFetch(() => json({}));

    await backendFetch("/api/v1/auth/login", { method: "POST", body: "{}" });
    await backendFetch("/api/v1/auth/me", { headers: { authorization: "Bearer a" } });

    expect(calls[0].init.cache).toBe("no-store");
    expect(header(calls[0], "accept")).toBe("application/json");
    expect(header(calls[0], "content-type")).toBe("application/json");
    expect(header(calls[1], "content-type")).toBeNull();
    expect(header(calls[1], "authorization")).toBe("Bearer a");
  });
});

describe("readBackendPayload", () => {
  it("parses JSON, keeps plain text as a message and returns null for no body", async () => {
    expect(await readBackendPayload(json({ a: 1 }))).toEqual({ a: 1 });
    expect(await readBackendPayload(new Response("Bad gateway", { status: 502 }))).toEqual({
      message: "Bad gateway",
    });
    expect(await readBackendPayload(new Response(null, { status: 204 }))).toBeNull();
    expect(await readBackendPayload(new Response(""))).toBeNull();
  });
});

describe("auth backend calls", () => {
  it("logs in and parses the tokens, including the temporary-password flag", async () => {
    const { calls } = stubFetch(() => json(tokens("login", { passwordChangeRequired: true })));

    const result = await authenticate("admin@pavex.test", "secret");

    expect(calls[0].url).toBe("http://gateway.test/api/v1/auth/login");
    expect(bodyJson(calls[0])).toEqual({ email: "admin@pavex.test", password: "secret" });
    expect(result.tokens).toEqual({
      accessToken: "access-login",
      refreshToken: "refresh-login",
      expiresIn: 900,
      passwordChangeRequired: true,
    });
  });

  it("returns no tokens for a refused login or a malformed answer", async () => {
    stubFetch(() => json({ code: "invalid_credentials", message: "Sai mật khẩu" }, { status: 401 }));
    const refused = await authenticate("admin@pavex.test", "wrong");
    expect(refused.tokens).toBeNull();
    expect(refused.payload).toMatchObject({ code: "invalid_credentials" });

    stubFetch(() => json({ accessToken: "a" }));
    expect((await authenticate("admin@pavex.test", "x")).tokens).toBeNull();
  });

  it("reads the current user with the access token", async () => {
    const { calls } = stubFetch(() =>
      json({ userId: "u1", email: "admin@pavex.test", roles: ["ADMIN", 3], permissions: null }),
    );

    const { user } = await getCurrentUser("access-1");

    expect(header(calls[0], "authorization")).toBe("Bearer access-1");
    expect(user).toEqual({
      userId: "u1",
      email: "admin@pavex.test",
      displayName: null,
      roles: ["ADMIN"],
      permissions: [],
    });
  });

  it("revokes the refresh token on logout", async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 204 }));
    await revokeToken("refresh-1");
    expect(calls[0].url).toBe("http://gateway.test/api/v1/auth/logout");
    expect(bodyJson(calls[0])).toEqual({ refreshToken: "refresh-1" });
  });
});
