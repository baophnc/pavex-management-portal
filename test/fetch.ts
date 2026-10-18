import { vi } from "vitest";

export type FetchCall = { url: string; init: RequestInit };

/** Replaces global fetch with [handler] and records every call. */
export function stubFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const call = { url: input instanceof Request ? input.url : String(input), init };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

export function header(call: FetchCall, name: string) {
  return new Headers(call.init.headers).get(name);
}

export function bodyJson(call: FetchCall) {
  return JSON.parse(String(call.init.body)) as unknown;
}

export const tokens = (suffix: string, extra: Record<string, unknown> = {}) => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  expiresIn: 900,
  ...extra,
});
