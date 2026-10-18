import { describe, expect, it } from "vitest";

import { refreshSessionTokens } from "@/lib/auth/refresh-coordinator";
import { bodyJson, json, stubFetch, tokens } from "@/test/fetch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

describe("refreshSessionTokens", () => {
  it("lets parallel callers with the same refresh token share one refresh", async () => {
    const gate = deferred<Response>();
    const { calls } = stubFetch(() => gate.promise);

    const results = Promise.all([
      refreshSessionTokens("refresh-shared"),
      refreshSessionTokens("refresh-shared"),
      refreshSessionTokens("refresh-shared"),
    ]);
    gate.resolve(json(tokens("new")));
    const [first, second, third] = await results;

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://gateway.test/api/v1/auth/refresh");
    expect(calls[0].init.method).toBe("POST");
    expect(bodyJson(calls[0])).toEqual({ refreshToken: "refresh-shared" });
    expect(first.tokens?.accessToken).toBe("access-new");
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("refreshes again once the shared refresh has settled", async () => {
    const { calls } = stubFetch(() => json(tokens(String(calls.length))));

    await refreshSessionTokens("refresh-again");
    await refreshSessionTokens("refresh-again");

    expect(calls).toHaveLength(2);
  });

  it("does not share a refresh between different refresh tokens", async () => {
    const { calls } = stubFetch((call) => {
      const { refreshToken } = bodyJson(call) as { refreshToken: string };
      return json(tokens(refreshToken));
    });

    const [a, b] = await Promise.all([refreshSessionTokens("token-a"), refreshSessionTokens("token-b")]);

    expect(calls).toHaveLength(2);
    expect(a.tokens?.accessToken).toBe("access-token-a");
    expect(b.tokens?.accessToken).toBe("access-token-b");
  });

  it("releases the token after a failed refresh so the next caller retries", async () => {
    let attempt = 0;
    const { calls } = stubFetch(() => {
      attempt += 1;
      if (attempt === 1) throw new TypeError("fetch failed");
      return json({ code: "invalid_refresh_token" }, { status: 401 });
    });

    await expect(
      Promise.all([refreshSessionTokens("refresh-flaky"), refreshSessionTokens("refresh-flaky")]),
    ).rejects.toThrow("fetch failed");
    expect(calls).toHaveLength(1);

    const retry = await refreshSessionTokens("refresh-flaky");
    expect(calls).toHaveLength(2);
    expect(retry.tokens).toBeNull();
    expect(retry.response.status).toBe(401);
  });
});
