import { NextResponse, type NextRequest } from "next/server";

import { backendUrl } from "@/lib/api/backend";
import { refreshTokens } from "@/lib/auth/backend";
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
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      ...(request.headers.get("content-type")
        ? { "content-type": request.headers.get("content-type")! }
        : {}),
      ...(request.headers.get("idempotency-key")
        ? { "idempotency-key": request.headers.get("idempotency-key")! }
        : {}),
    },
    body,
  });
}

async function handle(request: NextRequest, context: Context) {
  const { path } = await context.params;
  if (!isSafePath(path))
    return NextResponse.json(
      { message: "Đường dẫn backend không hợp lệ." },
      { status: 400 },
    );

  const session = readSession(request);
  if (!session.accessToken)
    return NextResponse.json(
      { message: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );

  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    let backend = await forward(request, path, session.accessToken, body);
    let freshTokens = null;

    if (backend.status === 401 && session.refreshToken) {
      freshTokens = await refreshTokens(session.refreshToken);
      if (freshTokens)
        backend = await forward(request, path, freshTokens.accessToken, body);
    }

    const response = new NextResponse(
      backend.status === 204 ? null : await backend.arrayBuffer(),
      {
        status: backend.status,
        headers: {
          "content-type":
            backend.headers.get("content-type") ??
            "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
    if (freshTokens) setSession(response, freshTokens);
    if (backend.status === 401) clearSession(response);
    return response;
  } catch {
    return NextResponse.json(
      { message: "Không thể kết nối backend Pavex." },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
