export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null = null,
    public readonly traceId: string | null = null,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly conflictVersion: number | null = null,
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

function parseFieldErrors(value: unknown) {
  const record = asRecord(value);
  if (!record) return {};

  return Object.fromEntries(
    Object.entries(record).flatMap(([field, messages]) => {
      if (Array.isArray(messages)) return [[field, messages.map(String)]];
      if (typeof messages === "string") return [[field, [messages]]];
      return [];
    }),
  );
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

  if (response.status === 401) {
    window.dispatchEvent(new Event("pavex-management:session-expired"));
  }

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
          : typeof problem?.title === "string"
            ? problem.title
            : "Yêu cầu backend thất bại.";
    const code = typeof problem?.code === "string" ? problem.code : null;
    const traceId = typeof problem?.traceId === "string" ? problem.traceId : null;
    const conflictVersion =
      typeof problem?.conflictVersion === "number"
        ? problem.conflictVersion
        : null;
    const fieldErrors = parseFieldErrors(problem?.fieldErrors ?? problem?.errors);

    throw new ApiError(
      message,
      response.status,
      code,
      traceId,
      fieldErrors,
      conflictVersion,
    );
  }

  return value;
}
