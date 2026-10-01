import { NextResponse, type NextRequest } from "next/server";

import { backendUrl } from "@/lib/api/backend";
import { refreshSessionTokens } from "@/lib/auth/refresh-coordinator";
import { clearSession, readSession, setSession } from "@/lib/auth/session";

export const runtime = "nodejs";

type Context = { params: Promise<{ path: string[] }> };

function isSafePath(parts: string[]) {
  return (
    parts.length > 0 &&
    parts.length <= 24 &&
    parts.every(
      (part) => part && part !== "." && part !== ".." && !part.includes("\\"),
    )
  );
}

function unauthenticated() {
  const response = NextResponse.json(
    { code: "session_expired", message: "Phiên đăng nhập đã hết hạn." },
    { status: 401 },
  );
  clearSession(response);
  return response;
}

function backendUnavailable(message = "Không thể kết nối máy chủ Pavex.") {
  return NextResponse.json(
    { code: "management_backend_unavailable", message },
    { status: 502 },
  );
}

async function forward(
  request: NextRequest,
  path: string[],
  accessToken: string,
  body?: ArrayBuffer,
) {
  const [first, ...rest] = path;
  const version = first === "v1" || first === "v2" ? first : "v1";
  const endpoint = first === "v1" || first === "v2" ? rest : path;
  if (!endpoint.length) return new Response(null, { status: 400 });

  const url = new URL(
    backendUrl(`/api/${version}/${endpoint.map(encodeURIComponent).join("/")}`),
  );
  request.nextUrl.searchParams.forEach((value, key) =>
    url.searchParams.append(key, value),
  );

  return fetch(url, {
    method: request.method,
    cache: "no-store",
    redirect: "manual",
    headers: {
      accept: request.headers.get("accept") ?? "application/json",
      authorization: `Bearer ${accessToken}`,
      // Lets the gateway rate-limit per staff browser instead of per portal server.
      ...(request.headers.get("x-forwarded-for")
        ? { "x-forwarded-for": request.headers.get("x-forwarded-for")! }
        : {}),
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(request.headers.get("idempotency-key")
        ? { "idempotency-key": request.headers.get("idempotency-key")! }
        : {}),
      ...(request.headers.get("if-match")
        ? { "if-match": request.headers.get("if-match")! }
        : {}),
    },
    body,
  });
}

function copyResponseHeaders(backend: Response) {
  const headers = new Headers({
    "content-type":
      backend.headers.get("content-type") ?? "application/json; charset=utf-8",
    "cache-control": "no-store",
  });

  for (const name of [
    "retry-after",
    "content-disposition",
    "etag",
    "x-request-id",
    "x-trace-id",
  ]) {
    const value = backend.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (!isSafePath(path)) {
    return NextResponse.json(
      { code: "invalid_backend_path", message: "Đường dẫn máy chủ không hợp lệ." },
      { status: 400 },
    );
  }

  const session = readSession(request);
  if (!session.accessToken && !session.refreshToken) return unauthenticated();

  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    let accessToken = session.accessToken;
    let freshTokens = null;

    if (!accessToken && session.refreshToken) {
      const refresh = await refreshSessionTokens(session.refreshToken);
      if (!refresh.tokens) {
        return refresh.response.status >= 500
          ? backendUnavailable("Dịch vụ đăng nhập tạm thời không khả dụng.")
          : unauthenticated();
      }
      freshTokens = refresh.tokens;
      accessToken = freshTokens.accessToken;
    }

    if (!accessToken) return unauthenticated();

    let backend = await forward(request, path, accessToken, body);

    // 403: the token may predate a new role or permission (it lives 15 minutes). A refreshed token
    // carries the current ones, so try once more; a request refused with 401/403 was never carried out.
    if (
      (backend.status === 401 || backend.status === 403) &&
      session.refreshToken &&
      !freshTokens
    ) {
      const refresh = await refreshSessionTokens(session.refreshToken);
      if (refresh.tokens) {
        freshTokens = refresh.tokens;
        backend = await forward(request, path, freshTokens.accessToken, body);
      } else if (refresh.response.status >= 500) {
        return backendUnavailable("Dịch vụ đăng nhập tạm thời không khả dụng.");
      }
    }

    const response = new NextResponse(
      backend.status === 204 ? null : await backend.arrayBuffer(),
      {
        status: backend.status,
        headers: copyResponseHeaders(backend),
      },
    );

    if (freshTokens) setSession(response, freshTokens);
    if (backend.status === 401) clearSession(response);
    return response;
  } catch {
    return backendUnavailable();
  }
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
