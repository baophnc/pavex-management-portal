import { apiRequest } from "@/lib/api/client";
import type {
  AssignWorkforceHubInput,
  CreateWorkforceMemberInput,
  OnboardWorkforceMemberInput,
  SetWorkforceCapacityInput,
  SetWorkforceStatusInput,
  WorkforceAudit,
  WorkforceMember,
  WorkforcePage,
} from "@/features/operations/contracts";

function jsonBody(value: unknown) {
  return JSON.stringify(value);
}

export function getWorkforce(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<WorkforcePage>(
    `admin/operations/workforce${query ? `?${query}` : ""}`,
  );
}

export function getWorkforceMember(id: string) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}`,
  );
}

export function createWorkforceMember(input: CreateWorkforceMemberInput) {
  return apiRequest<WorkforceMember>("admin/operations/workforce", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function onboardWorkforceMember(input: OnboardWorkforceMemberInput) {
  return apiRequest<WorkforceMember>("admin/operations/workforce/onboard", {
    method: "POST",
    body: jsonBody(input),
  });
}

export function setWorkforceStatus(id: string, input: SetWorkforceStatusInput) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: jsonBody(input) },
  );
}

export function setWorkforceCapacity(
  id: string,
  input: SetWorkforceCapacityInput,
) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/capacity`,
    { method: "PATCH", body: jsonBody(input) },
  );
}

export function assignWorkforceHub(id: string, input: AssignWorkforceHubInput) {
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/hubs`,
    { method: "POST", body: jsonBody(input) },
  );
}

export function unassignWorkforceHub(
  id: string,
  hubId: string,
  reason?: string,
) {
  const query = new URLSearchParams();
  if (reason?.trim()) query.set("reason", reason.trim());
  return apiRequest<WorkforceMember>(
    `admin/operations/workforce/${encodeURIComponent(id)}/hubs/${encodeURIComponent(hubId)}${query.size ? `?${query}` : ""}`,
    { method: "DELETE" },
  );
}

export function getWorkforceAudit(id: string) {
  return apiRequest<WorkforceAudit[]>(
    `admin/operations/workforce/${encodeURIComponent(id)}/audit`,
  );
}

export function getWorkShifts(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/operations/contracts").WorkShiftPage>(
    `admin/operations/shifts${query ? `?${query}` : ""}`,
  );
}

export function getWorkShift(id: string) {
  return apiRequest<import("@/features/operations/contracts").WorkShiftDetail>(
    `admin/operations/shifts/${encodeURIComponent(id)}`,
  );
}

export function createWorkShift(
  input: import("@/features/operations/contracts").CreateWorkShiftInput,
) {
  return apiRequest<import("@/features/operations/contracts").WorkShift>(
    "admin/operations/shifts",
    { method: "POST", body: jsonBody(input) },
  );
}

export function updateWorkShift(
  id: string,
  input: import("@/features/operations/contracts").UpdateWorkShiftInput,
) {
  return apiRequest<import("@/features/operations/contracts").WorkShift>(
    `admin/operations/shifts/${encodeURIComponent(id)}`,
    { method: "PUT", body: jsonBody(input) },
  );
}

export function cancelWorkShift(id: string, reason: string) {
  return apiRequest<import("@/features/operations/contracts").WorkShift>(
    `admin/operations/shifts/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: jsonBody({ reason }) },
  );
}

export function assignWorkShiftMember(id: string, workforceMemberId: string) {
  return apiRequest<import("@/features/operations/contracts").WorkforceShiftAssignment>(
    `admin/operations/shifts/${encodeURIComponent(id)}/members`,
    { method: "POST", body: jsonBody({ workforceMemberId }) },
  );
}

export function removeWorkShiftMember(id: string, memberId: string, reason?: string) {
  const query = new URLSearchParams();
  if (reason?.trim()) query.set("reason", reason.trim());
  return apiRequest<import("@/features/operations/contracts").WorkforceShiftAssignment>(
    `admin/operations/shifts/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}${query.size ? `?${query}` : ""}`,
    { method: "DELETE" },
  );
}

export function markWorkShiftMemberAbsent(id: string, memberId: string, note?: string) {
  return apiRequest<import("@/features/operations/contracts").WorkforceShiftAssignment>(
    `admin/operations/shifts/${encodeURIComponent(id)}/members/${encodeURIComponent(memberId)}/absent`,
    { method: "POST", body: jsonBody({ note: note?.trim() || null }) },
  );
}

export function getOperationalAssignments(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/operations/contracts").OperationalAssignment[]>(
    `admin/operations/assignments${query ? `?${query}` : ""}`,
  );
}

export function assignOperationalAssignment(id: string, workforceMemberId: string) {
  return apiRequest<import("@/features/operations/contracts").OperationalAssignment>(
    `admin/operations/assignments/${encodeURIComponent(id)}/assign`,
    { method: "POST", body: jsonBody({ workforceMemberId }) },
  );
}

export function cancelOperationalAssignment(id: string, reason: string) {
  return apiRequest<import("@/features/operations/contracts").OperationalAssignment>(
    `admin/operations/assignments/${encodeURIComponent(id)}/cancel`,
    { method: "POST", body: jsonBody({ reason }) },
  );
}

export function getOperationalAssignmentEvents(id: string, page = 1, pageSize = 100) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiRequest<import("@/features/operations/contracts").OperationalAssignmentEventPage>(
    `admin/operations/assignments/${encodeURIComponent(id)}/events?${query}`,
  );
}

export function getOperationsDispatchEvents(params: URLSearchParams) {
  const query = params.toString();
  return apiRequest<import("@/features/operations/contracts").OperationalAssignmentEventPage>(
    `admin/operations/dispatch-events${query ? `?${query}` : ""}`,
  );
}

export function getOperationsOutboxSummary() {
  return apiRequest<import("@/features/operations/contracts").OperationsOutboxSummary>(
    "admin/operations/outbox/summary",
  );
}

export function getOperationsDeadLetters(page = 1, pageSize = 50) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return apiRequest<import("@/features/operations/contracts").OperationsOutboxDeadLetterPage>(
    `admin/operations/outbox/dead-letters?${query}`,
  );
}

export function getOperationsDeadLetter(id: string) {
  return apiRequest<import("@/features/operations/contracts").OperationsOutboxDeadLetter>(
    `admin/operations/outbox/dead-letters/${encodeURIComponent(id)}`,
  );
}

export function retryOperationsDeadLetter(id: string) {
  return apiRequest<null>(
    `admin/operations/outbox/dead-letters/${encodeURIComponent(id)}/retry`,
    { method: "POST" },
  );
}

export function discardOperationsDeadLetter(id: string, reason: string) {
  return apiRequest<null>(
    `admin/operations/outbox/dead-letters/${encodeURIComponent(id)}/discard`,
    { method: "POST", body: jsonBody({ reason }) },
  );
}
