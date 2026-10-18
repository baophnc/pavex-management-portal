import { describe, expect, it, vi } from "vitest";

import { ApiError, apiRequest } from "@/lib/api/client";
import { parseBackendProblem, parseRetryAfterSeconds } from "@/lib/api/problem";
import { header, json, stubFetch } from "@/test/fetch";

describe("apiRequest", () => {
  it("calls the BFF proxy and returns the parsed body", async () => {
    const { calls } = stubFetch(() => json({ id: "s1" }));

    const result = await apiRequest<{ id: string }>("/shipments/s1");

    expect(result).toEqual({ id: "s1" });
    expect(calls[0].url).toBe("/api/backend/shipments/s1");
    expect(calls[0].init.cache).toBe("no-store");
    expect(header(calls[0], "accept")).toBe("application/json");
  });

  it("marks a JSON body but leaves form uploads to the browser", async () => {
    const { calls } = stubFetch(() => new Response(null, { status: 204 }));

    await apiRequest("shipments", { method: "POST", body: "{}", headers: { "idempotency-key": "k1" } });
    await apiRequest("auth/me/avatar", { method: "POST", body: new FormData() });

    expect(header(calls[0], "content-type")).toBe("application/json");
    expect(header(calls[0], "idempotency-key")).toBe("k1");
    expect(header(calls[1], "content-type")).toBeNull();
  });

  it("throws an ApiError with the backend problem details", async () => {
    stubFetch(() =>
      json(
        {
          error: { code: "version_conflict", message: "Đơn đã thay đổi", traceId: "t1", conflictVersion: 4 },
          errors: { weight: "Bắt buộc" },
        },
        { status: 409, headers: { "retry-after": "3" } },
      ),
    );

    const error = await apiRequest("shipments/s1").catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "Đơn đã thay đổi",
      code: "version_conflict",
      traceId: "t1",
      conflictVersion: 4,
      fieldErrors: { weight: ["Bắt buộc"] },
      retryAfterSeconds: 3,
      retryable: false,
    });
  });

  it("announces an expired session in the browser", async () => {
    const window = new EventTarget();
    const listener = vi.fn();
    window.addEventListener("pavex-management:session-expired", listener);
    vi.stubGlobal("window", window);
    stubFetch(() => json({ code: "session_expired" }, { status: 401 }));

    await expect(apiRequest("shipments")).rejects.toMatchObject({ status: 401 });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("reports an unreachable BFF as a retryable error", async () => {
    stubFetch(() => {
      throw new TypeError("Failed to fetch");
    });

    const error = await apiRequest("shipments").catch((reason: unknown) => reason);

    expect(error).toMatchObject({ status: 0, code: "management_bff_unavailable", retryable: true });
  });
});

describe("problem parsing", () => {
  it("falls back to a generic message", () => {
    expect(parseBackendProblem(null)).toEqual({
      message: "Yêu cầu tới máy chủ thất bại.",
      code: null,
      traceId: null,
      fieldErrors: {},
      conflictVersion: null,
    });
    expect(parseBackendProblem({ title: "Not Found", trace_id: "t2" })).toMatchObject({
      message: "Not Found",
      traceId: "t2",
    });
  });

  it("reads Retry-After as seconds or a date", () => {
    vi.useFakeTimers({ now: new Date("2026-10-18T00:00:00Z") });
    expect(parseRetryAfterSeconds("2.5")).toBe(3);
    expect(parseRetryAfterSeconds("Sun, 18 Oct 2026 00:00:10 GMT")).toBe(10);
    expect(parseRetryAfterSeconds("soon")).toBeNull();
    expect(parseRetryAfterSeconds(null)).toBeNull();
    vi.useRealTimers();
  });
});
