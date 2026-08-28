export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export async function apiRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401)
    window.dispatchEvent(new Event("pavex-admin:session-expired"));

  const raw = await response.text();
  let value: unknown = null;
  try {
    value = raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    value = { message: raw };
  }

  if (!response.ok) {
    const problem = asRecord(value);
    const message =
      typeof problem?.message === "string"
        ? problem.message
        : typeof problem?.detail === "string"
          ? problem.detail
          : "Yêu cầu backend thất bại.";
    throw new ApiError(message, response.status);
  }

  return value;
}
