import "server-only";

import { backendFetch, readBackendPayload } from "@/lib/api/backend";
import {
  parseAuthTokens,
  parseCurrentUser,
  type AuthTokens,
} from "@/lib/auth/contracts";

export type AuthenticationResult = {
  response: Response;
  tokens: AuthTokens | null;
  payload: unknown;
};

export type RefreshResult = AuthenticationResult;

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthenticationResult> {
  const response = await backendFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const payload = await readBackendPayload(response);
  return {
    response,
    tokens: response.ok ? parseAuthTokens(payload) : null,
    payload,
  };
}

export async function refreshTokens(
  refreshToken: string,
): Promise<RefreshResult> {
  const response = await backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  const payload = await readBackendPayload(response);
  return {
    response,
    tokens: response.ok ? parseAuthTokens(payload) : null,
    payload,
  };
}

export async function getCurrentUser(accessToken: string) {
  const response = await backendFetch("/api/v1/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = await readBackendPayload(response);
  return {
    response,
    user: response.ok ? parseCurrentUser(payload) : null,
    payload,
  };
}

export async function revokeToken(refreshToken: string) {
  await backendFetch("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}
