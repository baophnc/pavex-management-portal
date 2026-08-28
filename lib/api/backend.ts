import "server-only";

const apiBaseUrl = (
  process.env.API_BASE_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

export function backendUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function backendFetch(path: string, init: RequestInit = {}) {
  return fetch(backendUrl(path), {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
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
