import "server-only";

import { backendFetch, readBackendPayload } from "@/lib/api/backend";
import { parseAuthTokens, parseCurrentUser } from "@/lib/auth/contracts";

export async function authenticate(email: string, password: string) {
  const response = await backendFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const payload = await readBackendPayload(response);
  return { response, tokens: response.ok ? parseAuthTokens(payload) : null };
}

export async function refreshTokens(refreshToken: string) {
  const response = await backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  return response.ok
    ? parseAuthTokens(await readBackendPayload(response))
    : null;
}

export async function getCurrentUser(accessToken: string) {
  const response = await backendFetch("/api/v1/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return {
    response,
    user: response.ok
      ? parseCurrentUser(await readBackendPayload(response))
      : null,
  };
}

export async function revokeToken(refreshToken: string) {
  await backendFetch("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
