import "server-only";

import { headers as incomingHeaders } from "next/headers";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

export function backendUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The gateway rate-limits by client IP; pass on the browser's address chain (as set by the
 * ingress) so every staff member does not share this server's key. The gateway only trusts it when
 * GATEWAY_TRUSTED_PROXIES lists this server's address.
 */
export async function browserForwardedFor() {
  try {
    return (await incomingHeaders()).get("x-forwarded-for");
  } catch {
    // Outside a request there is no browser to forward.
    return null;
  }
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  const forwardedFor = await browserForwardedFor();
  return fetch(backendUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      ...init.headers,
    },
  });
}

export async function readBackendPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const body = await response.text();
  if (!body) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return { message: body };
  }
}
