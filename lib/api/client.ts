import {
  parseBackendProblem,
  parseRetryAfterSeconds,
} from "@/lib/api/problem";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
    public readonly traceId: string | null = null,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly conflictVersion: number | null = null,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get retryable() {
    return (
      this.status === 0 ||
      this.status === 408 ||
      this.status === 429 ||
      this.status >= 500
    );
  }
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { message: raw };
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  try {
    response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
      ...init,
      cache: "no-store",
      headers,
    });
  } catch {
    throw new ApiError(
      "Không thể kết nối máy chủ Pavex.",
      0,
      "management_bff_unavailable",
    );
  }

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("pavex-management:session-expired"));
  }

  const value = await readPayload(response);

  if (!response.ok) {
    const problem = parseBackendProblem(value);
    throw new ApiError(
      problem.message,
      response.status,
      problem.code,
      problem.traceId,
      problem.fieldErrors,
      problem.conflictVersion,
      parseRetryAfterSeconds(response.headers.get("retry-after")),
    );
  }

  return value as T;
}
