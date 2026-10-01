export type ParsedBackendProblem = {
  message: string;
  code: string | null;
  traceId: string | null;
  fieldErrors: Record<string, string[]>;
  conflictVersion: number | null;
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(...values: unknown[]) {
  return values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
}

function parseFieldErrors(value: unknown): Record<string, string[]> {
  const record = asRecord(value);
  if (!record) return {};

  return Object.fromEntries(
    Object.entries(record).flatMap(([field, messages]) => {
      if (Array.isArray(messages)) {
        const normalized = messages
          .map((message) => String(message).trim())
          .filter(Boolean);
        return normalized.length ? [[field, normalized]] : [];
      }

      if (typeof messages === "string" && messages.trim()) {
        return [[field, [messages.trim()]]];
      }

      return [];
    }),
  );
}

export function parseBackendProblem(
  value: unknown,
  fallback = "Yêu cầu tới máy chủ thất bại.",
): ParsedBackendProblem {
  const root = asRecord(value);
  const nested = asRecord(root?.error);
  const problem = nested ?? root;

  return {
    message:
      firstString(
        problem?.message,
        problem?.detail,
        problem?.title,
        root?.message,
        root?.detail,
        root?.title,
      ) ?? fallback,
    code: firstString(problem?.code, root?.code) ?? null,
    traceId:
      firstString(
        problem?.traceId,
        problem?.trace_id,
        root?.traceId,
        root?.trace_id,
      ) ?? null,
    fieldErrors: parseFieldErrors(
      problem?.fieldErrors ??
        problem?.errors ??
        root?.fieldErrors ??
        root?.errors,
    ),
    conflictVersion:
      typeof problem?.conflictVersion === "number"
        ? problem.conflictVersion
        : typeof root?.conflictVersion === "number"
          ? root.conflictVersion
          : null,
  };
}

export function parseRetryAfterSeconds(value: string | null) {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}
