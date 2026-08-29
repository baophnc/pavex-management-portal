import "server-only";

import { refreshTokens, type RefreshResult } from "@/lib/auth/backend";

const inFlightRefreshes = new Map<string, Promise<RefreshResult>>();

/**
 * Coalesces concurrent refresh attempts inside one Management BFF process.
 * Dashboard pages can issue several API calls at once; without this guard they
 * may all try to rotate the same refresh token and invalidate each other.
 */
export function refreshSessionTokens(refreshToken: string) {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const pending = refreshTokens(refreshToken).finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });
  inFlightRefreshes.set(refreshToken, pending);
  return pending;
}
