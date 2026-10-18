import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { ACCESS_COOKIE, PASSWORD_CHANGE_COOKIE, REFRESH_COOKIE } from "@/lib/auth/session";
import { bodyJson, header, json, stubFetch, tokens, type FetchCall } from "@/test/fetch";

import { GET, PATCH, POST } from "./route";

const REFRESH_URL = "http://gateway.test/api/v1/auth/refresh";

function call(
  handler: typeof GET,
  path: string[],
  { cookies = {}, headers = {}, method = "GET", body, query = "" }: {
    cookies?: Record<string, string>;
    headers?: Record<string, string>;
    method?: string;
    body?: string;
    query?: string;
  } = {},
) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const request = new NextRequest(`http://portal.test/api/backend/${path.join("/")}${query}`, {
    method,
    body,
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
  });
  return handler(request, { params: Promise.resolve({ path }) });
}

function isRefresh(fetchCall: FetchCall) {
  return fetchCall.url === REFRESH_URL;
}

function expectSessionCleared(response: Response) {
  const cookies = response.headers.getSetCookie().join("\n");
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, PASSWORD_CHANGE_COOKIE]) {
    expect(cookies).toMatch(new RegExp(`${name}=;.*Max-Age=0`));
  }
}

describe("backend proxy", () => {
  it("forwards a request with the access token to the gateway", async () => {
    const { calls } = stubFetch(() =>
      json({ items: [] }, { headers: { etag: '"7"', "x-request-id": "req-1", "set-cookie": "gateway=1" } }),
    );

    const response = await call(GET, ["shipments", "PAVEX 1"], {
      cookies: { [ACCESS_COOKIE]: "access-1" },
      query: "?status=CREATED&status=PICKED_UP",
      headers: { accept: "text/csv", "x-forwarded-for": "203.0.113.9" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      "http://gateway.test/api/v1/shipments/PAVEX%201?status=CREATED&status=PICKED_UP",
    );
    expect(calls[0].init).toMatchObject({ method: "GET", redirect: "manual", cache: "no-store" });
    expect(header(calls[0], "authorization")).toBe("Bearer access-1");
    expect(header(calls[0], "accept")).toBe("text/csv");
    expect(header(calls[0], "x-forwarded-for")).toBe("203.0.113.9");
    // Only the response headers the console needs are passed back; never the gateway's cookies.
    expect(response.headers.get("etag")).toBe('"7"');
    expect(response.headers.get("x-request-id")).toBe("req-1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("uses the version named in the path", async () => {
    const { calls } = stubFetch(() => json({}));
    await call(GET, ["v2", "pricing", "quotes"], { cookies: { [ACCESS_COOKIE]: "a" } });
    expect(calls[0].url).toBe("http://gateway.test/api/v2/pricing/quotes");
  });

  it("forwards the body, content type, idempotency key and if-match of a write", async () => {
    const { calls } = stubFetch(() => json({ ok: true }));

    await call(POST, ["counter", "shipments"], {
      method: "POST",
      cookies: { [ACCESS_COOKIE]: "access-1" },
      headers: { "content-type": "application/json", "idempotency-key": "idem-42" },
      body: JSON.stringify({ weightGrams: 500 }),
    });
    await call(PATCH, ["shipments", "PAVEX1"], {
      method: "PATCH",
      cookies: { [ACCESS_COOKIE]: "access-1" },
      headers: { "content-type": "application/json", "if-match": '"3"' },
      body: JSON.stringify({ note: "x" }),
    });

    expect(calls[0].init.method).toBe("POST");
    expect(header(calls[0], "idempotency-key")).toBe("idem-42");
    expect(header(calls[0], "content-type")).toBe("application/json");
    expect(new TextDecoder().decode(calls[0].init.body as ArrayBuffer)).toBe('{"weightGrams":500}');
    expect(calls[1].init.method).toBe("PATCH");
    expect(header(calls[1], "if-match")).toBe('"3"');
    expect(header(calls[1], "idempotency-key")).toBeNull();
  });

  it.each([
    ["a parent segment", ["shipments", "..", "admin"]],
    ["a current segment", ["shipments", ".", "list"]],
    ["a backslash", ["shipments", "..\\admin"]],
    ["an empty segment", ["shipments", ""]],
    ["too many segments", Array.from({ length: 25 }, () => "x")],
  ])("refuses a path with %s", async (_, path) => {
    const { calls } = stubFetch(() => json({}));

    const response = await call(GET, path, { cookies: { [ACCESS_COOKIE]: "a" } });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "invalid_backend_path" });
    expect(calls).toHaveLength(0);
  });

  it("answers 401 and clears the cookies without any session", async () => {
    const { calls } = stubFetch(() => json({}));

    const response = await call(GET, ["shipments"]);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "session_expired" });
    expectSessionCleared(response);
    expect(calls).toHaveLength(0);
  });

  it("refreshes first when only the refresh cookie is left, and stores the new tokens", async () => {
    const { calls } = stubFetch((fetchCall) =>
      isRefresh(fetchCall) ? json(tokens("fresh")) : json({ id: 1 }),
    );

    const response = await call(GET, ["auth", "me"], { cookies: { [REFRESH_COOKIE]: "refresh-old" } });

    expect(response.status).toBe(200);
    expect(calls.map((fetchCall) => fetchCall.url)).toEqual([REFRESH_URL, "http://gateway.test/api/v1/auth/me"]);
    expect(bodyJson(calls[0])).toEqual({ refreshToken: "refresh-old" });
    expect(header(calls[1], "authorization")).toBe("Bearer access-fresh");
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe("access-fresh");
    expect(response.cookies.get(REFRESH_COOKIE)?.value).toBe("refresh-fresh");
  });

  it("shares one refresh between parallel requests on the same refresh cookie", async () => {
    let releaseRefresh!: () => void;
    const refreshed = new Promise<void>((resolve) => (releaseRefresh = resolve));
    const { calls } = stubFetch(async (fetchCall) => {
      if (!isRefresh(fetchCall)) return json({});
      await refreshed;
      return json(tokens("shared"));
    });

    const pending = ["shipments", "hubs", "invoices"].map((segment) =>
      call(GET, [segment], { cookies: { [REFRESH_COOKIE]: "refresh-parallel" } }),
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    releaseRefresh();
    const responses = await Promise.all(pending);

    expect(calls.filter(isRefresh)).toHaveLength(1);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    for (const forwarded of calls.filter((fetchCall) => !isRefresh(fetchCall))) {
      expect(header(forwarded, "authorization")).toBe("Bearer access-shared");
    }
  });

  it("clears the session when the refresh token is refused", async () => {
    const { calls } = stubFetch(() => json({ code: "invalid_refresh_token" }, { status: 401 }));

    const response = await call(GET, ["shipments"], { cookies: { [REFRESH_COOKIE]: "refresh-revoked" } });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "session_expired" });
    expectSessionCleared(response);
    expect(calls).toHaveLength(1);
  });

  it("answers 502 when the login service is down during a refresh", async () => {
    stubFetch(() => json({}, { status: 503 }));

    const response = await call(GET, ["shipments"], { cookies: { [REFRESH_COOKIE]: "refresh-down" } });

    expect(response.status).toBe(502);
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("retries once with a refreshed token when the access token is rejected", async () => {
    const { calls } = stubFetch((fetchCall) => {
      if (isRefresh(fetchCall)) return json(tokens("retry"));
      return header(fetchCall, "authorization") === "Bearer access-stale"
        ? json({ code: "token_expired" }, { status: 401 })
        : json({ ok: true });
    });

    const response = await call(GET, ["shipments"], {
      cookies: { [ACCESS_COOKIE]: "access-stale", [REFRESH_COOKIE]: "refresh-retry" },
    });

    expect(response.status).toBe(200);
    expect(calls).toHaveLength(3);
    expect(header(calls[2], "authorization")).toBe("Bearer access-retry");
    expect(response.cookies.get(ACCESS_COOKIE)?.value).toBe("access-retry");
  });

  it("clears the session when the gateway still answers 401", async () => {
    stubFetch((fetchCall) =>
      isRefresh(fetchCall)
        ? json({ code: "invalid_refresh_token" }, { status: 401 })
        : json({ code: "unauthorized" }, { status: 401 }),
    );

    const response = await call(GET, ["shipments"], {
      cookies: { [ACCESS_COOKIE]: "access-stale", [REFRESH_COOKIE]: "refresh-gone" },
    });

    expect(response.status).toBe(401);
    expectSessionCleared(response);
  });

  it("clears the session on a 401 when there is no refresh token to retry with", async () => {
    const { calls } = stubFetch(() => json({ code: "unauthorized" }, { status: 401 }));

    const response = await call(GET, ["shipments"], { cookies: { [ACCESS_COOKIE]: "access-only" } });

    expect(response.status).toBe(401);
    expectSessionCleared(response);
    expect(calls).toHaveLength(1);
  });

  it("answers 502 when the gateway cannot be reached", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });

    const response = await call(GET, ["shipments"], { cookies: { [ACCESS_COOKIE]: "a" } });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ code: "management_backend_unavailable" });
  });
});
